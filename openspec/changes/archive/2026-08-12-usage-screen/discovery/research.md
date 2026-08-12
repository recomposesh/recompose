# Discovery brief: usage-screen (tier standard)

## The gap I have to name first

`openspec/changes/usage-screen/manifest.md` carries front matter only (tier, phase, approvals, branch) and no proposal body, and `openspec/changes/usage-screen/.openspec.yaml` holds just `schema` and `created`. Nothing in the change folder says what the usage screen should show, over what time range, or for whom. Everything below is derived from the shipped code, the living specs, and outside prior art. Treat the scope section as a proposal to confirm, not a finding.

## Repository state: the screen already exists as a promise

- The route is live: `apps/desktop/src/renderer/src/app/routes/usage.tsx` mounts `UsagePage` with `PageError` as its error component.
- The sidebar already navigates to it with a `gauge` icon and the label `Usage` (`apps/desktop/src/renderer/src/app/routes/-app-sidebar.tsx`, around lines 43 to 54).
- The page is an empty state that names four readings it will collect: `apps/desktop/src/renderer/src/pages/usage/ui/usage-page/usage-page.tsx` says "Once a gateway serves its first request, its rate, latency, tokens, and spend collect here." That sentence is the closest thing to a written requirement that exists, and one of its four nouns (`spend`) is currently forbidden elsewhere. See the conflicts section.
- Existing siblings: `usage-page.browser.test.tsx` and `usage-page.stories.tsx` in the same folder, so the stories guard and the browser suite already cover the slice.

## The blocking constraint: nothing persists request history

This is the finding that shapes the whole feature.

- The engine's observation buffer is a bounded in-memory ring: `packages/engine/src/provider/provider-observability.ts` trims to `this.options.maxRecords ?? 10_000` (line 79) and exposes `popOldest(count)` (line 57).
- That buffer is drained **destructively** by the management HTTP surface: `packages/engine/src/management-usage.ts` serves `GET /v0/management/usage-queue` as `providerObservability().popOldest(count).map(usageRecord)`. Anything that reads through this queue removes rows from under every other reader.
- The renderer-facing feed deliberately avoids that drain. `packages/engine/src/gateway-traffic.ts` documents `subscribeToLogRows` as handing "every row one gateway writes to a reader, without taking a single one out of the buffer" precisely because "Management drains the observation buffer destructively through its usage queue."
- Rows cross IPC as `logBatch` on the `engine:logs` event, with `engine:replay-logs` to re-request the backfill (`packages/contracts/src/ipc.ts`, lines 139 to 143 and 182). The docstring states the retained history is 10,000 rows delivered in chunks.
- `apps/desktop/package.json` lists no database dependency. Main-process persistence today is JSON files: `apps/desktop/src/main/storage/json-file.ts`, `settings-store.ts`, `vault.ts` (ADR-0016 `docs/adr/0016-storage-architecture.md` is the governing record).

Consequence: today a usage screen can only show the current process's last 10,000 rows, and only those the management queue has not already eaten. A screen that answers "what did I spend last week" needs a new persisted store, which is a new ADR and probably a new dependency.

## Three spec conflicts to settle before any scenario gets written

1. **Cost is currently banned outright.** `openspec/specs/gateway-telemetry/spec.md` states in its Purpose (line 5) that "no cost figure appears anywhere" and in its first requirement (line 11) that "The footer MUST NOT show a cost figure." The usage page's own copy promises spend. Either the telemetry ban narrows to the footer and drawer, or the usage screen drops spend. A proposal cannot leave both standing.
2. **The aggregators spec explicitly waits on this screen.** `openspec/specs/aggregators/spec.md` line 21: "The credential-scoped endpoint returns spend data this surface has nowhere to put yet, so the check waits for the surface that can hold its answer." That reads as a standing invitation for the usage screen to become the home for aggregator spend and balance. Worth confirming that reading with the maintainer rather than assuming it.
3. **The log retention setting is parked on exactly this machinery.** `openspec/specs/settings/spec.md` lines 131 to 135: at the log retention row "the control renders as unavailable and names request logging as what it waits for" and "the settings document holds no field for it." If this feature persists rows, the retention control must land in the same change or the settings spec goes stale, because the settings spec forbids a control for a setting nothing reads (line 123).

## A fourth, quieter contract problem

