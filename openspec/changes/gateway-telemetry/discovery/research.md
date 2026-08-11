# Discovery brief: gateway-telemetry (standard tier)

## 1. The load-bearing finding: most of the log row already exists in the engine

`packages/engine/src/provider/provider-observability.ts` already runs a per-request observability ring buffer. `ProviderObservation` carries `provider`, `model`, `accountId`, `dialect`, `method`, `startedAt`, `durationMs`, `ttftMs`, `status`, `usage` (input, output, total, cache read, cache write, reasoning tokens) and `generate`. `ProviderObservability` exposes `subscribe(listener)`, `snapshot()`, `popOldest(count)` and `clear()`, keeps at most 10,000 records by default, and is reached through a module-level singleton via `providerObservability()`.

That covers seven of the nine log-row fields the spec names. The two it does not carry are the **virtual model asked for** and the **cost**.

Four concrete hazards follow from that file, each verifiable in it:

- **The singleton is already drained destructively.** `packages/engine/src/management-usage.ts` registers `GET /v0/management/usage-queue`, which calls `providerObservability().popOldest(count)`. `popOldest` uses `records.splice`, so any second consumer that also pops will steal rows from the drawer, and the drawer will steal rows from the management endpoint. The telemetry feed must attach through `subscribe()`, which is non-destructive, and must not call `popOldest` or `clear`.
- **`startedAt` is not a wall clock.** `ProviderObservability.now()` falls back to `performance.now()`, so `startedAt` and `durationMs` are monotonic readings relative to process start. The spec's "request time" column needs a wall-clock instant, so the row needs a `Date.now()` stamp added at publish time or a monotonic-to-wall offset captured once.
- **Units differ from the existing traffic contract.** `packages/engine/src/gateway-traffic.ts` stamps `RequestOutcome.at` with `Date.now()` by default, while observations use `performance.now()`. Any join between the two must not assume a shared time base.
- **Privacy discipline is already written down.** The docstring on `requestOutcomeSchema` in `packages/contracts/src/engine-traffic.ts` states that a failure carries a sentence written from the status alone "so no prompt and no provider answer can ride along." `provider-observability.ts` reinforces this by hashing request identifiers with SHA-256 rather than storing them. The log drawer must inherit that rule: no prompt or completion bodies in a row.

## 2. The central design decision: where the virtual model joins the observation

`packages/engine/src/gateway-traffic.ts` shows where the virtual model is known. `watchingTraffic` wraps a serving turn, and the spend grant (`SpendGrantFor`, from `gateway-proxy`) is described in its docstring as "the one place every serving path names its gateway and its virtual model," handed out fresh per turn so concurrent requests cannot take each other's note. The provider observation, meanwhile, is started deep in the provider call and knows nothing of the gateway.

Two options:

- **(a) Thread gateway slug and virtual model into `ProviderRequestLog`.** That type already carries optional fields (`accountId`, `requestId`, `generate`, `version`, `media`), so extending it is idiomatic. One observation then carries the whole row and no correlation state is needed.
- **(b) Correlate after the fact** by matching a grant to an observation. This reintroduces the ordering problem that the per-turn grant was designed to avoid, and it is fragile when a turn retries across targets.

Recommend (a). It also makes the canvas-selection scoping in the spec (gateway, virtual model, target) a pure filter over one row shape rather than a join.

## 3. Metric definitions: bind them in the spec, because "p95" and "rpm" are not self-defining

Industry practice, per the OpenTelemetry GenAI semantic conventions (status **Development**, not stable, so treat the strings as advisory rather than a contract):

- `gen_ai.client.operation.duration` (histogram, seconds) with explicit bucket boundaries `[0.01, 0.02, 0.04, 0.08, 0.16, 0.32, 0.64, 1.28, 2.56, 5.12, 10.24, 20.48, 40.96, 81.92]`.
- `gen_ai.client.token.usage` (histogram, `{token}`), split by `gen_ai.token.type` for input against output.
- `gen_ai.client.operation.time_to_first_chunk`, which maps onto the `ttftMs` the repository already records.

