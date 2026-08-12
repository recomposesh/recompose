# Solution design

## Header and change linkage

- Change id: usage-screen
- Schema: recompose
- Proposal: [proposal.md](proposal.md)
- Specs: [gherkin/](gherkin/) (authored in parallel this cycle)
- Discovery: [discovery/](discovery/)
- Tasks: None yet. The decomposition hooks below seed it.

## Context

The `/usage` route ships as a promise: an empty card says a gateway's rate, latency, tokens, and spend will collect there. Nothing behind that promise exists. Request history lives in a 10,000-row ring that a management queue drains. The engine parses a six-way token split and drops it at the Inter-Process Communication (IPC) boundary. Cost has no surface, because the telemetry spec bans it everywhere. The approved proposal locks the answer: a main-owned hour-bucket ledger, a pricing pipeline, three pull channels, a usage explorer screen, and a live retention control in settings. This document turns that proposal into engineering shape: exact contracts, module boundaries, a full file map, and a task order sized for a live pairing implementation. The preparatory extraction stage already stands on this branch, so the map below builds on shared formatters, a request-log entity, and a shared display tick that exist today.

## Discovery inputs consumed

- `discovery/locked-decisions.md` decisions 1 through 13: the tier, the information architecture, the data spine, the correctness laws, and the synthesis pick bind every section below.
- `discovery/code-map.md`, `bindEngineLogsToCache` in `__root.tsx`: every gateway's rows already reach the query cache machine-wide, so the live plane needs no new channel.
- `discovery/code-map.md`, `engine-logs.ts` per-slug cache keys: the live fold fans out over the gateway list, because no all-gateways key exists.
- `discovery/code-map.md`, `logs-ledger.ts`: the desk already owns the settled and failed authority, including interrupt rewrites, which fixes the accrual point.
- `discovery/code-map.md`, `engine-spend.ts`: the only spend machinery grants budgets rather than accruing them, so the ledger is new accrual, not a read.
- `discovery/code-map.md`, `provider-usage.ts`: the six-way split exists per dialect, so the contract widening carries parsed values rather than new parsing.
- `discovery/research.md` vendor ladder: minute, hour, and day widths with capped counts set the range-to-bucket mapping and the closed-bucket rule.
- `discovery/research.md` cost precedent: both first-party vendors refuse cost below day width, which fixes the spend rule and the tile snap.
- `discovery/research.md` accessibility criteria: Web Content Accessibility Guidelines (WCAG) 1.4.11 conformance rides on printed values and the data-table twin.
- `discovery/research.md` chart evaluation: hand-rolled Scalable Vector Graphics (SVG) over `d3-scale` wins on the headless principle, and Recharts loses on that principle before its React 19 risk even counts.
- `discovery/research.md` spec conflicts: the cost ban, the stale retention scenario, and the waiting aggregators sentence all settle in this delta.
- `discovery/cliproxyapi-research.md`: the ecosystem treats the LiteLLM price map as the standard source, which decision 7 adopted.
- `discovery/mobbin-references.md`: tiles as selector, the group-by pivot, the range control, and the cycle-above-history order shape the screen's anatomy.
- `discovery/rider-ledger.md` issues #44, #47, and #33: the ledger and the price pipeline build once here as the shared assets those issues name.
- `discovery/rider-ledger.md` riders #140, #153, #123, and #108: the mocked upstream carries the end-to-end proof, the test-infra settings bind the visual specs, the activate channel stays unclaimed, and empty states get copy through the amendment process.
- `discovery/design-critique.md`: consulted, no impact beyond the proposal revision that already folded it.
- `discovery/approach-ux-first.md`, `approach-minimal.md`, and `approach-data-first.md`: consumed through locked decision 13.

## Goals and non-goals

**Goals:**

- One persisted, machine-wide usage ledger answers what the machine served over the retention window, across restarts, keyed by the domain hierarchy.
- The parsed token split survives the process boundary, so cached, uncached, output, and reasoning tokens reach every reading.
- The usage explorer ships whole: quota strip, metric tiles as the chart selector, the series chart with its data-table twin, the breakdown table, and every named state.
- Cost appears on exactly one surface, at day width only, split into billed and equivalent bases in integer micro-dollars.
- The retention control lands live in settings at 7, 30, or 90 days, bound to the ledger's prune through a consequence flow.
- The three standing spec conflicts settle in this delta rather than staying silent.

**Non-goals:**

- No latency histograms, percentile series, or time-to-first-token readings.
- No per-status maps and no per-client-key maps or views.
- No usage push channel and no monthly shard files.
- No comma-separated export, hourly heatmaps, or raw-request table on the page.
- No editable price overrides and no models.dev fallback source.
- No balances beyond OpenRouter and no weekly reset countdown.
- No local-calendar day folds and no minute persistence across restarts.
- No detached-engine backfill through the management queue.

## Constraints and invariants

Project rules, binding verbatim:

- TypeScript maximum strictness, always: `strict: true` plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noPropertyAccessFromIndexSignature`. No `any`, no `as` casts to silence errors.
- Never write code comments. Code explains itself through naming and structure.
- The `feature-sliced-design` decision tree places every renderer file, and a new `ui/` component owns a folder with its `*.stories.tsx` sibling.
- Never disable, override, loosen, or silence any gate.
- Test code changes if and only if behavior changes.
- The domain hierarchy binds every surface: gateway, virtual model, real model, provider kind, account name.
- Anything that reaches the screen gets looked at through `claude-in-chrome`, in both schemes, before it lands.

Feature invariants:

- Reports answer closed buckets only. The open bucket never appears in an answer, so the live plane and the ledger plane never double count.
- No cost figure persists anywhere, and no raw price crosses the boundary. Reports carry integer micro-dollar day figures that main computes at answer time.
- A false zero never prints. Minutes older than the oldest held row render as gaps labelled unknown, and ledger loading renders width-stable placeholders.
- Forgetting a gateway never erases its buckets. Usage is an accounting record, and the breakdown keeps naming the departed slug.
- Buckets fold on Coordinated Universal Time (UTC) boundaries, and the chart caption and quota copy both say so.
- Every estimated figure carries the approximation prefix, plus a text form the screen reader speaks without the glyph.
- Shortening retention prunes without undo, so the change holds until the person accepts the cost through the consequence flow.
- The range control never lies: a ledger refusal moves the selection to `1h` so the control matches what draws.

## Design

### The vertical at a glance

```
engine child                 main process                          renderer
------------                 ------------                          --------
provider answer              logs desk retains rows,               engine:logs push fills the
  usage split parsed   --->  batches them to the windows,    --->  per-gateway row cache
  onto the log row           and tells the usage store              live plane: the trailing
                             each row exactly once, settled          hour folds from cached rows
                             usage store accrues hour               usage:report polls closed
                             buckets, debounced flush         --->  buckets, day costs, misses,
                             to userData/usage.json                  and pricing provenance
                             price map: memory, then cache,         usage:quota-windows and
                             then the bundled snapshot        --->  usage:balances poll the rest