The engine already parses a six-field token breakdown per dialect: `packages/engine/src/provider/provider-usage.ts` returns `inputTokens`, `outputTokens`, `totalTokens`, `cacheReadTokens`, `cacheWriteTokens`, `reasoningTokens`, with dialect-specific readers for OpenAI, Anthropic, Gemini, and the interactions dialect. The management usage record keeps all six (`packages/engine/src/management-usage.ts`).

The row that reaches the renderer keeps one number. `logRowSchema` in `packages/contracts/src/engine-logs.ts` carries a single optional `tokens` integer (line 42). So a usage screen showing an input/output split, a cache-hit rate, or reasoning-token share needs `logRowSchema` widened, or needs a separate aggregate contract. This matters because cache-hit rate is one of the metrics every vendor dashboard surfaces (see below), and the data is already computed and then thrown away at the IPC boundary.

## Feature-Sliced Design placement is a real constraint here

Every log-shaped component lives inside one page slice: `apps/desktop/src/renderer/src/pages/gateway-canvas/ui/log-list/`, `.../log-row/` (including `logged-request.ts` and `arriving-requests.ts`), and `.../logs-drawer/`. The renderer has exactly one entity slice today (`apps/desktop/src/renderer/src/entities/account/index.ts`) and no `features/` slices.