On p95 computation, the evidence favors the simple path for this case. t-digest and similar sketches earn their keep on unbounded streams and cross-host merges; over a bounded local window of a few hundred to a few thousand samples a ring buffer with an exact selection is exact, cheaper in code, and free in memory. The real accuracy risk at small N is statistical noise, not the data structure, so the window length matters more than the algorithm. Since the engine already holds up to 10,000 observations in memory, exact selection over a time-bounded slice is the right call.

Concrete definitions worth writing into the spec so the acceptance criteria are testable: requests per minute and tokens per minute as counts over a rolling 60-second window; p95 over the same rolling window (or the last N requests, stated explicitly); error count as observations with `status >= 400` over that window; and an explicit statement that an empty window reads `0` rather than blank, which the spec's idle-zeros scenario already implies.

## 4. Cost is the weakest part of the spec and needs a maintainer decision

Two problems.

**No price table exists in the repository, most likely.** A grep across `packages/**/*.ts` for exported names containing `usage`, `cost`, `tokens` or `TokenCount` returned 27 results, all of them dialect or usage-extraction modules, with no per-token price map. That pattern would miss a name like `priceOf`, so treat this as probable rather than proven.

The de facto industry source is LiteLLM's `model_prices_and_context_window.json`, which carries `input_cost_per_token`, `output_cost_per_token`, `output_cost_per_reasoning_token` and cache-tier pricing per model. Vendoring it means taking on a refresh obligation and a license check; hand-curating a table means drift.

**Subscription targets have no per-token price at all.** recompose serves subscription accounts (`openspec/specs/subscriptions/spec.md`). Anthropic's own documentation is explicit on this: for Max and Pro subscribers "usage is included in their subscription, so the session cost figure isn't relevant for billing purposes," and where a figure is shown, "Claude Code computes the dollar figure locally from token counts priced at standard list rates, so it doesn't reflect promotional pricing or contracted discounts and may differ from your actual bill." A footer that shows a dollar figure for a subscription-backed target is showing an API-equivalent estimate, not a cost. The spec should either say so in the label or scope the cost cell to metered targets.

## 5. Transport: follow the traffic ledger's precedent, but not its shape

`apps/desktop/src/main/engine-host/traffic-ledger.ts` sets the house pattern. `TRAFFIC_PUSH_MS = 16` coalesces child reports into at most one window message per painted frame, and its docstring gives the reasoning: a busy gateway would otherwise repaint the canvas as fast as it serves. `apps/desktop/src/main/ipc/push-events.ts` fans messages out with `webContents.send` on named channels such as `engine:traffic`.

Reuse the 16 ms coalescing cadence. Do not reuse the snapshot shape. The traffic ledger pushes a whole `GatewayTraffic` map because it holds only the latest outcome per virtual model, which the contract docstring calls out as deliberate ("one entry per virtual model rather than a history"). A log stream of up to 10,000 rows cannot be re-sent whole each frame, so it wants a bounded batched append plus an initial backfill on drawer open. Electron's official IPC tutorial gives no throughput or frequency guidance for `webContents.send` and mentions MessagePorts only for renderer-to-renderer traffic, so the batching decision is ours to make and to record in an ADR.

## 6. Drawer and log list: the applicable standards

- **There is no "drawer" pattern in the ARIA Authoring Practices Guide.** The choice is between a modal dialog (Escape closes, focus trapped, focus restored, background inert), a non-modal dialog (contained tab sequence but a way to move focus back out, and `aria-modal` omitted or `false`), and a disclosure (button with `aria-expanded`, no focus trap, no Escape requirement). The spec says the drawer opens over the lower canvas and that the canvas selection continues to scope it, which means the canvas stays live. That points to **disclosure or non-modal dialog, not modal**. The APG also recommends that any dialog's tab sequence include a visible close button, which satisfies the spec's "keyboard-reachable close affordance."
- **WCAG 2.2 success criterion 2.4.11 (Focus Not Obscured)** applies directly, because the drawer overlays canvas content that can receive focus.
- **Live-region role.** `role="log"` is the fit for an append-only ordered stream and carries an implicit `aria-live="polite"`, and it requires an accessible name. It conflicts with virtualization, since removing off-screen nodes breaks the insertion announcements, so the common resolution is a virtualized list paired with a separate visually hidden live region.
- **TanStack Virtual has first-class support for this exact list shape.** Its chat guide documents `anchorTo: 'end'` for prepend stability and end pinning, `followOnAppend` which follows only when the viewport was already within `scrollEndThreshold` of the end, `isAtEnd()` for a "jump to latest" affordance, and a warning that `getItemKey` must return a stable identifier rather than an index. The page carries no version or publication date, which is a small confidence caveat.
- The spec's "newest first" wording and TanStack's end-anchored model point in opposite directions on visual ordering. Decide once whether newest is at the top with prepends or at the bottom with appends, because the virtualizer configuration differs.