```

The engine gains no new behavior on the serving path. It copies the split it already parses onto the row. Main owns everything durable: the ledger, the prices, the quota algebra, and the balance reads. The renderer owns presentation folds: the trailing-hour live plane, every group-by, and the screen itself. The trade-off runs through that split. Folding group-bys in the renderer costs a larger report payload, and buys one response shape for the tiles, the chart, and the breakdown, with no per-view channel. Folding days in main buys one cost authority and keeps prices out of the renderer.

### Stage one, the extraction, already landed

The preparatory stage from locked decision 11 stands on this branch, reviewed as its own stage:

- `shared/lib/readings/readings.ts` carries the shared formatters. The one declared behavior change shipped with it: `compactCount` climbs a magnitude ladder through `k`, `M`, and `B`, and `exactCount` prints grouped exact headlines. The footer's tests moved and updated in the same stage, because behavior changed and the Test-Driven Development (TDD) invariant demands it.
- `entities/request-log/model/request-standing.ts` and `entities/request-log/model/traffic-aggregates.ts` hold the one error authority and the minute-window aggregates. The footer, the drawer, and this page all read the same `requestFailed`.
- `shared/lib/use-display-tick/use-display-tick.ts` generalizes the private display clocks, and the footer and the canvas page adopted it.
- The visibility modules regrouped under `shared/lib/visibility/`.

The usage work below consumes these as they stand and moves nothing further down.

### The ledger and its laws

The ledger is one document, `userData/usage.json`, owned by main and written through the shipped atomic-write and quarantine paths. Its unit is the hour bucket: a UTC hour start, the full domain tuple, and additive measures. The tuple stamps `accountKind` at accrual by resolving the account registry, so the cost basis survives account deletion or rename.

**Accrual point.** `openLogsDesk` gains a settled observer. The desk already decides when a row is final. A provider row settles when its duration arrives, or when its first report already carries one. A gateway-raised row settles on arrival, and an interrupt rewrite settles the rows it fails. The desk tells the observer exactly once per row id at that transition, and backfill replays never reach it. Main therefore never re-derives the settled predicate, which approach B named as the correctness anchor.

**Replay guard.** The document persists `accruedThrough`, the newest settled stamp flushed, plus `recentRowIds`, the accrued ids stamped inside a trailing guard window. A row older than the watermark skips, and a row whose id sits in the guard skips, so any replay path accrues nothing twice.

**Flush cadence.** Writes debounce at `FLUSH_QUIET_MS` (3,000 ms) after the last accrual, with a `FLUSH_CEILING_MS` (30,000 ms) bound under sustained load, plus a flush on quit and on gateway interrupt. A crash between flushes loses at most the debounce window, never doubles it.

**Prune points.** The prune runs on load and on every flush. It drops buckets whose hour start falls before now minus `usageRetentionDays`, read live from settings so a shortened window prunes on the next flush.

**Laws.** Three property laws pin the accrual, each with a deterministic fixed-value twin per the house mutation rule. Conservation: measures summed over buckets equal the same measures summed over the accrued rows. Order independence: any permutation of the same rows yields identical buckets. Idempotency: accruing a settled row twice equals accruing it once.

### Pricing

The price map lives its whole life in main:

1. **Boot.** Resolution order: the in-memory copy, then the `userData` cache, then the bundled snapshot at `apps/desktop/resources/model-prices.json`. A first boot offline prices from the bundle.
2. **Refresh.** A 24-hour timer fetches the LiteLLM map (`model_prices_and_context_window.json`) from its raw GitHub address, validates the shape, writes the cache, and swaps the in-memory copy. A failed fetch keeps the standing copy and stamps nothing.
3. **Answer time.** `usage:report` folds day buckets and prices them: billed micro-dollars for `api-key` and `aggregator` traffic, equivalent micro-dollars for `subscription` traffic, nothing for `local`. Reasoning tokens shape the display and carry no price of their own. A corrected price recomputes every historical day on the next report, because no cost ever persists.
4. **Misses.** A model the map can't price lands in `priceMisses` by name and request count, never as zero dollars.
5. **Provenance.** Every report says what priced it: `synced` or `bundled`, and the fetch time when one exists.

Key resolution tries the exact `providerModel`, then `provider/providerModel`, matching how the map keys vendor-prefixed entries.

### Quota and balances

The quota algebra runs in main over closed hour buckets plus the desk's retained rows for the open hour, per subscription account:

- Windows fold in time order. A window opens at the first activity at or after the previous window's close, and closes a fixed length later: 5 hours or 7 days.
- The current window is the last one whose close lies ahead of now. When none does, burn reads zero and no countdown prints.
- The record is the largest burn over every observed window of the same length inside retention, kept with its opening stamp. The gauge draws burn on a fixed track and marks the record as a line, so a new record moves the marker instead of rescaling history.
- The 5-hour reset countdown derives from the window anchor and carries the approximation prefix. The weekly gauge shows burn without a countdown, since no honest weekly boundary exists.
- The copy names the derivation: hour buckets on UTC boundaries, from local logs, never an official quota.

Balances stay a separate desk. `usage:balances` answers the OpenRouter credits read per aggregator account, with a `readAt` stamp so staleness prints as data. The desk caches the last good reading, and a failed refresh returns that reading beside the failure sentence.

### The renderer planes

The trailing hour computes live in the renderer, folded into minute buckets from the log-row cache the app already fills machine-wide. The shared display tick re-derives it. Every longer range pulls closed buckets from the ledger over `usage:report`. The seam is a bucket boundary, never a guess: the `1h` range draws the live plane alone, and `24h`, `7d`, and `30d` draw ledger buckets alone, so nothing double counts. Freshness polls through TanStack Query with `staleTime` and a refetch interval tied to the bucket width: one minute at hour width, five minutes at day width. No push channel exists.

### The component tree

```
UsagePage (pages/usage)
|- range control in the shell toolbar trailing slot (SegmentedControl)
|- ScopePath (shared/ui): the hierarchy path, press truncates the scope
|- QuotaStrip (pages/usage)
|  |- one quota gauge per subscription account (ProportionFill)
|  '- BalanceCard (pages/usage): reading, staleness stamp, refresh act
|- MetricTiles (pages/usage): five MetricTile (shared/ui) as one radio group
|- UsageChart (pages/usage)
|  |- SeriesChart (shared/ui): stacked and hatch-textured bars over d3-scale
|  |- printed caption: range, bucket width, total, peak, UTC note
|  |- HoverPopover (shared/ui): the bucket reading under the pointer
|  |- retention-edge annotation at the oldest retained bucket
|  '- Disclosure (shared/ui) revealing the TableShell (shared/ui) twin
'- BreakdownTable (pages/usage)
   |- group-by control (SegmentedControl)
   '- TableShell rows: name, requests, tokens, spend, share meter, drill chevron
