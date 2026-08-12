# Approach B: data-first

The richest durable model the locked JSON-bucket decision allows. The thesis: every question the maintainer has already named as a later rider (hourly heatmaps, latency percentiles, per-client-key views, CSV export, cache-hit trends) is a query over the same bucket schema, so the schema ships wide on day one and the riders become renderer work, never migrations. Cost is never persisted, only its inputs are, so a corrected price recomputes all of history for free.

## 1. Usage ledger

### Two tiers, one honest split

- **Durable tier: hour-grain buckets** in JSON shards owned by the main process. Day and week views fold hours at read time. Hour keys are UTC epoch hours (`Math.floor(row.at / 3_600_000)`), so day boundaries resolve in the viewer's timezone at query time and a DST shift can never corrupt stored data.
- **Live tier: the existing row ring.** Minute-grain views (the explorer's `1m` width, the live sparkline) read the renderer's `['engine-logs', slug]` cache through the extracted `trafficAggregates`, exactly as the footer does today. The ledger never stores minutes: 43,200 minute keys a month times the dimension cross-product is the cardinality bomb the hour grain avoids, and the ring already serves the "real-time monitoring" use case in Anthropic's ladder. The minute view is labelled as spanning what the session holds.

### Dimensions (the bucket key)

One bucket per distinct tuple. Cardinality is bounded by configuration, not by traffic: gateways times virtual models times targets is tens of combinations in practice.

| Field           | Source                                         | Notes                                                                                       |
| --------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `hourUtc`       | `Math.floor(row.at / 3_600_000)`               | pure function of the row stamp, no rollover state                                           |
| `gateway`       | `LogRow.gateway`                               |                                                                                             |
| `virtualModel`  | `LogRow.virtualModel`                          | absent on gateway-raised rows                                                               |
| `provider`      | `LogRow.provider`                              | provider kind in the domain hierarchy                                                       |
| `accountId`     | `LogRow.accountId`                             | survives account deletion (the name resolves best-effort at render)                         |
| `providerModel` | `LogRow.providerModel`                         | the price-map join key and the per-model quota key                                          |
| `origin`        | `LogRow.origin`                                | keeps gateway-raised failures apart from provider traffic                                   |
| `costBasis`     | resolved at accrual from the accounts registry | `'api-key' \| 'subscription' \| 'local'`, baked in because the account may be gone tomorrow |

### Measures (per bucket)

| Measure      | Shape                                                                                           | Tomorrow's question it answers                     |
| ------------ | ----------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `requests`   | integer                                                                                         | rate charts, heatmaps                              |
| `statuses`   | map of exact status to count                                                                    | error trends, 429-pressure charts, success rate    |
| `tokens`     | `{ input, output, total, cacheRead, cacheWrite, reasoning }`                                    | cache-hit trends, reasoning share, cost inputs     |
| `durationMs` | `{ sum, max, bins }`                                                                            | latency percentiles per bucket                     |
| `ttftMs`     | `{ sum, max, bins }`                                                                            | first-byte latency diagnostics                     |
| `clients`    | map of `clientKey` digest to request count, capped at 64 keys with a reserved overflow sentinel | per-client-key views without unbounded cardinality |

`bins` are counts over fixed log-spaced edges declared once per shard as `latencyBinEdgesMs` in the shard header, so a later edge change is a schema version, not a reinterpretation. Percentiles derived from bins are labelled as binned; the exact `exactP95` stays available for the live minute tier.

### Accrual point and correctness

Accrual lives in the main process as a desk beside the existing two: `apps/desktop/src/main/engine-host/usage-ledger.ts` exporting `openUsageDesk`, mirroring `openLogsDesk` and `openTrafficDesk`. `openLogsDesk` in `apps/desktop/src/main/engine-host/logs-ledger.ts` gains an `onRow` observer fired for every retained row and for every row `failTheUnfinishedRows` rewrites, so interrupted 503 settlements accrue through the same seam instead of a duplicated rule.

The engine reports one request up to twice ("the first telling stands, and the second only adds what measuring the body revealed", `packages/engine/src/provider/telemetry-feed.ts`). The accrual laws:

1. **Settled predicate.** A row accrues when settled: `origin === 'gateway'` settles immediately; `origin === 'provider'` settles when `durationMs` is present (the same fact `requestInFlight` in `log-scope.ts` reads). The first, measureless telling never accrues.
2. **Once per row id.** The desk keeps a bounded in-memory set of accrued row ids covering the in-flight horizon; a second settled report of the same id is a no-op. Buckets never need the id again, so the set stays small.
3. **Stateless bucketing.** The bucket key derives from `row.at`, never from a "current bucket" cursor, so there is no rollover code path and no rollover bug class. A backwards wall-clock jump lands rows additively in an older bucket, which is correct because buckets are commutative sums.
4. **Crash and replay.** The ledger meta file persists `accruedThrough` (the newest settled `row.at` flushed to disk) plus `recentRowIds` (ids settled within the trailing ten minutes). On restart, replayed rows older than `accruedThrough` and ids in `recentRowIds` are skipped. Crash mid-write cannot tear a file (`writeJsonAtomic` is tmp plus rename); crash between accrual and flush loses at most one debounce window, never double-counts.

Named blind spot: a detached engine serving while no app is attached accrues nothing, because rows reach the desk only while main listens. The ledger is honest: it counts observed traffic and says so. The engine's management usage queue (`GET /v0/management/usage-queue`, destructive `popOldest` in `packages/engine/src/provider/provider-observability.ts`) could backfill that gap on reattach since observations carry the full `ProviderUsage`, but the queue is shared and destructive; this rides as an open question for the maintainer, not silent scope.

### Write cadence and atomicity

- Accrue in memory; flush dirty shards through the existing `writeJsonAtomic` (`apps/desktop/src/main/storage/json-file.ts`) on a debounce: five seconds after the last accrual, thirty seconds maximum under sustained load, plus a flush on `before-quit` and on gateway stop. This is the locked "per-bucket writes, not per-row" cadence.
- Single writer: main owns `~/.recompose/usage/`; the renderer reads through IPC only; the engine never touches it. `OWNED_ENTRIES` in `apps/desktop/src/main/storage/config-home.ts` gains `'usage'`.

### Files, retention, versioning

- **Monthly shards**: `~/.recompose/usage/usage-2026-08.json` plus `~/.recompose/usage/ledger-meta.json`. Shards cap the atomic-rewrite cost and make retention a file deletion.
- **Retention** is the returning settings control (locked decision 4): `settings.ts` gains `usageRetention: z.enum(['30d', '90d', '365d', 'forever'])` defaulting to `'90d'`, `SETTINGS_VERSION` steps to 6 with a migration in the existing chain. A sweep on boot and daily deletes shards wholly outside the window and trims the boundary shard by key filter. The sweep never trims the current or a future hour key, so a backwards clock jump cannot eat live data. The settings spec's parked scenario ("names request logging as what it waits for") rewrites to a live control in the delta.
- **Versioning**: every shard and the meta file carry `schemaVersion`, migrated through `migrateDocument` from `packages/contracts/src/migration.ts`. A newer version refuses loudly (the `SettingsNewerSchemaError` pattern in `apps/desktop/src/main/storage/settings-store.ts`); damage quarantines via `readJsonWithQuarantine`. A quarantined or refused shard costs history, never the app.
- **ADR obligation**: ADR-0016's Decision names an engine-owned `node:sqlite` `usage.db`. This approach supersedes that clause: main-owned JSON buckets, engine stays storage-free, the single-writer rule holds with a different owner. That is a new ADR, and the bucket schema is deliberately row-shaped so a later port to sqlite (if shard rewrites ever measurably hurt) is a storage swap with the contract unchanged.

Shard sketch (illustrative):

```json
{
  "schemaVersion": 1,
  "monthKey": "2026-08",
  "latencyBinEdgesMs": [50, 100, 250, 500, 1000, 2500, 5000, 10000, 30000, 60000],
  "buckets": [
    {
      "hourUtc": 496872,
      "gateway": "main",
      "virtualModel": "claude-5.6-sol",
      "provider": "anthropic",
      "accountId": "acc-01",
      "providerModel": "claude-sonnet-4-5",
      "origin": "provider",
      "costBasis": "subscription",
      "requests": 12,
      "statuses": { "200": 11, "429": 1 },
      "tokens": {
        "input": 91234,
        "output": 20411,
        "total": 132920,
        "cacheRead": 18400,
        "cacheWrite": 2875,
        "reasoning": 3020
      },
      "durationMs": { "sum": 44120, "max": 9120, "bins": [0, 1, 2, 4, 3, 1, 1, 0, 0, 0, 0] },
      "ttftMs": { "sum": 8120, "max": 2100, "bins": [2, 3, 4, 2, 1, 0, 0, 0, 0, 0, 0] },
      "clients": { "sha256:ab...": 9, "sha256:cd...": 3 }
    }
  ]
}
```

## 2. Contract changes

### Row widening (the six-field split survives, locked decision 9)

The split dies today at `packages/engine/src/provider/provider-observability.ts` line 184: `this.attempt.answered(status, { durationMs, tokens: usage.totalTokens })`. The fix runs down the chain:

- `AttemptMeasure` in `packages/engine/src/provider/telemetry-feed.ts` widens from `{ durationMs, tokens }` to carry the full `ProviderUsage` plus `ttftMs`; `ProviderAttempt` carries them; `attemptRow` in `packages/engine/src/gateway-traffic.ts` maps them onto the row.
- `logRowSchema` in `packages/contracts/src/engine-logs.ts` gains optional nonnegative-integer fields `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`, `reasoningTokens`, and optional nonnegative `ttftMs`. The existing `tokens` field stays and keeps meaning total, so `trafficAggregates`, the drawer, and the footer change nothing. Flat optionals match the row's existing style and keep the strictObject privacy posture: named numeric facts only, nowhere for a body to hide.

### New aggregate contracts

New file `packages/contracts/src/usage-ledger.ts`:

- `usageBucketSchema`, `usageShardSchema` (`schemaVersion`, `monthKey`, `latencyBinEdgesMs`, `buckets`), `usageLedgerMetaSchema` (`schemaVersion`, `accruedThrough`, `recentRowIds`), `USAGE_LEDGER_VERSION`, `usageLedgerMigrations`.
- `usageQuerySchema`: `{ sinceHourUtc, untilHourUtc, grain: 'hour' | 'day', scope }` where `scope` is a partial over the dimension fields (the URL filter deserializes into exactly this).
- `usageReportSchema`: a discriminated union on `grain`. The `'day'` variant carries cost readings; the `'hour'` variant structurally cannot (locked decision 5, encoded in the type rather than in review comments).
- `costReadingSchema`: `{ basis, amountMicroUsd, pricedWith: { source: 'synced' | 'bundled', fetchedAt }, approximate: boolean, unpricedModels }`. Integer micro-USD so summed figures stay exact after the single rounding.
- `quotaReadingSchema` and `aggregatorBalanceSchema` for section 4.

IPC additions in `packages/contracts/src/ipc.ts`:

- Channels: `'usage:query'` (request `usageQuerySchema`, response `ipcResult(usageReportSchema)`), `'usage:quota'`, `'usage:balances'`.
- Event: `'usage:accrued'` with a payload of touched `hourUtc` keys, so the renderer invalidates narrowly instead of refetching on every request served.
- Mirrored in `apps/desktop/src/preload/index.ts` (`bridgeEntry` and `eventEntry`) and handled in a new `apps/desktop/src/main/ipc/usage-ipc.ts` beside `engine-ipc.ts`.

### Type-level spec obligations

Behavior changes, so specs change with it (the tdd-bdd invariant):

- `packages/contracts/src/engine-logs.test-d.ts`: the `toEqualTypeOf<LogRow>` pin widens with the six new optionals; the privacy pins (`not.toHaveProperty('prompt')` and kin) stand untouched.
- New `packages/contracts/src/usage-ledger.test-d.ts`: pins the bucket key and measure shape exhaustively, pins that the `'hour'` report variant has no cost property (`Extract<UsageReport, { grain: 'hour' }>` lacks `cost`), pins `readonly` arrays.
- `packages/contracts/src/ipc.test-d.ts`: the three channels and the event join the channel and payload pins, following the `ipc-telemetry.test-d.ts` precedent.

## 3. Pricing

### Lifecycle

Main-owned module `apps/desktop/src/main/pricing/price-map.ts`:

1. **Cache**: `~/.recompose/usage/prices.json` holding the LiteLLM `model_prices_and_context_window.json` payload plus `{ fetchedAt, sourceUrl, contentHash }`.
2. **Fetch**: on app start when the cache is older than 24 hours, and on a 24-hour timer, from the raw GitHub URL (locked decision 7). Fetch failure is written down and the cache stands.
3. **Bundled fallback**: a checked-in snapshot at `apps/desktop/resources/litellm-prices.json`, refreshed per release, used when no cache exists and the fetch fails. Every answer names its source.
4. **Staleness**: query answers carry `pricedWith: { source, fetchedAt }`; the renderer labels figures priced from data older than seven days or from the bundle.

Parsing is lenient by design: a zod schema picks the fields recompose reads (`input_cost_per_token`, `output_cost_per_token`, `cache_read_input_token_cost`, `cache_creation_input_token_cost`) and ignores the rest, so LiteLLM adding fields never breaks the app. models.dev stays the named alternate if the shape disappoints.

### Cost is computed, never stored

Cost is a pure function evaluated inside the `'usage:query'` handler in main: `costOf(bucket.tokens, priceEntry)` summed over buckets, per `costBasis`, only at day grain. Nothing persisted anywhere ever contains a cost figure. This is the price-versioning answer: the versioned artifacts are the inputs (six token fields per `providerModel` in the buckets, plus the identified price map), so when LiteLLM corrects a price, every historical day recomputes on the next query with zero migration. The renderer does no price math at all; one authority.

Model resolution: `priceEntryFor(provider, providerModel)` tries the exact key, then the provider-prefixed key, then a date-suffix-stripped normalization. A miss returns an explicit `unpriced` marker that surfaces in `costReadingSchema.unpricedModels`; an unpriced model never prints as zero dollars (no silent failures).

Dual semantics (locked decision 6): `costBasis` was baked into the bucket at accrual, so the split is a group-by, not a heuristic. `'api-key'` prints as estimated cost; `'subscription'` prints as equivalent cost with the approximation prefix; totals stay per-basis and are never merged into one number.

## 4. Quota derivation

### Window algebra over the same buckets

All quota figures are folds over hour buckets scoped to `costBasis: 'subscription'` and grouped by `accountId` (and `providerModel` for per-model weekly limits, a dimension the key already carries):

- **5-hour burn**: `burn(account, now) = fold of tokens over hourUtc in (nowHour - 5, nowHour]`. Hour resolution makes the window conservative by up to one hour; the label says "hour-grain estimate" rather than pretending precision.
- **Window anchor**: Anthropic's 5-hour windows open at the first request after idleness, so the anchor derives as the first non-empty bucket following a gap of five or more empty hours; `resetAt = anchor + 5h` drives the countdown.
- **Weekly burn**: the rolling 168-hour fold, per account and per `providerModel`.

Every figure carries `approximate: true` and `derivedFrom: 'local-logs'` in `quotaReadingSchema`, and the copy never claims official remaining quota, because no first-party API exists (locked decision 8). The honest sentence is "what this machine sent through this account", not "what Anthropic will let you send".

### Aggregator balances

Main polls OpenRouter `GET /api/v1/credits` per credentialed account, answering the `'usage:balances'` channel with `{ accountId, totalCredits, totalUsage, readAt }`. The renderer's query uses `staleTime` of 60 seconds (the upstream itself is up to 60 seconds stale) and prints "as of Ns ago". The Antigravity credits hint (`AntigravityCreditsHint` in `packages/engine/src/subscription/antigravity-credits.ts`) rides provider responses inside the engine and would need a new engine-to-main report; it is named as a later rider, not v1.

## 5. Renderer

### FSD placement and data flow

- `apps/desktop/src/renderer/src/shared/api/usage.ts`: `usageQueryOptions(query)`, `quotaQueryOptions()`, `balancesQueryOptions()`, and `bindUsageAccrualsToCache(queryClient)` subscribing `'usage:accrued'` and invalidating `['usage']` keys whose range covers a touched hour. Mirrors `shared/api/engine-logs.ts`; exported through `shared/api/index.ts`. Shared placement because gateway and provider summary cards consume the same queries.
- `apps/desktop/src/renderer/src/app/routes/usage.tsx`: `validateSearch` with a zod scope schema (the `providers.tsx` `narrowedKind` precedent), `loaderDeps` from search, loader warming `context.queryClient.ensureQueryData(usageQueryOptions(...))`. Search params, all optional so bare `/usage` works: `{ range?: '24h' | '7d' | '30d' | '90d', gateway?, model?, account?, provider? }`. Summary cards elsewhere deep-link by navigating with these params (locked decision 2).
- `pages/usage/` components, each in its own `ui/<name>/<name>.tsx` folder with the mandated `*.stories.tsx` sibling:
  - `usage-page/`: composition root.
  - `usage-range-picker/`: `SegmentedControl` from `shared/ui`.
  - `usage-stat-tiles/`: requests, token split with cache share, per-basis cost, error rate; tiles select the chart metric (the ElevenLabs pattern from the Mobbin arm).
  - `usage-series-chart/`: hand-rolled SVG bars with `d3-scale` (locked decision 10), `role="img"`, printed values as the WCAG 1.4.11 escape hatch, dual-scheme checked.
  - `usage-breakdown-table/`: rows follow the domain hierarchy gateway, virtual model, real model, provider, account; target rows key on account plus real model.
  - `quota-section/`: per-account window fill bars and reset countdown, approximation prefix throughout.
  - `cost-figure/`: one component owns the approximation prefix, the unpriced state, and micro-USD formatting, so no surface invents its own cost rendering.
- The live "last hour" strip reads the existing `['engine-logs', slug]` caches through the extracted `trafficAggregates`; the ledger is never consulted for minutes.
- Settings: the retention row goes live in the settings page, reading and writing `usageRetention` through the existing `settings:save` channel.
- Testing seams: `shared/testing/fake-bridge.ts` `BridgeParameters` gains the three usage channels; `shared/testing/fake-engine-pushes.ts` gains `emitUsageAccrued`.

## 6. Preparatory extraction from gateway-canvas

Locked decision 11, shipped as its own reviewable stage before any page work:

- New `apps/desktop/src/renderer/src/entities/request-log/` slice (the request log is a domain entity; `entities/account/` is the precedent):
  - `lib/traffic-aggregates.ts`: `trafficAggregates`, `TrafficAggregates` (from `pages/gateway-canvas/lib/traffic-aggregates.ts`).
  - `lib/log-scope.ts`: `LogSubject`, `requestInFlight`, `requestFailed`, `logScope` (from `pages/gateway-canvas/lib/log-scope.ts`); the usage page's error counts read the same `requestFailed` authority as the footer and drawer.
  - `index.ts` public API.
- `shared/lib/format/`: `compactCount`, `readDuration`, `pluralized` move from `pages/gateway-canvas/ui/traffic-footer/footer-readings.ts`; they are unit formatting with no domain, so shared, not entities.
- `pages/gateway-canvas` imports flip to the new homes; behavior is unchanged, so the move is a pure refactor: existing specs relocate beside their subjects without rewriting (the tdd-bdd invariant), and `steiger.config.ts` no-cross-import rules stay green.
- Row presentation helpers (`servedAt`, `tookFor`, `servedByAccount`, `servedByProvider` in `logged-request.ts`) move only if the usage page ships a recent-requests list in v1; otherwise they stay put (YAGNI).

## 7. Test matrix sketch

| Layer            | What                                                                                                                                                                                                                                                                                                                                                             | Where                                                                                                                |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Contracts unit   | schema accept and refuse tables; `usageLedgerMigrations` chain; settings v6 migration                                                                                                                                                                                                                                                                            | `packages/contracts/src/usage-ledger.test.ts`, `settings.test.ts`                                                    |
| Type-level       | widened `LogRow` pin; bucket and report pins; hour-variant-has-no-cost pin; ipc channel and event pins                                                                                                                                                                                                                                                           | `engine-logs.test-d.ts`, new `usage-ledger.test-d.ts`, `ipc.test-d.ts`                                               |
| Engine unit      | `AttemptMeasure` carries the split and `ttftMs`; `attemptRow` maps it; two-tell behavior unchanged                                                                                                                                                                                                                                                               | beside `telemetry-feed.ts`, `gateway-traffic` specs                                                                  |
| Main integration | accrual behaviors (two-phase idempotence, interrupt 503 accrues once, gateway-origin rows, backwards clock); flush debounce with fake timers; restart replay against `accruedThrough` and `recentRowIds` never double-counts; corrupt shard quarantines; newer schema refuses; retention sweep; price fallback chain with a mocked fetch; quota anchor detection | `apps/desktop/src/main/engine-host/usage-ledger.test.ts`, `storage/usage-store.test.ts`, `pricing/price-map.test.ts` |
| Renderer browser | `renderAt('/usage', parameters)`: empty state, URL-prefiltered scope, approximation labels, unpriced footnote, live retention control; stories siblings; dual-scheme page inspection                                                                                                                                                                             | `pages/usage/**`                                                                                                     |
| E2E              | serve one request through a running gateway, open Usage, the day bucket shows it with the token split; restart the app, history survives; shrink retention, old data leaves                                                                                                                                                                                      | e2e suite, gherkin plus playwright skills                                                                            |

Property tests (fast-check), each with a deterministic fixed-value twin because the seed-in-name rule keeps properties out of Stryker's per-test filter (`.claude/rules/tdd-bdd.md`):

1. **Conservation**: for any set of settled rows, every measure summed over buckets equals the same measure summed over rows; bucketing is a partition, no row lost, none counted twice.
2. **Order independence**: accrual is a fold over a commutative monoid; any permutation of the same rows yields identical buckets.
3. **Idempotence**: accruing a settled row twice equals once, for any row.
4. **Grain fold**: folding hour buckets into days equals accruing directly at day grain; merge is associative, so shard-by-shard aggregation is sound.
5. **Retention law**: the sweep keeps exactly the buckets whose key is inside the window; nothing inside is touched, nothing outside survives.
6. **Histogram sanity**: bin counts sum to the count of measured durations; any percentile derived from bins never exceeds `max`.
7. **Price linearity**: `costOf` is linear in each token field; zero tokens cost zero; an unpriced model yields the unpriced marker, never zero.

Mutation: the accrual desk, window algebra, retention sweep, and price math are node-side logic on the diff-scoped Stryker gate; the deterministic twins carry the mutation duty for every law above.

## 8. Risks and costs this richness buys

- **Whole-shard rewrites.** Atomic JSON writes rewrite a month shard per flush. Bounded by hour grain, non-empty buckets only, the client-key cap, and monthly sharding; if a heavy month still hurts, the row-shaped bucket schema ports to sqlite as a storage swap with the contract untouched. The debounce is the knob.
- **ADR-0016 supersession.** The accepted record says engine-owned `node:sqlite`; this says main-owned JSON. A superseding ADR must argue it (rows already cross to main for the logs desk; the engine stays storage-free; the single-writer rule survives with a new owner).
- **Detached-engine blind spot.** Traffic served with no app attached never accrues. The screen stays honest ("what this app observed"), and the management-queue backfill is a named option, not silent scope.
- **Histogram percentiles are approximations.** Labelled binned; the exact p95 survives on the live minute tier.
- **LiteLLM shape drift.** Lenient parsing plus the bundled snapshot bound the failure to "prices go stale", never "screen breaks"; models.dev is the recorded alternate.
- **Cardinality edges.** A client rotating user agents inflates `clientKey`; the capped map with an overflow sentinel bounds every bucket. Dimensions otherwise track configuration size.
- **Sheer surface.** Three channels, one event, two contract files, a settings migration, an engine measure widening, a main-process state machine, and the widest test matrix of the three approaches. That is the price of answering heatmaps, percentiles, per-client views, CSV export (a later serializer over shard buckets, no schema change), and cache-hit trends with zero future migrations.

## SCORES

| Axis                | Score | One sentence                                                                                                                                                                                 |
| ------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Simplicity          | 2     | An accrual state machine with dedupe horizons, histograms, and a price pipeline is the least simple thing the locked decisions permit, deliberately.                                         |
| Blast radius        | 2     | It touches engine measure plumbing, contracts, preload, main storage and IPC, settings schema, and the renderer, though each touch is additive and the row widening is optional-fields-only. |
| Honesty of readings | 5     | Basis-split costs, unpriced markers instead of zeros, approximation prefixes, staleness stamps, and binned-percentile labels mean no figure claims more than the data supports.              |
| Forward flexibility | 5     | Every named tomorrow-question is already a query over stored dimensions and measures, cost recomputes from persisted inputs, and versioned shards migrate through the existing chain.        |
| Implementation cost | 2     | Roughly double the minimal approach: the bucket engine, pricing lifecycle, quota algebra, and their property and mutation obligations all land in one change.                                |
