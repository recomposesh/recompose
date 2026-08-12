# Approach A: the minimal path

The laziest end-to-end design that honestly satisfies all twelve locked decisions. The guiding rule: every locked WHAT lands, and every component that could be deferred is deferred. The pitch in numbers:

- **2** new IPC channels (`usage:report`, `usage:balances`), **0** new push events, **0** new engine-to-main protocol message kinds.
- **1** widened contract field (an optional `tokenSplit` on `logRowSchema`), **1** new contracts module (`packages/contracts/src/usage.ts`), **1** settings field with one migration step.
- **1** new runtime dependency (`d3-scale`), plus one committed asset (the vendored LiteLLM price map).
- **1** persisted bucket granularity (hour). Day is a fold, minute is an in-memory ring.
- **4** new main-process modules, **0** renderer push-binding changes: the page polls through TanStack Query.

## 1. Usage ledger

### Where accrual hooks in

Rows already cross the engine-to-main boundary as `engineLogReportSchema` messages (`packages/contracts/src/engine-protocol.ts`, line 164), heard today by `openLogsDesk` in `apps/desktop/src/main/engine-host/logs-ledger.ts` via the dispatch at `apps/desktop/src/main/engine-host/engine-host.ts` line 96 (`resident.traffic.hears(message) || resident.logs.hears(message)`). The ledger is a sibling desk, `apps/desktop/src/main/engine-host/usage-ledger.ts`, exporting `openUsageLedger` with the same desk shape (`hears`, `interrupt`, `forget`). Its `hears` parses the same `engineLogReportSchema` and must be evaluated before the existing short-circuit chain (or the chain composed so a heard log report still reaches it), because `||` would starve it. `engine-host.ts` also forwards `interrupt(slug)` at the two places it already calls `resident.logs.interrupt` (lines 77-78 and 135-136). No new engine protocol: the engine child does not change what it says, only what a row carries (section 2).

### Two-phase dedupe

`logs-ledger.ts` documents that one request reports twice: once when the status is known, again when the body is measured. The ledger accrues:

- gateway-origin rows immediately (they publish exactly once, see `raisedRow` in `packages/engine/src/gateway-traffic.ts`),
- provider-origin rows only when `durationMs !== undefined` (the final telling, mirroring `requestInFlight` semantics from `pages/gateway-canvas/lib/log-scope.ts`),
- rows still pending their measure sit in a bounded `pending: Map<id, LogRow>`; `interrupt(slug)` accrues that gateway's pendings as failed with zero tokens, mirroring `failTheUnfinishedRows` in `logs-ledger.ts`.

`forget(slug)` does NOT erase buckets. Usage is an accounting record; deleting a gateway must not delete what it spent. The breakdown table keeps naming the departed slug.

### Bucket schema

One persisted granularity: UTC hour buckets keyed by the full domain tuple, so every group-by the locked hierarchy needs (gateway, virtual model, real model, provider, account) folds out of the same rows.

```json
{
  "schemaVersion": 1,
  "hours": [
    {
      "hourStart": 1754920800000,
      "gateway": "my-gateway",
      "virtualModel": "claude-5.6-sol",
      "provider": "anthropic",
      "accountId": "acc_123",
      "providerModel": "claude-sonnet-4-5",
      "accountKind": "api-key",
      "requests": 42,
      "failed": 3,
      "durationMsSum": 61234,
      "tokens": {
        "input": 0,
        "output": 0,
        "cacheRead": 0,
        "cacheWrite": 0,
        "reasoning": 0,
        "total": 0
      }
    }
  ]
}
```

`hourStart = row.at - (row.at % 3_600_000)`. `accountKind` (from `accountKindSchema` in `packages/contracts/src/accounts.ts`: subscription, api-key, aggregator, local) is stamped at accrual time by resolving `row.accountId` against the accounts store, so cost basis survives account deletion or rename. Optional tuple fields stay absent for gateway-origin rows, exactly as on the row.