```

Feature-Sliced Design (FSD) placement: the seven new primitives carry no domain knowledge, so they land in `shared/ui`, each in its own folder with its stories sibling, exported through the barrel. The page-local compositions that read queries and speak the domain live in `pages/usage/ui`. Pure folds live in `pages/usage/lib`. The summary cards stay page-local on the gateway and provider pages, thin compositions over shared pieces, because one page never imports another.

### Scope in the address bar

Scope lives in typed search params on the `/usage` route: `range`, `metric`, and one optional param per hierarchy level (`gateway`, `virtualModel`, `providerModel`, `provider`, `account`). The scope path writes them, back and forward walk the drill history, and a reload lands on the same view. Summary cards deep-link through the same params with the typed `Link`. The route's loader warms the report query for the parsed range.

The spend tile carries the one special rule: cost exists at day width only. At a sub-day range the tile face prints today so far and says so, and selecting it snaps the range to `7d` unless a day-width range already stands. Range segments wider than the retention window render inert with the reason named. In a narrow window the tiles wrap to a two-row grid, and breakdown columns leave in a stated order: the share meter first, then tokens. The chart drops buckets rather than thinning bars below the named minimum width.

### The desktop menu

A route-scoped Usage menu mirrors the Gateway menu precedent: range items under accelerators, a metric submenu, a checkbox item for the table twin, and a Refresh item. Refresh takes its own accelerator, while Cmd+R keeps the renderer reload. Menu picks reach the page over a new `usage:command` renderer-bound event, and the page reports the twin's state back over `system:usage-table`, the same shape `system:logs-drawer` already ships for its checkbox.

## Data model and contracts

### The log row widens

`packages/contracts/src/engine-logs.ts` gains one nested optional object, and every shipped consumer keeps reading `tokens` unchanged:

```ts
export const tokenSplitSchema = z.strictObject({
  input: z.number().int().nonnegative(),
  output: z.number().int().nonnegative(),
  cacheRead: z.number().int().nonnegative(),
  cacheWrite: z.number().int().nonnegative(),
  reasoning: z.number().int().nonnegative(),
});

export type TokenSplit = z.infer<typeof tokenSplitSchema>;

// logRowSchema gains:
usage: tokenSplitSchema.optional(),
```

The engine fills it from the split it already parses: `AttemptMeasure` gains an optional `usage: ProviderUsage`, `ProviderObservationSpan.finish` passes the parsed usage into `attempt.answered`, and `attemptRow` in `gateway-traffic.ts` copies the five fields onto the row. `tokens` stays the total.

### The usage contracts module

`packages/contracts/src/usage.ts` is new:

```ts
export const usageRangeSchema = z.enum(['24h', '7d', '30d']);
export const usageBucketWidthSchema = z.enum(['hour', 'day']);

export const usageTupleSchema = z.strictObject({
  gateway: gatewaySlugSchema,
  virtualModel: modelAliasSchema.optional(),
  provider: nonBlankString.optional(),
  providerModel: nonBlankString.optional(),
  accountId: nonBlankString.optional(),
  accountKind: accountKindSchema.optional(),
});

export const usageMeasuresSchema = z.strictObject({
  requests: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  answered: z.number().int().nonnegative(),
  durationMsSum: z.number().nonnegative(),
  tokens: z.strictObject({
    input: z.number().int().nonnegative(),
    output: z.number().int().nonnegative(),
    cacheRead: z.number().int().nonnegative(),
    cacheWrite: z.number().int().nonnegative(),
    reasoning: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
  }),
});

export const usageBucketSchema = z.strictObject({
  start: z.number().int().nonnegative(),
  tuple: usageTupleSchema,
  measures: usageMeasuresSchema,
});

export const pricingProvenanceSchema = z.strictObject({
  source: z.enum(['synced', 'bundled']),
  fetchedAt: z.number().int().nonnegative().optional(),
});

export const usageDayCostSchema = z.strictObject({
  dayStart: z.number().int().nonnegative(),
  tuple: usageTupleSchema,
  billedMicroDollars: z.number().int().nonnegative().optional(),
  equivalentMicroDollars: z.number().int().nonnegative().optional(),
});

export const priceMissSchema = z.strictObject({
  provider: nonBlankString.optional(),
  providerModel: nonBlankString,
  requests: z.number().int().nonnegative(),
});

export const usageReportSchema = z.strictObject({
  range: usageRangeSchema,
  bucketWidth: usageBucketWidthSchema,
  buckets: z.array(usageBucketSchema).readonly(),
  dayCosts: z.array(usageDayCostSchema).readonly(),
  priceMisses: z.array(priceMissSchema).readonly(),
  pricing: pricingProvenanceSchema,
  oldestRetainedStart: z.number().int().nonnegative().optional(),
});

export const quotaWindowSchema = z.strictObject({
  accountId: nonBlankString,
  provider: nonBlankString,
  length: z.enum(['5h', 'week']),
  openedAt: z.number().int().nonnegative().optional(),
  closesAt: z.number().int().nonnegative().optional(),
  burnTokens: z.number().int().nonnegative(),
  record: z
    .strictObject({
      burnTokens: z.number().int().nonnegative(),
      openedAt: z.number().int().nonnegative(),
    })
    .optional(),
});

export const balanceReadingSchema = z.strictObject({
  totalCredits: z.number().nonnegative(),
  totalUsage: z.number().nonnegative(),
  readAt: z.number().int().nonnegative(),
});

export const accountBalanceSchema = z.strictObject({
  accountId: nonBlankString,
  reading: balanceReadingSchema.optional(),
  failure: nonBlankString.optional(),
});
```

`accountKind` stays optional on the tuple because a gateway-raised row reached no account. Load-bearing inferred types get their `usage.test-d.ts` twin with `expectTypeOf`, per the house type-level rule.

### The ledger document on disk

```ts
export const USAGE_LEDGER_VERSION = 1;

export const usageLedgerSchema = z.strictObject({
  schemaVersion: z.literal(USAGE_LEDGER_VERSION),
  accruedThrough: z.number().int().nonnegative(),
  recentRowIds: z.array(nonBlankString).readonly(),
  buckets: z.array(usageBucketSchema).readonly(),
});
```

The store reads it through `readJsonWithQuarantine` and `newerSchemaVersion`, writes it through `writeJsonAtomic`, and opens a migration chain at version 1. A shard split into per-month files stays a recorded escape hatch in the accompanying record, not built now.

### Channels and events

`packages/contracts/src/ipc.ts` gains three invoke channels, one chrome channel, one renderer-bound event, and one error code:

```ts
'usage:report': {
  request: z.strictObject({ range: usageRangeSchema }),
  response: ipcResult(usageReportSchema),
},
'usage:quota-windows': {
  request: z.void(),
  response: ipcResult(z.array(quotaWindowSchema).readonly()),
},
'usage:balances': {
  request: z.strictObject({ refresh: z.boolean() }),
  response: ipcResult(z.array(accountBalanceSchema).readonly()),
},
'system:usage-table': {
  request: z.strictObject({ open: z.boolean() }),
  response: ipcResult(z.void()),
},