## 7. Gaps and unverified points

- **"Client count" is undefined.** Nothing in what I read says what a client is: a distinct API key, a distinct connection, or a distinct user agent. `openspec/specs/api-keys/spec.md` is the place to resolve it. This needs a maintainer answer before the metric can be tested.
- I hit the fifteen-read budget, so I did **not** open `packages/engine/src/gateway-proxy.ts` (the exact `SpendGrantFor` signature), `packages/engine/src/provider/provider-log-runtime.ts`, `packages/contracts/src/ipc.ts`, `docs/adr/` (a prior correlation ADR may already bind this design), or `package.json` (whether `@tanstack/react-virtual` is already a dependency is unconfirmed).
- The OpenTelemetry GenAI conventions are marked Development and moved to a separate repository in 2026, so pin any adopted attribute names behind a thin mapping layer rather than treating them as a frozen contract.
- Vendor comparison material on gateway log tables came largely from marketing and comparison blogs rather than primary documentation. Treat the column list as corroboration of the spec's own field list, not as an authority.

## 8. Recommendation

Extend `ProviderRequestLog` with the gateway slug and virtual model so a single `ProviderObservation` is the whole log row, add a wall-clock stamp at publish time, and feed the renderer through a new non-destructive `subscribe()` consumer that coalesces on the existing 16 ms cadence with a bounded append batch plus a backfill on open. Compute the footer aggregates in the renderer from the same rows over an explicitly stated rolling window, using exact selection for p95. Render the drawer as a non-modal disclosure with a visible keyboard-reachable close control and a hidden polite live region beside the virtualized list. Before implementation starts, get maintainer answers on the definition of a client, the meaning of the cost cell for subscription-backed targets, and the source of the price table.

Sources:

- [OpenTelemetry GenAI metrics semantic conventions](https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-metrics.md) (status: Development)
- [Inside the LLM Call: GenAI Observability with OpenTelemetry](https://opentelemetry.io/blog/2026/genai-observability/)
- [LiteLLM model_prices_and_context_window.json](https://github.com/BerriAI/litellm/blob/main/model_prices_and_context_window.json)
- [LiteLLM custom pricing docs](https://docs.litellm.ai/docs/proxy/custom_pricing)
- [Claude Code: Manage costs effectively](https://code.claude.com/docs/en/costs)
- [ClickHouse: Percentiles vs averages](https://clickhouse.com/resources/engineering/percentiles-vs-averages)
- [Dunning and Ertl, Computing Extremely Accurate Quantiles Using t-Digests](https://arxiv.org/pdf/1902.04023)
- [W3C APG Dialog (Modal) Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [W3C APG Disclosure Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/)
- [W3C Understanding SC 2.4.11 Focus Not Obscured (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum)
- [MDN: ARIA log role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/log_role)
- [MDN: ARIA feed role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/feed_role)
- [TanStack Virtual: Chat guide](https://tanstack.com/virtual/latest/docs/chat) (no version or date shown)
- [TanStack Virtual: Virtualizer API](https://tanstack.com/virtual/latest/docs/api/virtualizer)
- [Electron: Inter-Process Communication tutorial](https://www.electronjs.org/docs/latest/tutorial/ipc)

Repository references (relative to repository root): `openspec/changes/gateway-telemetry/manifest.md`, `openspec/changes/gateway-telemetry/specs/gateway-telemetry/spec.md`, `packages/engine/src/provider/provider-observability.ts`, `packages/engine/src/management-usage.ts`, `packages/engine/src/gateway-traffic.ts`, `packages/contracts/src/engine-traffic.ts`, `apps/desktop/src/main/engine-host/traffic-ledger.ts`, `apps/desktop/src/main/ipc/push-events.ts`, `apps/desktop/src/renderer/src/pages/gateway-canvas/`, `openspec/specs/subscriptions/spec.md`, `openspec/specs/api-keys/spec.md`.