- **Day** buckets are a fold of 24 hour buckets at answer time in main, on UTC boundaries (matches Anthropic's daily-cost precedent; local-day folding is deferred).
- **Minute** buckets are the same tuple accrued into an in-memory ring capped at 1,440 minute starts, rebuilt empty on app restart and labelled as covering this session only. This satisfies the locked minute/hour/day ladder without persisting a second granularity: the raw-row ring the minute view mirrors does not survive restart either.

Bucket caps per width (locked ladder, Anthropic reference): minute 1,440, hour 168, day 92.

### Persistence

New store `apps/desktop/src/main/storage/usage-store.ts`, one file `userData/usage.json`, written with `writeJsonAtomic` and read with `readJsonWithQuarantine` plus `newerSchemaVersion` from `apps/desktop/src/main/storage/json-file.ts`. `schemaVersion` plus a `migrateDocument` chain in contracts, same lineage as `settings.ts`. Main is the single writer (ADR-0016 rule). Write cadence: a dirty flag flushed on a 30-second timer, on `interrupt`, and on app quit in `apps/desktop/src/main/app-lifecycle.ts`. Per-bucket mutation, per-file write: the locked "per-bucket writes, not per-row" decision means accrual mutates one bucket in memory and the file is rewritten whole on flush, which the atomic-rename path already handles.

One ADR accompanies this change: it amends ADR-0016's "usage logs in an engine-owned node:sqlite database" line to "hour-bucketed JSON ledger owned by main", records the LiteLLM price source, and records poll-over-push.

### Retention

`settingsSchema` in `packages/contracts/src/settings.ts` gains `usageRetentionDays` (integer, default 30, bounds 7 to 90) via a version 6 migration; `settingsPatchSchema` follows automatically through the existing `.omit().partial()`. Enforcement is two prune points in `usage-store.ts`: on load and on every flush, drop buckets with `hourStart < now - retentionDays`. The parked settings row (settings spec, "a setting that waits on request logging" scenario) goes live in `apps/desktop/src/renderer/src/pages/settings/ui/data-section/data-section.tsx` as a control writing the field through the existing `settings:save` channel. The delta spec rewrites that scenario in the same change, as locked decision 4 requires.

## 2. Contract changes

### What changes

1. `packages/contracts/src/engine-logs.ts`: `logRowSchema` gains one optional field:

   ```ts
   tokenSplit: z.strictObject({
     input: loggedTokensSchema,
     output: loggedTokensSchema,
     cacheRead: loggedTokensSchema,
     cacheWrite: loggedTokensSchema,
     reasoning: loggedTokensSchema,
   }).optional();
   ```

   `tokens` stays the total, so the drawer, footer, and every existing consumer keep reading unchanged. This one field is what carries the engine's six-way split (locked decision 9) across BOTH boundaries for free: `engineLogReportSchema` embeds `logRowSchema`, so the split reaches main's ledger with zero protocol additions, and `engine:logs` embeds it too, so a future per-row view in the renderer already has it. Engine side, three small touches populate it: `AttemptMeasure` in `packages/engine/src/provider/telemetry-feed.ts` widens from `{ durationMs, tokens }` to `{ durationMs, usage: ProviderUsage }`, `ProviderObservationSpan.finish` in `provider-observability.ts` (line 184) passes the `usage` it already holds, and `attemptRow` in `gateway-traffic.ts` maps it onto the row (`tokenSplit` omitted when the total is zero, matching the existing optionality).

2. New `packages/contracts/src/usage.ts`:
   - `usageBucketSchema`: the bucket row above, minus `schemaVersion`. One schema serves both the persisted document and the wire, which is the smallest possible surface.
   - `usageLedgerDocumentSchema`: `{ schemaVersion, hours: usageBucketSchema[] }` plus its migration chain.
   - `usageReportRequestSchema`: `{ width: z.enum(['minute','hour','day']), scope: z.strictObject({ gateway?, virtualModel?, provider?, accountId?, providerModel? }) }`, every scope field optional.
   - `usageReportSchema`: `{ generatedAt, width, retentionDays, buckets: usageBucketSchema[], dailyCost: dailyCostSchema[], unpriced: [{ providerModel, requests }] }`. Main folds WIDTH (day from hours) and filters SCOPE; the renderer folds DIMENSION (group-by). Returning tuple-keyed buckets rather than pre-grouped series is the key minimalism: one response shape serves the stat tiles, every group-by of the chart, the breakdown table, and the quota derivation, so no group-by parameter, no per-view channel, and no second query shape exist.
   - `dailyCostSchema`: `{ day, accountId?, providerModel, basis: z.enum(['estimated','equivalent']), usd }`. Daily granularity only (locked decision 5).
   - `aggregatorBalanceSchema`: `{ accountId, totalCreditsUsd, usedCreditsUsd, readAt }`.

3. `packages/contracts/src/ipc.ts`: two `ipcChannels` entries, `'usage:report'` and `'usage:balances'`, both plain request-response through `ipcResult`. Two matching `bridgeEntry` lines in `apps/desktop/src/preload/index.ts`. Handlers land beside the existing engine handlers in `apps/desktop/src/main/ipc/engine-ipc.ts`.

### What deliberately does NOT change

- `logBatchSchema`, `engine:logs`, `engine:replay-logs`, `engine:traffic`, `gatewayTrafficSchema`: untouched.
- `ipcEvents`: no new event. Usage freshness is polling (60-second `refetchInterval` while the page is mounted), which matches vendor prior art (Anthropic documents roughly five-minute freshness and recommends polling once per minute). A push channel is deferred until someone actually watches the screen live.
- The engine management surface (`management-usage.ts`, `popOldest`): untouched, keeps draining destructively for its own consumer.
- No cost field ever rides a log row. Cost is computed at read time in main and exists only in `usageReportSchema.dailyCost`.

## 3. Pricing

- **Fetch**: new `apps/desktop/src/main/pricing/litellm-prices.ts` fetches `https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json` after the window shows and every 24 hours. A failed fetch logs with context and keeps the last good copy; it never blocks a report.
- **Cache**: the fetched map lands in `userData/litellm-prices.json` through `writeJsonAtomic`, read back on boot with `readJsonWithQuarantine`.
- **Bundled fallback**: the same JSON vendored at `apps/desktop/resources/litellm-prices.json`, refreshed by ordinary dependency-bump cadence. Resolution order: in-memory copy, then userData cache, then bundled file, so first boot offline still prices.
- **Where cost is computed: main, at `usage:report` answer time, never the renderer.** The multi-megabyte price map never crosses IPC and no schema for it enters contracts. Main folds hour buckets to UTC days per (accountId, providerModel, accountKind), looks up `input_cost_per_token`, `output_cost_per_token`, `cache_read_input_token_cost`, `cache_creation_input_token_cost`, and emits `dailyCost` rows. Basis mapping from the stamped `accountKind`: api-key and aggregator produce `basis: 'estimated'`; subscription produces `basis: 'equivalent'` (the renderer prints the approximation prefix on every equivalent figure and keeps totals split, locked decision 6); local produces no cost row.
- **Model matching**: a pure function tried in order: exact `providerModel` key, then `provider/providerModel`, else the model lands in `unpriced` with its request count, visibly rather than silently.

## 4. Quota derivation

No third channel and no main-side quota engine. The two locked readings come from what already crosses:

- **5-hour and weekly window burn (subscription accounts)**: derived in the RENDERER from the hour-width report, whose 168-bucket cap covers exactly seven days. A pure lib `pages/usage/lib/quota-windows.ts` computes, per subscription `accountId`: trailing 5-hour token and request burn (sum of hour buckets with `hourStart >= now - 5h`), trailing 7-day burn (sum of all 168), and a window-start estimate (the most recent bucket with traffic that follows at least five empty hours), giving a reset estimate printed as an approximation ("resets by about HH:00" with the approximation prefix). The fill bar renders burn relative to that account's busiest 5-hour window inside retention, labelled as relative to the account's own peak, because no official ceiling exists to claim. Weekly shows trailing-seven-day burn with no reset countdown, since no honest derivation of Anthropic's weekly boundary exists. Section copy states "derived from local logs, not an official quota" (locked decision 8).
- **Aggregator balances**: `usage:balances` in main, a small fetcher `apps/desktop/src/main/aggregators/openrouter-credits.ts` calling OpenRouter `GET /api/v1/credits` with the vaulted key per `aggregator`-kind account, cached 60 seconds. The response's `readAt` lets the renderer print staleness ("read 40s ago"), honouring the upstream's documented 60-second cache. This is also the surface the aggregators spec has been waiting on ("the check waits for the surface that can hold its answer"); the delta notes it.

Hour resolution makes the 5-hour figures coarse. That is the honest trade of not persisting minutes, and the approximation prefix carries it.

## 5. Renderer

FSD placement (per the feature-sliced-design skill, doubled-path component folders, stories siblings mandatory):

- `shared/api/usage.ts`: `usageReportQueryOptions(request)` (key `['usage-report', width, scope]`, queryFn calling `window.recompose['usage:report']`, `refetchInterval: 60_000`) and `aggregatorBalancesQueryOptions()` (`refetchInterval: 60_000`, `staleTime: 60_000`). Exported through `shared/api/index.ts`. No cache binding, no push seam.
- `entities/usage/ui/usage-summary-card/usage-summary-card.tsx` (+ stories): the compact card locked decision 2 puts on the gateway and provider surfaces. It reads `usageReportQueryOptions` scoped to its subject (today's requests, tokens, approximate cost) and deep-links with `<Link to="/usage" search={{ gateway }}>`. It lives in `entities/` because two page slices consume it and pages cannot cross-import. Barrel `entities/usage/index.ts`, mirroring `entities/account`. Host spots: the gateway-canvas surface and `pages/providers`; the exact anchor inside each page is a design-document call, not an architecture one.
- `pages/usage/lib/usage-groupings.ts`: pure dimension fold (group buckets by any hierarchy level, sum counters) feeding tiles, chart, and table.
- `pages/usage/lib/quota-windows.ts`: section 4.
- `pages/usage/ui/` components, each with its stories sibling:
  - `usage-page/usage-page.tsx` (rewritten shell; keeps the empty-state card when the report holds no buckets, so today's browser test and stories keep their scenario),
  - `usage-scope-bar/` (width picker on the existing `SegmentedControl`, scope filter chips on `Chip`, writes URL search params),
  - `usage-stat-tiles/` (requests, tokens with cached broken out from uncached, error rate, cost with the estimated and equivalent totals kept distinguishable),
  - `usage-series-chart/` (hand-rolled SVG bars over `d3-scale` band and linear scales, the `ghost-graph.tsx` precedent; `role="img"`, printed values and a data-table twin as the WCAG 1.4.11 escape hatch, contrast measured in both schemes),
  - `usage-breakdown-table/` (the domain hierarchy gateway, virtual model, real model, provider, account, with request and split token counts and daily cost where a basis applies),
  - `quota-windows/` (per-account burn bars, approximation prefix everywhere),
  - `aggregator-balances/` (OpenRouter credit rows with staleness label).
- Route: `apps/desktop/src/renderer/src/app/routes/usage.tsx` gains `validateSearch` (zod schema: `width?: 'minute' | 'hour' | 'day'` defaulting to hour, and the optional scope fields `gateway`, `virtualModel`, `provider`, `account`) and a `loader` warming `usageReportQueryOptions` through `context.queryClient.ensureQueryData` (the `RouterAppContext` already exists in `__root.tsx`). **The URL-carried scope filter IS the search params**: the scope bar navigates with `Route.useNavigate({ search })`, the page reads `Route.useSearch()`, maps it to the report request, and every summary card elsewhere is just a typed `<Link>` into the same params. Nothing else carries filter state.
- `shared/testing/fake-bridge.ts` gains `usage:report` and `usage:balances` parameter entries so stories and browser tests author non-empty states the same way they do today.

## 6. Preparatory extraction

Locked decision 11 names three modules. The minimum execution:

1. `pages/gateway-canvas/ui/traffic-footer/footer-readings.ts` moves to `shared/lib/readings/readings.ts` (`compactCount`, `readDuration`, `pluralized`): pure formatting the tiles, table, and summary card all print with.
2. `pages/gateway-canvas/lib/log-scope.ts` SPLITS: the row predicates `requestInFlight` and `requestFailed` move into `packages/contracts/src/engine-logs.ts` beside `logRowSchema`; the canvas-selection types (`LogSubject`, `logScope`) stay in the slice and import the predicates. Contracts is the right floor because MAIN's usage ledger needs the same failed-versus-pending authority at accrual time, and a renderer-only shared/lib cannot serve it: one representation of the rule, both processes read it (the drawer's error toggle, the footer count, and the ledger's `failed` counter can never disagree).
3. `pages/gateway-canvas/lib/traffic-aggregates.ts` moves to `shared/lib/traffic-aggregates/traffic-aggregates.ts`, its test sibling riding along unchanged (pure refactor, specs untouched in content). Its consumer below pages is the summary card if the design wants the live minute beside today's totals; the move is locked regardless, and shared/lib is the lowest layer it works from since it is renderer display logic, not a wire contract.

Nothing else moves. `logged-request.ts` stays (no raw-row list on the usage page in v1), `use-canvas-clock.ts` stays (a polling page needs no display tick).

## 7. Test matrix sketch

| Layer             | What                                                                                                                                                                                                                                                                                                                                | Where                                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Unit, contracts   | `tokenSplit` accepts the split, rejects negatives and unknown keys; `usage.ts` schema round-trips; settings v6 migration adds the default                                                                                                                                                                                           | `packages/contracts/src/engine-logs.test.ts`, new `usage.test.ts`, `settings.test.ts`                 |
| Type-level        | `UsageBucket`, `UsageReport`, widened `LogRow` pin their inferred shapes                                                                                                                                                                                                                                                            | `engine-logs.test-d.ts`, new `usage.test-d.ts`                                                        |
| Unit, engine      | the measure carries the six-way usage; `attemptRow` maps it; a zero-total row omits `tokenSplit`                                                                                                                                                                                                                                    | `telemetry-feed` and `gateway-traffic` specs                                                          |
| Unit, main        | accrual dedupes the two-phase report; gateway rows accrue once; interrupt accrues pendings as failed; retention prunes on load and flush; UTC hour keying; day fold; minute ring trims at 1,440; price matching (exact, prefixed, unpriced); daily cost basis split; credits fetch caches 60s (fetch faked at the process boundary) | `usage-ledger.test.ts`, `usage-store.test.ts`, `litellm-prices.test.ts`, `openrouter-credits.test.ts` |
| Property + twin   | accrual is order-independent and total-preserving (fast-check law with a fixed-value deterministic twin, per the Stryker rule)                                                                                                                                                                                                      | beside `usage-ledger.test.ts`                                                                         |
| Integration, main | a log report through `engine-host` lands in a bucket the `usage:report` handler answers with; a retention save prunes                                                                                                                                                                                                               | `engine-host` suite via `engine-host.testkit.ts`                                                      |
| Browser, renderer | populated page via fake bridge; empty state stands; scope bar rewrites search params and the report refetches; quota figures carry the approximation prefix; summary card navigates pre-filtered (`renderAt('/usage?gateway=x')`)                                                                                                   | `pages/usage/**.browser.test.tsx`, entities card test                                                 |
| Stories           | every new `ui/` component, dual scheme, `lint:stories` gate                                                                                                                                                                                                                                                                         | siblings throughout                                                                                   |
| E2E               | one journey: start a gateway, serve a request, open Usage, read one request with its tokens; the retention row is live in settings                                                                                                                                                                                                  | `apps/desktop/e2e` feature file (gherkin plus playwright skills)                                      |
| Mutation          | ledger, pricing, quota-fold, groupings are node-side or pure logic on the diff-scoped Stryker gate                                                                                                                                                                                                                                  | diff gate                                                                                             |
| Manual gate       | dual-scheme `claude-in-chrome` pass; chart series contrast measured in both schemes                                                                                                                                                                                                                                                 | pre-land checklist                                                                                    |

## 8. Risks and deliberate deferrals

Risks:

- **One JSON file rewritten whole on flush.** Growth is bounded (retention capped at 90 days, roughly 2,160 hour starts times tuple cardinality), but a heavy multi-gateway machine could reach a file in the low megabytes rewritten every 30 dirty seconds. Escape hatch, recorded in the ADR: split to per-month files or revisit ADR-0016's sqlite line. Not built now.
- **Hour-resolution 5-hour windows are coarse.** The approximation prefix carries it; finer needs minute persistence, deferred.
- **LiteLLM key matching will miss some provider model names.** Misses are visible in `unpriced`, never silently zero.
- **Poll freshness (60s) rather than push.** Matches vendor prior art; a screen someone stares at updates a minute late at worst.
- **Interrupted requests accrue zero tokens.** A slight undercount, consistent with the no-claims posture.
- **`accountKind` is stamped at accrual.** Historical buckets keep the kind an account had then; a re-connected account under a new kind splits its history. Documented, not fought.

Deliberately deferred: usage push event, minute persistence across restarts, CSV export, hourly heatmap, TTFT and latency diagnostics charts, per-client-key scoped views, editable price overrides, models.dev fallback source, non-OpenRouter balance endpoints, weekly reset estimation, pagination of report responses, a raw request table on the usage page, local-calendar day folding.

## SCORES

| Dimension           | Score | One sentence                                                                                                                                                                                                            |
| ------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Simplicity          | 5     | One persisted bucket kind, two request-response channels, no new events, and the renderer folds dimensions from a single response shape.                                                                                |
| Blast radius        | 4     | Everything is new files except one optional field on `logRowSchema`, one settings migration, and a three-touch engine widening, all additive.                                                                           |
| Honesty of readings | 4     | Every figure is derivable, labelled, and approximation-prefixed, but hour-resolution quota windows, UTC day folds, and session-only minute views are coarser than a maximalist design would give.                       |
| Forward flexibility | 3     | Tuple-keyed buckets keep every future group-by open, but the single JSON file, poll-only freshness, and absent raw-row archive are doors later features (heatmaps, export, finer quota) must reopen.                    |
| Implementation cost | 5     | The smallest honest end-to-end diff: four main modules, one contracts module, one dependency, and a page slice, with the heavy machinery (persistence, chunking, query plumbing, settings migrations) all reused as-is. |