'usage:command': {
  payload: z.enum([
    'range-1h', 'range-24h', 'range-7d', 'range-30d',
    'metric-requests', 'metric-tokens', 'metric-spend',
    'metric-latency', 'metric-errors',
    'toggle-table-twin', 'refresh',
  ]),
},
```

`ipcErrorSchema` gains `'usage-newer-schema'`, mirroring the settings guard: a ledger from a newer build refuses rather than quarantining. The preload bridge mirrors every addition, and the fake bridge grows answers for all four channels.

### The settings field and its migration

`packages/contracts/src/settings.ts` narrows retention to exactly three values and bumps the version:

```ts
export const SETTINGS_VERSION = 6;

export const usageRetentionDaysSchema = z.union([
  z.literal(7),
  z.literal(30),
  z.literal(90),
]);

// settingsSchema gains:
usageRetentionDays: usageRetentionDaysSchema,

const keepUsageForThirtyDays: Migration = {
  from: 5,
  migrate: (doc) => ({ ...doc, schemaVersion: 6, usageRetentionDays: 30 }),
};
```

The migration joins the existing chain, `defaultSettings` gains the field at 30, and `settledOnDisk` writes the carried-forward document back, exactly as the shipped chain behaves.

### State transitions

- A row settles once at the desk, accrues into its hour bucket, and never accrues again: the watermark and the id guard hold the law across replays.
- A bucket closes when its hour ends. Only closed buckets leave main, and day buckets fold from closed hours at answer time.
- The prune removes buckets past retention on load and on every flush. Shortening the window makes the next flush destructive, which the consequence flow gates.
- The price map moves `bundled` to `synced` on the first successful fetch and never moves back unless the cache and memory both empty.
- A quota window opens on first activity after the previous close, and the record updates whenever a window's burn passes it.

## Error handling

- **Ledger read or write refusal.** The handler answers `{ ok: false, error: { code: 'storage-failed' } }` with the attempted operation named. The page renders the inline refusal card with a Retry act, and the range selection moves to `1h` so the control matches what draws.
- **Newer ledger schema.** `usage:report` answers `'usage-newer-schema'`, accrual pauses so this build never rewrites a newer document, and the card names the build mismatch.
- **Corrupt ledger document.** `readJsonWithQuarantine` moves the file aside as `usage.json.corrupt-<stamp>`, reports through the shipped corruption path, and the ledger restarts empty rather than guessing.
- **Price fetch failure.** The standing copy keeps serving, provenance keeps saying `synced` with its old stamp or `bundled`, and no error state reaches the screen.
- **Price miss.** The model surfaces in `priceMisses` by name and request count. The screen never prints zero dollars for it.
- **Balance read failure.** The answer carries the last good reading beside the failure sentence. The card keeps the reading with its staleness stamp, names the failure, and offers refresh.
- **Row without a split.** Accrual adds the row's `tokens` total and counts, and leaves the five split fields untouched, so the conservation law holds field by field.
- **Settings save refusal.** The retention row surfaces the shipped settings error path unchanged.
- **Route crash.** `PageError` keeps owning it.

## File map

Stage one, already landed on this branch:

- `apps/desktop/src/renderer/src/shared/lib/readings/readings.ts`: shared formatters with the magnitude ladder and the exact headline form (landed)
- `apps/desktop/src/renderer/src/entities/request-log/model/request-standing.ts`: the one in-flight and failed authority (landed)
- `apps/desktop/src/renderer/src/entities/request-log/model/traffic-aggregates.ts`: the minute-window aggregates (landed)
- `apps/desktop/src/renderer/src/shared/lib/use-display-tick/use-display-tick.ts`: the shared display clock (landed)

Contracts package (outside FSD):

- `packages/contracts/src/engine-logs.ts`: `tokenSplitSchema` and the optional `usage` row field (modify)
- `packages/contracts/src/engine-logs.test.ts`: the widening laws, split optional, total untouched (modify)
- `packages/contracts/src/engine-logs.test-d.ts`: the widened row type (modify)
- `packages/contracts/src/usage.ts`: buckets, tuple, measures, report, quota, balances, ledger document, provenance (create)
- `packages/contracts/src/usage.test.ts`: schema laws and refusals (create)
- `packages/contracts/src/usage.test-d.ts`: the inferred contract types (create)
- `packages/contracts/src/settings.ts`: `usageRetentionDays`, version 6, the migration (modify)
- `packages/contracts/src/settings.test.ts`: the migration row and the narrowed values (modify)
- `packages/contracts/src/settings.test-d.ts`: the widened settings type (modify)
- `packages/contracts/src/ipc.ts`: three usage channels, the chrome channel, the `usage:command` event, the new error code (modify)
- `packages/contracts/src/ipc.test.ts`: the channel table additions (modify)
- `packages/contracts/src/ipc.test-d.ts`: the channel types (modify)
- `packages/contracts/src/index.ts`: the barrel gains the usage module (modify)

Engine package (outside FSD):

- `packages/engine/src/provider/telemetry-feed.ts`: `AttemptMeasure` and `ProviderAttempt` gain the optional usage split (modify)
- `packages/engine/src/provider/provider-observability.ts`: `finish` hands the parsed usage to the attempt (modify)
- `packages/engine/src/gateway-traffic.ts`: `attemptRow` copies the split onto the row (modify)
- `packages/engine/src/gateway-traffic-logs.test.ts`: the split rides the row (modify)
- `packages/engine/src/gateway-provider-observability.test.ts`: the span hands the split over (modify)

Main process (outside FSD):

- `apps/desktop/src/main/usage/usage-buckets.ts`: pure accrual, the replay guard, the prune, day folds, closed-bucket selection (create)
- `apps/desktop/src/main/usage/usage-buckets.test.ts`: the accrual behaviors plus the deterministic twins (create)
- `apps/desktop/src/main/usage/usage-buckets.property.test.ts`: conservation, order independence, and idempotency (create)
- `apps/desktop/src/main/usage/usage-store.ts`: load, quarantine, newer-schema refusal, debounced flush, quit and interrupt flush (create)
- `apps/desktop/src/main/usage/usage-store.test.ts`: the store shell behaviors (create)
- `apps/desktop/src/main/usage/pricing.ts`: pure day costing, basis split, micro-dollar rounding, misses (create)
- `apps/desktop/src/main/usage/pricing.test.ts`: the costing behaviors (create)
- `apps/desktop/src/main/usage/price-map.ts`: fetch, validate, cache, bundle resolution, provenance (create)
- `apps/desktop/src/main/usage/price-map.test.ts`: the lifecycle behaviors (create)
- `apps/desktop/src/main/usage/quota-windows.ts`: the pure window algebra (create)
- `apps/desktop/src/main/usage/quota-windows.test.ts`: the algebra behaviors (create)
- `apps/desktop/src/main/usage/balances.ts`: the OpenRouter credits desk with its `readAt` cache (create)
- `apps/desktop/src/main/usage/balances.test.ts`: the desk behaviors (create)
- `apps/desktop/src/main/ipc/usage-ipc.ts`: the three handlers plus the chrome channel (create)
- `apps/desktop/src/main/ipc/usage-ipc.test.ts`: the handler behaviors (create)
- `apps/desktop/src/main/ipc/dispatch.ts`: the handler table gains the four channels (modify)
- `apps/desktop/src/main/ipc/register-ipc.ts`: wiring only (modify)
- `apps/desktop/src/main/engine-host/logs-ledger.ts`: the settled observer and a retained-rows read (modify)
- `apps/desktop/src/main/engine-host/engine-host-types.ts`: deps carry the observer (modify)
- `apps/desktop/src/main/engine-host/engine-host.ts`: the desk wiring hands the observer through (modify)
- `apps/desktop/src/main/engine-host/engine-host-logs.test.ts`: settled-once told, backfill never told (modify)
- `apps/desktop/src/main/menu/app-menu-template.ts`: the route-scoped Usage menu (modify)
- `apps/desktop/src/main/menu/app-menu-template.test.ts`: the menu rows and accelerators (modify)
- `apps/desktop/src/main/menu/app-menu.ts`: sends `usage:command`, reads the twin state (modify)
- `apps/desktop/src/main/index.ts`: opens the usage store, flushes on quit (modify)
- `apps/desktop/src/preload/index.ts`: bridge entries for the channels and the event (modify)
- `apps/desktop/resources/model-prices.json`: the vendored price snapshot (create)

Renderer, shared and entities layers:

- `apps/desktop/src/renderer/src/shared/api/usage.ts`: `usageReportQueryOptions`, `quotaWindowsQueryOptions`, `balancesQueryOptions` with width-tied freshness (create)
- `apps/desktop/src/renderer/src/shared/api/index.ts`: the barrel gains usage (modify)
- `apps/desktop/src/renderer/src/shared/ui/metric-tile/metric-tile.tsx`: the selectable stat card, with stories sibling (create)
- `apps/desktop/src/renderer/src/shared/ui/series-chart/series-chart.tsx`: stacked and hatch-textured bars over band and linear scales, with stories sibling (create)
- `apps/desktop/src/renderer/src/shared/ui/proportion-fill/proportion-fill.tsx`: one fill for the share meter and the quota gauge, with stories sibling (create)
- `apps/desktop/src/renderer/src/shared/ui/scope-path/scope-path.tsx`: the hierarchy path whose segments truncate on press, with stories sibling (create)
- `apps/desktop/src/renderer/src/shared/ui/table-shell/table-shell.tsx`: one shape for the breakdown and the twin, with stories sibling (create)
- `apps/desktop/src/renderer/src/shared/ui/disclosure/disclosure.tsx`: the twin's reveal, with stories sibling (create)
- `apps/desktop/src/renderer/src/shared/ui/hover-popover/hover-popover.tsx`: the bucket reading under the pointer, with stories sibling (create)
- `apps/desktop/src/renderer/src/shared/ui/index.ts`: the barrel gains the seven (modify)
- `apps/desktop/src/renderer/src/shared/testing/fake-bridge.ts`: answers for the four channels (modify)
- `apps/desktop/src/renderer/src/app/styles/theme.css`: the series tokens, the hatch geometry, the meter fill, the wide data measure (modify)
- `apps/desktop/src/renderer/src/app/styles/primitives.css`: the primitives those tokens draw from (modify)
- `apps/desktop/src/renderer/src/app/routes/usage.tsx`: typed search params and the report-warming loader (modify)

Renderer, pages layer:

- `apps/desktop/src/renderer/src/pages/usage/lib/live-window.ts`: the trailing-hour minute fold over cached rows (create)
- `apps/desktop/src/renderer/src/pages/usage/lib/live-window.test.ts`: the fold behaviors (create)
- `apps/desktop/src/renderer/src/pages/usage/lib/usage-groups.ts`: group-by folds over tuple-keyed buckets (create)
- `apps/desktop/src/renderer/src/pages/usage/lib/usage-groups.test.ts`: the fold behaviors (create)
- `apps/desktop/src/renderer/src/pages/usage/lib/usage-search.ts`: the search schema, scope narrowing, the spend snap rule (create)
- `apps/desktop/src/renderer/src/pages/usage/lib/usage-search.test.ts`: the narrowing behaviors (create)
- `apps/desktop/src/renderer/src/pages/usage/ui/usage-page/usage-page.tsx`: the explorer assembly and its states (modify)
- `apps/desktop/src/renderer/src/pages/usage/ui/usage-page/usage-page.stories.tsx`: the six named stories with dark twins (modify)
- `apps/desktop/src/renderer/src/pages/usage/ui/usage-page/usage-page.browser.test.tsx`: the state and interaction behaviors (modify)
- `apps/desktop/src/renderer/src/pages/usage/ui/metric-tiles/metric-tiles.tsx`: the five tile faces as one radio group, with stories sibling (create)
- `apps/desktop/src/renderer/src/pages/usage/ui/usage-chart/usage-chart.tsx`: chart wiring, caption, popover, retention edge, the twin, with stories sibling (create)
- `apps/desktop/src/renderer/src/pages/usage/ui/breakdown-table/breakdown-table.tsx`: the group-by pivot, the share meter column, drill chevrons, the row context menu, with stories sibling (create)
- `apps/desktop/src/renderer/src/pages/usage/ui/quota-strip/quota-strip.tsx`: the gauges with record markers and reset copy, with stories sibling (create)
- `apps/desktop/src/renderer/src/pages/usage/ui/balance-card/balance-card.tsx`: the credits reading with staleness and refresh, with stories sibling (create)
- `apps/desktop/src/renderer/src/pages/gateway-canvas/ui/usage-summary-card/usage-summary-card.tsx`: the gateway surface's deep-linking card, with stories sibling (create)
- `apps/desktop/src/renderer/src/pages/providers/ui/usage-summary-card/usage-summary-card.tsx`: the provider surface's deep-linking card, with stories sibling (create)
- `apps/desktop/src/renderer/src/pages/settings/ui/data-section/data-section.tsx`: the retention row beside the config folder row (modify)
- `apps/desktop/src/renderer/src/pages/settings/ui/data-section/data-section.stories.tsx`: the row's states (modify)
- `apps/desktop/src/renderer/src/pages/settings/ui/data-section/data-section.browser.test.tsx`: the consequence flow behaviors (modify)
- `apps/desktop/src/renderer/src/pages/settings/ui/restart-confirmation/restart-confirmation.tsx`: generalizes to carry the retention consequence (modify)

End-to-end, gates, and records:

- `apps/desktop/e2e/usage-screen.ts`: the usage page object (create)
- `apps/desktop/e2e/steps/usage.steps.ts`: step definitions for the behavior specs (create)
- `apps/desktop/e2e/fake-tools/`: the mocked upstream answers gain usage payloads, riding rider #140 (modify)
- `apps/desktop/package.json`: `d3-scale` and its types enter the renderer (modify)
- `pnpm-lock.yaml`: the lockfile follows (modify)
- `apps/desktop/stryker.config.json`: the mutate list gains the pages/usage lib folds (modify)
- `.github/workflows/ci.yml`: the mutation diff glob widens to the same files (modify)
- `docs/adr/0087-usage-ledger-pricing-and-chart-tokens.md`: the decision record, written through the house record skill (create)
- `docs/adr/README.md`: the index gains the record (modify)
- `openspec/changes/usage-screen/specs/`: the usage capability plus the gateway-telemetry, settings, and aggregators amendments, authored with the behavior specs (create)

## Interfaces

Consumes:

- `writeJsonAtomic`, `readJsonWithQuarantine`, `newerSchemaVersion` from `apps/desktop/src/main/storage/json-file.ts`
- `loadSettingsFile` and the settings document for `usageRetentionDays`
- `openLogsDesk` from `logs-ledger.ts`, extended below, and `LOGS_RETAINED_MAX` as the live-plane bound
- `ProviderUsage` and `providerUsageFrom` from `packages/engine/src/provider/provider-usage.ts`
- `engineLogsQueryOptions`, `gatewaysQueryOptions`, `accountsQueryOptions` from `shared/api`
- `requestFailed`, `requestInFlight`, `trafficAggregates` from `entities/request-log`
- `compactCount`, `exactCount`, `readDuration`, `pluralized` from `shared/lib/readings`
- `useDisplayTick` from `shared/lib/use-display-tick`
- `SegmentedControl`, `Badge`, `StatusChip`, `Icon`, `PageError` from `shared/ui`
- `scaleBand`, `scaleLinear` from `d3-scale`

Produces, contracts:

- `TokenSplit`, `UsageRange`, `UsageBucket`, `UsageMeasures`, `UsageTuple`, `UsageReport`, `UsageDayCost`, `PriceMiss`, `PricingProvenance`, `QuotaWindow`, `AccountBalance`, `UsageLedger`, and their schemas
- `IpcChannel` widened by `'usage:report'`, `'usage:quota-windows'`, `'usage:balances'`, and `'system:usage-table'`, plus the `'usage:command'` event

Produces, main:

- `accrued(ledger: UsageLedger, row: LogRow, accountKind: AccountKind | undefined): UsageLedger`
- `prunedBefore(ledger: UsageLedger, oldestKeptStart: number): UsageLedger`
- `closedHourBuckets(ledger: UsageLedger, range: UsageRange, now: number): readonly UsageBucket[]`
- `dayFolded(buckets: readonly UsageBucket[]): readonly UsageBucket[]`
- `openUsageStore(deps: UsageStoreDeps): Promise<UsageStore>` where `UsageStore` is `{ accrue(row: LogRow): void; report(range: UsageRange): Promise<UsageReport>; flushNow(): Promise<void> }`
- `dayCostsOf(days: readonly UsageBucket[], prices: PriceMap): { dayCosts: readonly UsageDayCost[]; priceMisses: readonly PriceMiss[] }`
- `openPriceMap(deps: PriceMapDeps): { standing(): { prices: PriceMap; provenance: PricingProvenance } }`
- `quotaWindowsOf(buckets: readonly UsageBucket[], liveRows: readonly LogRow[], now: number): readonly QuotaWindow[]`
- `openBalancesDesk(deps: BalancesDeps): { read(refresh: boolean): Promise<readonly AccountBalance[]> }`
- `openLogsDesk(push, onSettled?: (row: LogRow) => void): LogsDesk`, and `LogsDesk` gains `retainedRows(): readonly LogRow[]`

Produces, renderer:

- `usageReportQueryOptions(range: UsageRange)`, `quotaWindowsQueryOptions`, `balancesQueryOptions` from `shared/api/usage.ts`
- `liveWindowFold(rows: readonly LogRow[], now: number): readonly UsageBucket[]` from `pages/usage/lib/live-window.ts`
- `groupedBy(buckets: readonly UsageBucket[], level: HierarchyLevel): readonly BreakdownRow[]` from `pages/usage/lib/usage-groups.ts`
- `usageSearchSchema`, `narrowedScope`, `spendSnappedRange` from `pages/usage/lib/usage-search.ts`
- The seven `shared/ui` primitives with their props types

## Decisions

### 1. The ledger lives in main as hour buckets in one document

Architecture Decision Record (ADR) 0016 wrote usage logs into an engine-owned `node:sqlite` database. This change supersedes that line: main owns `userData/usage.json`, hour buckets under the shipped atomic-write and quarantine paths, no database dependency. The settled authority lives in main's logs desk, including the interrupt rewrites the engine never sees, so an engine-owned store would re-derive that predicate from less truth. Bucketed accrual writes per flush, not per request, and a bounded tuple space keeps the document small. A per-month shard split stands as the recorded escape hatch if it grows.

**Alternatives considered:** the engine-owned `node:sqlite` store as ADR-0016 wrote, rejected because the accrual authority and the retention setting both live in main. A second store would fork the settled predicate. Raw row persistence, rejected as unbounded and needless when buckets answer every locked reading.

**ADR draft:** [ADR-0087](../../../docs/adr/0087-usage-ledger-pricing-and-chart-tokens.md), which amends ADR-0016's usage-storage line and records the shard escape hatch.

### 2. Prices come from the LiteLLM map with a bundled fallback

The LiteLLM price map is the source, fetched from its raw GitHub address on a 24-hour refresh, cached in `userData`, with a vendored snapshot serving a first boot offline. The ecosystem treats it as the standard source. Issues #44, #47, and #33 name the same catalog as a shared asset, so this pipeline builds once and those issues consume it.

**Alternatives considered:** models.dev, noted as the alternative if LiteLLM's shape disappoints, not adopted now. A hand-kept table per release, rejected because it forks the knowledge #47 says gets built once.

**ADR draft:** [ADR-0087](../../../docs/adr/0087-usage-ledger-pricing-and-chart-tokens.md), which records the source, the fallback order, and the shared-asset positioning for #44, #47, and #33.

### 3. Freshness polls, and no push channel exists

Reports answer closed buckets, so nothing a push could carry changes faster than a bucket closes. TanStack Query polls with `staleTime` tied to the bucket width, and the shared display tick re-derives the live plane. This keeps the channel surface at three pull channels and spares main a subscription registry.

**Alternatives considered:** a `usage:changed` push per accrual, rejected because the open bucket never appears in an answer, so the push would mostly announce nothing a reader may draw.

**ADR draft:** [ADR-0087](../../../docs/adr/0087-usage-ledger-pricing-and-chart-tokens.md), which records poll-over-push.

### 4. The series and meter colors enter the design system as tokens

Seven `light-dark()` tokens land in the theme before any component consumes them: `--color-series-input`, `--color-series-cached`, `--color-series-output`, `--color-series-cost`, `--color-series-cost-equivalent`, `--color-series-errors`, and `--color-meter-fill`, plus the hatch geometry and a wider data measure. Each clears 3:1 against `--color-surface-card` in both schemes, and each stands apart from the domain role tints, because every saturated theme token already carries a domain meaning. The values author in the recompose-design-system project first, per the design-values rule.

**Alternatives considered:** reusing the role tints, rejected because teal already means gateway and a chart would overload it. Literal colors in the chart, rejected by the design-token rule.

**ADR draft:** [ADR-0087](../../../docs/adr/0087-usage-ledger-pricing-and-chart-tokens.md), which records the token families as shared assets of the system.

### 5. Accrual settles once through the logs desk observer

The desk tells the usage store each row exactly once, at the moment the row becomes final, and backfill never reaches the observer. The watermark plus the recent-id guard make restarts and replays idempotent. This is approach B's law carried into the shipped desk rather than a new predicate.

**Alternatives considered:** subscribing main to raw engine reports, rejected because two-phase commits would accrue twice and interrupt rewrites would never accrue. Accruing in the renderer, rejected because a closed window would stop the books.

**ADR draft:** none, the delta spec carries the law.

### 6. Cost splits into billed and equivalent bases, in integer micro-dollars, at day width only

`api-key` and `aggregator` traffic prices as billed estimate, `subscription` traffic prices as equivalent cost under the approximation prefix, and `local` traffic carries no cost. Figures cross the boundary as integer micro-dollars so a sub-cent day survives, and the renderer prints below one cent as less than one cent, never as zero. Cost computes only in main, only at answer time, so a corrected price rewrites history on the next report.

**Alternatives considered:** one blended cost column, rejected because a per-token price is fabrication for a subscription seat. Floating dollar amounts on the wire, rejected because rounding drift would let two surfaces disagree.

**ADR draft:** none, locked decisions 5 and 6 already carry it and the delta amends the telemetry spec.

### 7. Retention narrows to 7, 30, or 90 days behind a consequence flow

`usageRetentionDays` admits exactly three values, with 30 the default, rendered as the kit's three-segment control in the Data section. Shortening prunes without undo, so the row names what a shorter window drops and the change holds until the person accepts the cost through the settings consequence flow.

**Alternatives considered:** a free-form day count, rejected because three values cover the honest choices and the union type keeps every consumer total. Landing the control inert first, rejected because the settings spec forbids a control nothing reads.

**ADR draft:** none, the settings delta carries it.

### 8. The extraction stage stands as its own reviewed stage

Stage one landed before any page work: the shared formatters, the request-log entity, and the shared display tick. The formatters carried the one declared behavior change, the compact count's magnitude ladder. The footer's tests updated in the same stage because behavior changed, which is the TDD invariant applied, not violated. The usage work consumes the stage as it stands.

**Alternatives considered:** extracting during page work, rejected because a page importing another page breaks the FSD boundary the linter enforces.

**ADR draft:** none, locked decision 11 already carries it.

### 9. Mutation scope widens to the new pure folds

The main-process glob already covers every new module under `src/main/usage/`. The mutate list gains the renderer's pure folds: `pages/usage/lib/live-window.ts`, `pages/usage/lib/usage-groups.ts`, and `pages/usage/lib/usage-search.ts`. The pipeline's diff glob widens to match. Excluded on purpose: the `ui/` components and the query options, whose behavior lands in browser and end-to-end layers, and the store shells beyond what the main glob already includes.

**Alternatives considered:** leaving the renderer folds out, rejected because they're exactly the node-runnable logic the mutation rule exists for.

**ADR draft:** none, gate widening follows the standing mutation rule.

## Test matrix

| Layer          | What this layer proves (or why none)                                                                                                                                                                                                                                                                                    | Check command                                                                                                                                                    |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit           | schema laws and migrations in contracts, the split riding the engine row, accrual and prune arithmetic, day folds, pricing bases and rounding, the quota algebra, the store shell, the renderer folds, the search narrowing                                                                                             | `pnpm --filter @recompose/contracts run test`, `pnpm --filter @recompose/engine run test`, and `pnpm --filter @recompose/desktop exec vitest run --project unit` |
| Integration    | real-browser behaviors on the mounted route: tiles select the chart series, the drill narrows and the path truncates, the refusal card retries and the range snaps to `1h`, placeholders never reflow into figures, the retention row confirms through the consequence flow, and every story passes axe in both schemes | `pnpm --filter @recompose/desktop exec vitest run --project browser --project storybook --project storybook-dark`                                                |
| End-to-end     | one usage journey on the mocked upstream: served traffic fills the tiles, a restart keeps the figures, the drill deep-links, and the retention change prunes, riding rider #140                                                                                                                                         | `pnpm run test:e2e`                                                                                                                                              |
| Property       | conservation, order independence, and idempotency of accrual over arbitrary row sets, each law beside its fixed-value twin in the unit suite                                                                                                                                                                            | `pnpm --filter @recompose/desktop exec vitest run --project unit`                                                                                                |
| Mutation scope | the diff-scoped gate over `src/main/usage/**`, the touched desk and dispatch files, and the three renderer folds named in decision 9                                                                                                                                                                                    | `pnpm --filter @recompose/desktop run test:mutation` and `pnpm --filter @recompose/contracts run test:mutation`                                                  |

Designated mutant killers:

- Conservation twin: a fixed three-row fixture sums buckets against rows field by field, so a mutant that drops a measure dies.
- Order twin: two fixed permutations of the same rows assert identical ledgers, so a mutant that keys on arrival order dies.
- Idempotency twin: one fixed row accrues twice and asserts the single-accrual ledger, so a mutant that weakens the guard dies.
- The seam rule: a fixture holding an open-hour row asserts the report excludes it, so a mutant that leaks the open bucket dies.
- The basis split: fixtures per `accountKind` assert billed, equivalent, and absent cost, so a mutant that blends bases dies.

## Task decomposition hooks

Stage one, the extraction, is complete on this branch. The remaining tasks run in order, each small enough for a live pairing session and each independently green.

- Task 1: the token split on the log row (depends on: none, hands off: `tokenSplitSchema` and the optional `usage` field)
- Task 2: the engine carries the split (depends on: 1, hands off: rows arriving with `usage` filled)
- Task 3: the usage contracts module (depends on: 1, hands off: every schema and inferred type in `usage.ts`)
- Task 4: channels, event, error code, preload, and fake bridge (depends on: 3, hands off: the callable bridge surface)
- Task 5: the settings field and its migration (depends on: none, hands off: `usageRetentionDays` readable everywhere)
- Task 6: the pure bucket ledger with its three laws and twins (depends on: 3, hands off: `accrued`, `prunedBefore`, `closedHourBuckets`, `dayFolded`)
- Task 7: the usage store shell and the desk's settled observer (depends on: 6, hands off: a running store accruing real rows)
- Task 8: the price map lifecycle, pure pricing, and the bundled snapshot (depends on: 3, hands off: `dayCostsOf` and `openPriceMap`)
- Task 9: the quota algebra and the balances desk (depends on: 6, hands off: `quotaWindowsOf` and the balances read)
- Task 10: the usage handlers in dispatch and the wiring (depends on: 4, 7, 8, 9, hands off: the three channels answering)
- Task 11: tokens plus the four simple primitives, proportion fill, disclosure, table shell, and hover popover (depends on: none, hands off: the tokens and primitives with stories)
- Task 12: metric tile, scope path, and the series chart (depends on: 11, hands off: the remaining primitives with stories)
- Task 13: renderer queries, search params, loader, and the two folds (depends on: 4, hands off: `shared/api/usage.ts` and the `pages/usage/lib` modules)
- Task 14: the page assembly with states, stories, and browser specs (depends on: 10, 12, 13, hands off: the working explorer)
- Task 15: the summary cards and the settings retention row (depends on: 13, and 5 for the row, hands off: the deep links and the live control)
- Task 16: the Usage menu (depends on: 4, hands off: the menu driving the page)
- Task 17: gate widening, the decision record, and the end-to-end journey (depends on: 14, 15, 16, hands off: the merged-ready branch)

## Risks

- [Risk] A replay path accrues a row twice → Mitigation: the watermark plus the recent-id guard, pinned by the idempotency law and its twin.
- [Risk] The engine's two-phase row commit accrues both phases → Mitigation: the desk tells the observer only on the settled transition, proven in `engine-host-logs.test.ts`.
- [Risk] Sustained load turns the flush into write thrash → Mitigation: the debounce with a ceiling, and buckets bound the document by tuple count rather than by request count.
- [Risk] The tuple space grows the document past comfort → Mitigation: retention prunes on every flush, and the per-month shard escape hatch stands recorded in ADR-0087.
- [Risk] The LiteLLM map changes shape under the fetcher → Mitigation: the validator refuses, the standing copy keeps serving, and misses surface by name rather than as zero.
- [Risk] The equivalent-cost hatch fails the dual-scheme contrast pass → Mitigation: the solid tint carries the 3:1 duty on its own, measured from the page at both named checkpoints, with the legend and the twin carrying the distinction below the minimum bar width.
- [Risk] Quota copy reads as an official quota → Mitigation: every figure carries the approximation prefix and the derivation sentence, asserted verbatim in the browser suite.
- [Risk] Chart-bearing browser specs flake under CI load, the rider #153 signature → Mitigation: the recorded lanes and baseline tolerance govern, stories pin their data, and nothing waits on animation per the reduced-motion posture.
- [Risk] A shortened retention prunes without the person understanding → Mitigation: the consequence flow holds the change until accepted, proven in the data-section browser spec.
- [Risk] The three-way version dance between ring, desk, and renderer caps drifts → Mitigation: the live plane reads the same cache the drawer reads, and the ledger never depends on the ring's depth.

## Migration and rollout

- **Settings.** Version 5 documents migrate to version 6 by adding `usageRetentionDays: 30`, and `settledOnDisk` writes the carried-forward document back. Rolling back to an older build trips the shipped newer-schema refusal, which protects the file rather than quarantining it.
- **Ledger.** `usage.json` is new, opening at schema version 1 with its own migration chain. An older build ignores the file, so rollback orphans it harmlessly, and a newer document meets the `usage-newer-schema` refusal instead of a rewrite.
- **Row widening.** The `usage` field is optional, and both processes ship together in one release, so no cross-version reader exists. Rows logged before this release read as split-less and accrue totals only, which the gap rule already covers.
- **Spec deltas.** The delta narrows the gateway-telemetry cost ban to the footer and the drawer, replaces the stale settings retention scenario with the live control, and resolves the aggregators waiting sentence.
- **Order inside the branch.** Stage one stands. Contracts land next, then the engine touches, then main, then the renderer, then the journey, matching the task order so every merge point stays green.
- **Rollback.** Reverting the branch restores the empty-state page. The ledger file and the settings field stay on disk for the reasons above, named in the release notes.

## Open questions

- The exact primitive values behind the series tokens, the hatch geometry, and the wide measure settle in the recompose-design-system project during tasks 11 and 12, without moving any boundary here.
- The `recentRowIds` guard bound. The guard window is two hours of accrued ids, and the constant tunes during task 6 without changing the law or its tests.
- Whether the bundled price snapshot refreshes per release by hand or through a release-notes checklist step. Either answer lands in the release process, not in this design.
- The default landing range. This design ships `24h`. If pairing review prefers `1h`, the change is one literal in `usage-search.ts` and its spec.

## End-to-end verification

The final check runs in the development app against the mocked upstream, then once packaged. Serve traffic through two gateways on different accounts, one subscription and one keyed. The tiles fill within one poll, the tokens tile names its cached share, and the chart caption states the range, the width, and the UTC rule. Restart the app: every ledger-backed figure returns unchanged, and nothing doubles. Drill from the root to one gateway and reload: the same view stands from the address. Select spend at `24h`: the range snaps to `7d`, billed and equivalent stack on their own labelled lines, and a sub-cent day prints as less than one cent. Shorten retention from 30 to 7 days: the consequence flow holds the change, and after acceptance the chart marks the retention edge. Delete the chart's vector element in devtools: the page still reads complete through the caption, the tiles, and the table twin.

A fresh-context reviewer diffs the result against these criteria:

- closed buckets only at the seam, with no double counting across the planes
- no false zero anywhere, honoring the gap rule
- cost on this screen alone, at day width, in both bases
- quota copy carrying the approximation prefix and its derivation sentence
- the retention control matching the ledger's prune
- the range control never disagreeing with what draws
- both schemes passing the two named contrast measurements
- the accrual laws green in property, twin, and mutation runs