FSD forbids a page importing from another page: "One page cannot import code from another page," because "A module (file) in a slice can only import other slices when they are located on layers strictly below" ([FSD tutorial](https://feature-sliced.design/docs/get-started/tutorial), [Layers reference](https://feature-sliced.design/docs/reference/layers)). The official linter enforces this as `no-cross-imports` ([Steiger forbidden-imports](https://github.com/feature-sliced/steiger/blob/master/packages/steiger-plugin-fsd/src/forbidden-imports/README.md)).

So any row shaping, status formatting, or duration formatting the usage screen wants to share with the logs drawer has to move down to `entities/` or `shared/` first. Plan that as a preparatory refactor, not as usage-screen code, and expect it to touch the drawer's existing browser tests only if behavior changes (per `.claude/rules/tdd-bdd.md`).

## Industry standard shape for a usage surface

Two first-party vendor APIs converge on the same model, which gives defensible acceptance criteria rather than invented ones.

**Anthropic Usage and Cost API** ([platform.claude.com/docs/en/manage-claude/usage-cost-api](https://platform.claude.com/docs/en/manage-claude/usage-cost-api), no publication date printed; content current to at least February 2026 since it documents the `fast-mode-2026-02-01` beta):

- Usage endpoint `/v1/organizations/usage_report/messages`, cost endpoint `/v1/organizations/cost_report`.
- Bucket widths `1m`, `1h`, `1d`. The published granularity ladder is the most directly reusable artifact: `1m` defaults to 60 buckets and caps at 1,440; `1h` defaults to 24 and caps at 168; `1d` defaults to 7 and caps at 31. Their stated use cases are "real-time monitoring", "daily patterns", and "weekly/monthly reports".
- Token tracking is split four ways: uncached input, cached input, cache creation, and output.
- `group_by` dimensions: model, workspace, api_key, service_tier, context_window, `inference_geo`, and `speed` (beta).
- Cost is **daily granularity only**, USD, "reported as decimal strings in lowest units (cents)".
- Pagination is `has_more` plus a `next_page` cursor. Data freshness is roughly five minutes, recommended polling once per minute.

**OpenAI Usage API** ([API reference](https://developers.openai.com/api/reference/resources/admin/subresources/organization/subresources/usage/methods/completions), [cookbook](https://developers.openai.com/cookbook/examples/completions_usage_api)): `GET /v1/organization/usage/completions`, `bucket_width` of `1m`, `1h`, `1d` defaulting to `1d`, `group_by` over `project_id`, `user_id`, `api_key_id`, `model`, `batch`, `service_tier`, and per-bucket fields `input_tokens`, `output_tokens`, `input_cached_tokens`, and `num_model_requests`.

The shared skeleton, which I would lift as the acceptance criteria for recompose's screen:

1. Three bucket widths (minute, hour, day) rather than a free-form range picker.
2. A hard cap on buckets per width, so the chart never has to render an unbounded series.
3. Cached input tokens broken out from uncached input, never folded into one number.
4. A request count sitting beside the token count, because tokens alone hide traffic shape.
5. A model dimension as the primary grouping, with the credential (recompose's account) as the secondary one. This maps cleanly onto the house domain hierarchy of virtual model, real model, provider kind, account name.
6. Cost, if it appears at all, at daily granularity only. Anthropic ships minute-level tokens and refuses minute-level cost, which is a strong signal that a live cost ticker is the wrong surface.

**OpenRouter** as the aggregator case: usage accounting returns token counts and cost inline on every response with no extra parameter, and the deprecated `usage: { include: true }` and `stream_options: { include_usage: true }` switches now have no effect ([usage accounting docs](https://openrouter.ai/docs/cookbook/administration/usage-accounting)). Account balance comes from `GET /api/v1/credits` as `total_credits` and `total_usage`, with a management key, and the values are cached and can be up to about 60 seconds stale ([credits endpoint](https://openrouter.ai/docs/api/api-reference/credits/get-remaining-credits)). If the usage screen becomes the home the aggregators spec is waiting for, that 60-second staleness is an acceptance criterion: the balance must be labelled as an account balance read at a moment, not as a live counter.

## Chart library: what I would pick and why

The repository has **no chart dependency** (`apps/desktop/package.json` dependencies are `@electron-toolkit/utils`, `@lobehub/icons`, TanStack Form, Router, Virtual, `@xyflow/react`, `electron-liquid-glass`, `electron-window-state`, `koffi`, `node-wreq`). The only chart-shaped thing on disk is hand-rolled SVG in `apps/desktop/src/renderer/src/pages/home/ui/ghost-graph/ghost-graph.tsx`.

The governing precedent is ADR-0086 (`docs/adr/0086-the-log-list-adopts-tanstack-react-virtual.md`), which adopted `@tanstack/react-virtual` and rejected `react-window` "because it ships its own components rather than headless hooks," on the stated principle that "the design system owns every painted pixel, so the engine must be headless."

- **Recharts 3.10.x**: MIT, and React 19 is in its peer range (`react ^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0`). But it ships styled components and paints its own SVG, which is exactly what ADR-0086 rejected. There is also an open, unreproduced report of charts rendering blank after upgrading to React 19.2.3 with Recharts 3.6.0 ([recharts#6857](https://github.com/recharts/recharts/issues/6857)); the repo pins `react 19.2.8`, so that report sits uncomfortably close. Treat it as an unconfirmed risk, not a defect. Recharts 3.0 also rewrote internal state and removed props from public types, which broke shadcn's chart wrapper ([3.0 migration guide](https://github.com/recharts/recharts/wiki/3.0-migration-guide), [shadcn-ui#9892](https://github.com/shadcn-ui/ui/issues/9892)).
- **TanStack family**: the family argument that carried ADR-0086 does not carry here. `@tanstack/react-charts` was archived read-only on 13 May 2026 and is explicitly unmaintained ([issue #352 thread and repo notice](https://github.com/TanStack/react-charts)). Its successor `@tanstack/charts` is at 0.11.0 and self-describes as pre-alpha and not production ready ([TanStack Charts docs](https://tanstack.com/charts/latest/docs/overview)). Rule it out on maturity.
- **visx v4**: modular MIT packages, unstyled by design, D3 math with React owning the DOM. v4.0.0 shipped on 11 June 2026 and added `react@19` to the peer dependencies of all packages, with React 18 or 19 now required as a breaking change ([visx releases](https://github.com/airbnb/visx/releases), [visx#1883](https://github.com/airbnb/visx/issues/1883)). This is the closest match to ADR-0086's reasoning: you write the SVG, the design system keeps every token. Cost is verbosity and a steeper curve, plus each `@visx/*` package entering the license sweep.

**Recommendation**: for the first cut, hand-rolled SVG with scale math only, either `@visx/scale` (one small MIT package) or `d3-scale` directly. Daily and hourly bucket bars over a bounded bucket count need a linear scale, a band scale, and a path, which is a small amount of code the repository already demonstrates in `ghost-graph.tsx`. That satisfies KISS and YAGNI, keeps the license sweep to one addition, and keeps every painted pixel in the design system. Reach for further visx primitives (`@visx/axis`, `@visx/tooltip`, `@visx/brush`) only when brushing or hover tooltips actually enter the requirements, and write an ADR at that point. Do not adopt Recharts: it loses on the ADR-0086 principle before the React 19 report is even weighed.

## Accessibility acceptance criteria for the chart

These are testable and follow directly from the specification text rather than from blog advice.

- WCAG 2.1 SC 1.4.11 Non-text Contrast requires 3:1 against adjacent colors for "parts of graphics required to understand the content," and the Understanding document names lines in a line graph and slices in a pie chart as the canonical case ([W3C Understanding 1.4.11](https://w3c.github.io/wcag21/understanding/non-text-contrast.html), WCAG 2.1 published 2018, criterion carried forward into 2.2).
- The same document grants an exception when "the information is available in another form," for example when text with sufficient contrast provides the values in the chart. That is the cheapest route to conformance here: print the numbers.
- Note the trap: a pie chart with per-slice labels can pass 1.4.1 Use of Color and still fail 1.4.11 if slice edges must be discerned to read the proportions. Prefer bars or lines with printed values over anything requiring edge discrimination.
- Concrete criteria I would write into the change: every series carries a text label or a data-table twin so no reading depends on colour alone; the chart root is `role="img"` with `aria-labelledby`; contrast is measured separately in both schemes, since a series that clears 3:1 on white can fail on the dark surface.
- House rules that bind regardless: dual-scheme inspection through `claude-in-chrome` before the branch lands (root `CLAUDE.md`), reduced motion in tests and snapshots (ADR-0079 `docs/adr/0079-tests-and-snapshots-run-with-reduced-motion.md`), and a `*.stories.tsx` sibling for every new `ui/` component.

## If spend lands, the pricing problem is not solved by a table lookup

- A community-maintained pricing source exists: models.dev publishes `https://models.dev/api.json`, `models.json`, and `catalog.json`, with cost per million tokens for input, output, cache read, and cache write, backed by TOML files in the open ([models.dev](https://models.dev/), [repository](https://github.com/anomalyco/models.dev)). One reviewer's caveat is worth carrying: the data is "useful for narrowing options, not enough for final routing logic," so it is a display aid, not a billing record.
- The harder problem is structural, and I think it is the reason the telemetry spec banned cost. recompose serves subscription accounts alongside API keys (`openspec/specs/subscriptions/spec.md`, and the engine carries `packages/engine/src/subscription/antigravity-credits.ts`). A per-token price is meaningless for a subscription seat, so a single spend column would print a fabricated number for a large share of traffic. Any spend design has to say explicitly what it shows for subscription-served requests, and "nothing" is a legitimate answer.
- Prior art for the subscription side is quota, not money. Claude Code's `/usage` reports remaining capacity in the current five-hour window plus a weekly limit per model, with an explicit reset time. Evidence here is thin and second-hand: I found no first-party Anthropic endpoint documented for reading those numbers, community reports disagree about the weekly window's actual length, and `openspec/specs/` contains no `credit`, `quota`, or `limit reset` language at all today. Do not build a quota panel on this evidence without a maintainer decision and a first-party source.

## Suggested scope for the proposal, in the order the constraints force

1. Decide the retention question first, because it decides everything else. In-memory only means the screen is honestly a session screen and the settings retention row stays parked. Persisted means a new store, a new ADR against ADR-0016, and the retention setting landing in the same change.
2. Resolve the cost conflict in `openspec/specs/gateway-telemetry/spec.md` explicitly, in the delta, rather than silently contradicting it.
3. Widen `logRowSchema` or add an aggregate contract so the cache and reasoning token split the engine already computes survives the IPC boundary.
4. Move shared row and formatting code out of `pages/gateway-canvas/` down to `entities/` or `shared/` before the usage page needs it.
5. Adopt the three-bucket-width ladder with capped bucket counts, tokens split by cached and uncached, and a request count beside tokens.
6. Charts as hand-rolled SVG plus a scale package, with printed values doubling as the accessibility escape hatch.

## Where the evidence is thin

- The change manifest is empty, so the intended scope is unverified. Everything in the scope section is inference.
- Version and issue details for Recharts and visx came from search summaries of npm and GitHub rather than a direct fetch of a versioned changelog page, so treat the exact version numbers as needing a `pnpm view` confirmation before they enter an ADR.
- The Recharts React 19 blank-render report is labelled as needing a reproduction. It is a risk signal, not a confirmed defect.
- Neither vendor documents how long they retain raw request rows before rolling up, so their granularity ladder is prior art for bucket choice but not for a retention default.
- Subscription quota display has no first-party API source I could find, and community reports conflict on the weekly reset window.
- I did not open the footer aggregation component or the `engine:traffic` contract, so I cannot say how much of the minute-window aggregation logic is reusable for a longer-window screen. That is the one unread file group most likely to change the effort estimate.

Sources:

- [Anthropic Usage and Cost API](https://platform.claude.com/docs/en/manage-claude/usage-cost-api)
- [OpenAI organization usage completions reference](https://developers.openai.com/api/reference/resources/admin/subresources/organization/subresources/usage/methods/completions)
- [OpenAI usage and cost cookbook](https://developers.openai.com/cookbook/examples/completions_usage_api)
- [OpenRouter usage accounting](https://openrouter.ai/docs/cookbook/administration/usage-accounting)
- [OpenRouter get remaining credits](https://openrouter.ai/docs/api/api-reference/credits/get-remaining-credits)
- [OpenRouter analytics cost control cookbook](https://openrouter.ai/docs/cookbook/administration/analytics-cost-control)
- [W3C Understanding SC 1.4.11 Non-text Contrast](https://w3c.github.io/wcag21/understanding/non-text-contrast.html)
- [Deque University 1.4.11 Non-text Contrast](https://dequeuniversity.com/resources/wcag2.1/1.4.11-non-text-contrast)
- [FSD Layers reference](https://feature-sliced.design/docs/reference/layers)
- [FSD tutorial](https://feature-sliced.design/docs/get-started/tutorial)
- [Steiger forbidden-imports rule](https://github.com/feature-sliced/steiger/blob/master/packages/steiger-plugin-fsd/src/forbidden-imports/README.md)
- [recharts npm package](https://www.npmjs.com/package/recharts)
- [recharts 3.0 migration guide](https://github.com/recharts/recharts/wiki/3.0-migration-guide)
- [recharts issue 6857, React 19.2.3 blank render](https://github.com/recharts/recharts/issues/6857)
- [shadcn-ui issue 9892, Recharts 3 incompatibility](https://github.com/shadcn-ui/ui/issues/9892)
- [TanStack react-charts repository, archived](https://github.com/TanStack/react-charts)
- [TanStack Charts overview, pre-alpha](https://tanstack.com/charts/latest/docs/overview)
- [visx releases](https://github.com/airbnb/visx/releases)
- [visx issue 1883, React 19 support](https://github.com/airbnb/visx/issues/1883)
- [@visx/scale npm](https://www.npmjs.com/package/@visx/scale)
- [models.dev](https://models.dev/)
- [models.dev repository](https://github.com/anomalyco/models.dev)
- [Claude Code usage limits overview](https://www.truefoundry.com/blog/claude-code-limits-explained)

Repository references (all paths relative to the repository root): `openspec/changes/usage-screen/manifest.md`, `openspec/changes/usage-screen/.openspec.yaml`, `openspec/specs/gateway-telemetry/spec.md`, `openspec/specs/settings/spec.md`, `openspec/specs/aggregators/spec.md`, `apps/desktop/src/renderer/src/app/routes/usage.tsx`, `apps/desktop/src/renderer/src/app/routes/-app-sidebar.tsx`, `apps/desktop/src/renderer/src/pages/usage/ui/usage-page/usage-page.tsx`, `apps/desktop/src/renderer/src/pages/home/ui/ghost-graph/ghost-graph.tsx`, `apps/desktop/src/renderer/src/pages/gateway-canvas/ui/log-list/`, `apps/desktop/src/renderer/src/pages/gateway-canvas/ui/log-row/`, `apps/desktop/src/renderer/src/pages/gateway-canvas/ui/logs-drawer/`, `apps/desktop/src/renderer/src/entities/account/index.ts`, `packages/contracts/src/engine-logs.ts`, `packages/contracts/src/ipc.ts`, `packages/engine/src/provider/provider-usage.ts`, `packages/engine/src/provider/provider-observability.ts`, `packages/engine/src/management-usage.ts`, `packages/engine/src/gateway-traffic.ts`, `packages/engine/src/subscription/antigravity-credits.ts`, `apps/desktop/src/main/storage/json-file.ts`, `apps/desktop/package.json`, `docs/adr/0016-storage-architecture.md`, `docs/adr/0079-tests-and-snapshots-run-with-reduced-motion.md`, `docs/adr/0086-the-log-list-adopts-tanstack-react-virtual.md`.
