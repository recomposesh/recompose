# Approach C: experience-first usage explorer

Panel candidate. Start from the screen a person should see, then admit only the data machinery that screen genuinely pulls behind it. Every locked decision (locked-decisions.md) stands; this document varies the HOW.

The core move: the explorer is two data planes stitched into one surface. The trailing hour is computed live in the renderer from the log-row cache that `bindEngineLogsToCache` already fills machine-wide (`apps/desktop/src/renderer/src/app/routes/__root.tsx` binds it app-wide). Everything older is pulled from the main-process bucket ledger. The seam between the planes is a bucket boundary, never a guess, so the ledger contract stays small and the live feel costs no new push channel.

## 1. Screen anatomy, region by region

Route `/usage` (`apps/desktop/src/renderer/src/app/routes/usage.tsx`) keeps `UsagePage` and `PageError` and gains `validateSearch` plus a loader that warms `gatewaysQueryOptions` and `accountsQueryOptions` (the same names the code map lists in `shared/api`).

Reading order, top to bottom:

**Region 1: header and scope bar.** The `h1 Usage` stays. Beside it, a row of dismissible scope chips (one per active scope dimension, each a `Chip` from `shared/ui` with a clear affordance) and the range control, a `SegmentedControl` with segments `1h / 24h / 7d / 30d`. When no scope is set the chip row is absent and the header reads exactly as today. Pattern source: Cursor's `1d/7d/30d` chips (mobbin-references.md).

**Region 2: metric tiles that are the chart's selector.** Five tiles in a `RadioGroup` (same base-ui primitive `SegmentedControl` already wraps, restyled as cards): Requests, Tokens, Spend, Latency, Errors. Each tile prints its range total as the headline plus one qualifying line: Tokens prints the cached share ("31% cached"), Spend prints the split ("$1.84 + ≈ $6.20"), Latency prints "avg" as part of its label, Errors prints the rate. Selecting a tile switches the chart's series. Pattern source: ElevenLabs' clickable stat tiles doubling as metric selector; the Total/Average/Peak framing on Grok.

**Region 3: the time series.** Hand-rolled SVG bar chart (locked decision 10): band scale across buckets, linear scale up, both from `d3-scale`, following the `ghost-graph.tsx` precedent of tokens for every painted value (`var(--color-...)`, `text-caption`, `var(--font-sans)`). When Tokens is selected the bars stack three segments: uncached input, cached input, output (reasoning rides the table twin, not the paint, to keep segment count readable). When Spend is selected, real cost renders solid and equivalent cost renders with an SVG `<pattern>` diagonal hatch so the two never rely on hue alone. Beneath the chart a printed caption line always states range, bucket width, and the range total and peak as text. A disclosure button "View as table" reveals the data-table twin (Region 3b), which is the WCAG 1.4.11 escape hatch: every bucket's numbers in a real `<table>`, one row per bucket, one column per series. The chart root is `role="img"` with `aria-labelledby` naming metric, scope, and range.

**Region 4: breakdown table with hierarchy drill-down.** One table grouped by the next level of the domain hierarchy below the deepest active scope: no scope groups by gateway; gateway scope groups by virtual model; then real model, then provider, then account. Columns: name (with `BrandMark`/`Badge` where the level has one), requests, tokens (total, with the split in the row's detail line), spend (dual semantics per section 4), and a share meter (inline SVG bar with the percentage printed beside it, so the meter is decoration over a printed value). Each row is a button; pressing it appends that level's scope param and the table regroups one level down. Pattern source: Grok's group-by pivot "Usage breakdown" table; StackAI's ranked list driving a detail pane, flattened here into drill-down because the locked IA is a single explorer.

**Region 5: quota and balances.** A titled section listing, per subscription account: brand mark, account name, a 5-hour window meter and a weekly window meter (both `≈`-prefixed), and a reset countdown ("resets in ≈ 2h 10m"). Aggregator accounts with a credential-scoped balance endpoint (OpenRouter) get a credits card printing balance and "read 40s ago" staleness. API-key accounts do not appear here; their story is spend, not quota. Pattern source: Firecrawl's per-pool progress meters with "resets on" copy. Denominator honesty is handled in section 4.

**Region 6: states.**

- Empty: the existing "No requests yet" card stays as the whole body when no row and no ledger bucket exists, copy intact (`usage-page.tsx` already promises rate, latency, tokens, and spend).
- Loading: no spinners. Tiles render zeros immediately from the live cache (the `traffic-footer.tsx` precedent: an idle surface reads zeros instead of hiding); the chart draws its axis with zero-height bars until the ledger answer lands.
- Error: a ledger read refusal renders an inline section card naming the operation ("recompose could not read the usage ledger") while the page falls back to the 1h live range, which needs no ledger at all. Route-level crashes stay with `PageError`.

### Component tree and FSD placement

Every `ui/` component follows `ui/<name>/<name>.tsx` with a `<name>.stories.tsx` sibling.

```
UsagePage                                        pages/usage/ui/usage-page/usage-page.tsx (rewritten)
├── UsageScopeBar                                pages/usage/ui/usage-scope-bar/usage-scope-bar.tsx
├── MetricTiles                                  pages/usage/ui/metric-tiles/metric-tiles.tsx
│   └── MetricTile                               pages/usage/ui/metric-tile/metric-tile.tsx
├── UsageSeriesChart                             pages/usage/ui/usage-series-chart/usage-series-chart.tsx
│   └── UsageSeriesTable (disclosure twin)       pages/usage/ui/usage-series-table/usage-series-table.tsx
├── BreakdownTable                               pages/usage/ui/breakdown-table/breakdown-table.tsx
└── QuotaSection                                 pages/usage/ui/quota-section/quota-section.tsx
    ├── WindowMeter                              pages/usage/ui/window-meter/window-meter.tsx
    └── CreditBalanceCard                        pages/usage/ui/credit-balance-card/credit-balance-card.tsx
```

Page-slice logic (pure, unit-tested):

- `pages/usage/lib/usage-search.ts`: `UsageSearch` type, `narrowedUsageSearch` for `validateSearch` (the `providers.tsx` `narrowedKind` precedent), scope helpers `deepestScopeLevel` and `nextGroupLevel`.
- `pages/usage/lib/live-series.ts`: folds cached `LogRow`s into minute buckets and into the open bucket overlay for longer ranges.
- `pages/usage/lib/series-scales.ts`: the `d3-scale` wiring, so the SVG component stays declarative.

Cross-page pieces (two pages consume them, so they live below the pages layer):

- `entities/request-log/ui/usage-summary-card/usage-summary-card.tsx`: the compact card for the gateway surface. Trailing 7 days: requests, tokens, spend (dual figures), and a TanStack Router `Link` to `/usage` with pre-filled typed search.
- `entities/request-log/ui/usage-summary-figure/usage-summary-figure.tsx`: the one-line variant for the providers page account rows (a separate component, not a boolean prop, per the flag-splitting rule).
- Hosts: `pages/gateway-canvas/ui/subject-bodies/` composes the card into the gateway subject's inspector body; `pages/providers/ui/subscription-account-row/` and `key-account-row/` append the figure.

## 2. Interaction model

**Scope filter lives in typed search params.** `UsageSearch` carries `range`, `metric`, and one optional param per hierarchy level: `gateway`, `virtualModel`, `model`, `provider`, `account`. `narrowedUsageSearch` defaults `range: '24h'`, `metric: 'requests'`, and drops unknown values instead of throwing, matching the `providers.tsx` pattern. Because scope is the URL, the compact cards deep-link with `<Link to="/usage" search={{ range: '7d', gateway: slug }}>`, back/forward walk the drill history for free, and a reload lands on the same view.

**Drill-down.** Pressing a breakdown row navigates with the row's level added to search. The scope bar renders one chip per set level; dismissing a chip removes that level and every level below it (a hierarchy, not a bag of filters). The breakdown always groups by the next level down; at the deepest level (account) the table lists accounts with no further drill and rows stop being buttons.

**Tile as metric selector.** `MetricTiles` is a `RadioGroup` whose value is `search.metric`; arrow keys move between tiles, selection commits through `navigate({ search })` so the chart, table twin, and URL agree. The Spend tile has one special rule from locked decision 5: cost exists only at day width, so selecting Spend always draws day bars over the days that cover the chosen range (a 1h or 24h range draws today plus the six prior days for context) and the caption states "Cost accrues by day". The tile itself stays selectable in every range; the chart, not the tile, changes its unit of time.

**Range switching.** The `SegmentedControl` writes `search.range`. Ranges map to the locked bucket ladder (decision 12, Anthropic's granularity ladder): `1h` reads sixty minute-buckets computed entirely in the renderer from the live row cache; `24h` pulls twenty-four hour buckets; `7d` pulls seven day buckets; `30d` pulls thirty day buckets. Bucket counts are capped by construction because the range picker enumerates them.

**Live ticks, and what holds still.** The page owns one display clock in the `use-canvas-clock.ts` pattern: 1,000 ms in the `1h` range (the `traffic-footer.tsx` `DISPLAY_TICK_MS` cadence, because minute bars visibly move), 10,000 ms otherwise (the canvas cadence, because an hour bar cannot visibly move faster). On each tick the tiles and the rightmost open bucket re-derive from cached rows; closed buckets, the breakdown table, and the quota meters do not re-render on tick (breakdown and quota recompute on the 10 s beat only, and the ledger report refetches only when a bucket boundary passes or scope changes, via TanStack Query `staleTime` equal to the bucket width). Reduced motion: numbers swap without transition and bars repaint to their new height with no animation; there is no entrance animation to disable, which keeps ADR-0079's reduced-motion test posture trivial.

**Keyboard and AT acceptance.** Tab order: range control, scope chips, tile group (one tab stop, arrows inside), chart table disclosure, breakdown rows, quota section. The chart itself is never a tab stop; its information is reachable as text (caption plus table twin). Acceptance: every reading on the page can be read with the chart's SVG deleted, which is the test for the WCAG 1.4.11 "available in another form" clause; bar and meter fills still clear 3:1 against `--color-surface-card` in both schemes, measured from the page.

## 3. Minimum data contract this UX requires from main

The screen needs exactly three pulls and one widened push. Nothing else.

**Widened push (locked decision 9).** `logRowSchema` in `packages/contracts/src/engine-logs.ts` gains one optional object beside the existing `tokens` total:

```
usage: { input, output, cacheRead, cacheWrite, reasoning }  (all nonnegative ints, object optional)
```

Populated in `packages/engine/src/gateway-traffic.ts` from the `ProviderUsage` that `provider-usage.ts` already parses. This is what makes the 1h range, the open-bucket overlay, and the tiles' cached-share line computable in the renderer with no further contract.

**Pull 1: `usage:report` (IPC invoke, registered in `packages/contracts/src/ipc.ts`, handled in `apps/desktop/src/main/ipc/engine-ipc.ts`).**
Request: `{ width: 'hour' | 'day', buckets: number, scope: { gateway?, virtualModel?, model?, provider?, account? }, groupBy?: level }`.
Response: closed buckets only, each `{ bucketStart, requests, errors, inputTokens, cachedInputTokens, cacheWriteTokens, outputTokens, reasoningTokens, answeredCount, durationMsTotal }`, and on `width: 'day'` additionally `{ costCents, equivalentCostCents }`. When `groupBy` is set, the same shape per group key with a display label. The contract shape itself enforces two honesty rules: cost fields do not exist below day width (locked decision 5), and the open bucket is never in the answer, so the renderer's live overlay can never double count. `answeredCount` plus `durationMsTotal` give the avg-latency series; p95 stays a live-window reading only (the extracted `trafficAggregates` provides it for tiles in the 1h range), because storing distributions in the ledger is the first thing this UX refuses to demand.

**Pull 2: `usage:quota-windows`.** Response: per subscription account `{ accountId, fiveHour: { usedTokens, usedRequests, windowStart, resetsAt, busiestUsedTokens }, weekly: { same } }`, all derived in main from the ledger plus the retained ring (locked decision 8). `busiestUsedTokens` is the account's highest observed same-length window, which is the meter's denominator (section 4).

**Pull 3: `usage:aggregator-credits`.** Response: per eligible account `{ accountId, totalCredits, totalUsage, readAt }`, straight off OpenRouter's credits endpoint with `readAt` carried so the staleness label is data, not guesswork.

Granularity the ledger must persist: hour and day buckets only, keyed by the five-dimension tuple, exactly what locked decision 3 already names. Minute granularity is deliberately absent from the persisted contract: the 1h experience runs on the in-memory rows the renderer already holds. Push vs pull: everything historical is pulled on demand; the only push remains the existing `engine:logs` batch. Cost is computed in main at accrual time against the LiteLLM price map (locked decision 7) so no price ever crosses IPC; the report's day buckets simply carry cents.

The panel comparison point: this contract is three invoke channels, one schema widening, and zero new event channels.

## 4. Quota and cost presentation

**Approximation labelling.** One rule, applied everywhere: any figure derived rather than billed carries the `≈` prefix as part of the printed string, never as a detached icon. Equivalent cost, window burn, reset countdowns, and the meter denominators all carry it. Real API-key cost never does. The prefix is text, so it survives copy-paste (the footer's select-text posture) and screen readers.

**Daily-only cost.** Cost appears in exactly three places: the Spend tile, the day-width cost chart, and the breakdown's spend column (which always aggregates whole days of the selected range). No per-bucket cost below day width exists in the contract, so no component can leak one. Footer and log drawer stay cost-free; the delta narrows the gateway-telemetry ban rather than deleting it (locked decision 5).

**Subscription vs API key.** Dual semantics (locked decision 6) render as two visually distinct treatments that never merge into one number:

- Tile: `$1.84` headline (real, key traffic), `≈ $6.20 equivalent` second line (subscription traffic). No combined total is ever printed.
- Chart: solid fill for real cost, diagonal-hatch `<pattern>` fill for equivalent, legend printing both labels with the `≈` on the equivalent one. The hatch plus printed legend means the distinction survives monochrome and both schemes.
- Breakdown cells: `$0.42` for key-served groups, `≈ $1.10` for subscription-served groups, and `$0.42 + ≈ $1.10` where a group spans both kinds.

**Window meters without a fabricated limit.** No first-party quota API exists (research.md), so the meter never claims official remaining quota. The fill denominator is the account's own busiest observed window, and the caption says so: "≈ 62% of your busiest 5-hour window". The countdown prints `resets in ≈ 2h 10m` from the derived `windowStart`. The OpenRouter credits card is the one non-approximate quota figure and instead carries staleness: "read 40s ago", refreshed on a 60 s interval, matching the documented cache behavior.

## 5. Stories and verification plan

**Stories.** Every new `ui/` component ships its stories sibling (push gate `pnpm run lint:stories`). Non-empty states are authored through the existing seams in `shared/testing/fake-engine-pushes.ts` (`emitEngineLogs`, `replayEngineLogs`) and `installFakeBridge` parameters, which grow answers for the three new invoke channels. Principal page stories, each with a dark twin per the `usage-page.stories.tsx` house shape (`NothingServedYet` + `DarkScheme`):

- `NothingServedYet` (kept as is).
- `BusyMachine`: backfill of rows across two gateways with token splits, failures, and both account kinds; play asserts the tiles print the folded numbers.
- `SpendByDay`: fake-bridge `usage:report` day buckets with both cost kinds; play asserts the `≈` prefix appears on equivalent figures and never on real ones.
- `DrilledIntoGateway`: mounted with scope search set; play asserts chips and the regrouped table.
- `QuotaWindows`: fake `usage:quota-windows` plus a stale credits answer; play asserts the denominator caption and the staleness line.
- `LedgerRefusal`: bridge answers a refusal; play asserts the inline error card and that the 1h live fallback still reads values.

**Dual-scheme verification.** Per the house rule, every landing surface is inspected through `claude-in-chrome` in both schemes, measuring from the page: bar fill vs `surface-card` contrast at or above 3:1 in each scheme (1.4.11), hatch pattern legibility on the dark surface, and the table twin actually containing every bucket value the chart draws. Chromatic being quota-dead (project memory), this local dual-scheme pass is the visual gate.

**Browser tests.** `usage-page.browser.test.tsx` grows Given/When/Then specs through `renderAt('/usage', parameters)`: rows pushed then tiles read; tile selection then table-twin series switches; breakdown row pressed then URL scope and regrouping; range switched then bucket caption changes; refusal then fallback. State-based, asserting printed values only.

**E2E sketch.** One scenario in the existing suite: Given a running gateway serves a request through a subscription target, When the user opens Usage from the sidebar, Then the Requests tile reads one request and the spend line carries the approximation mark; When the user presses the gateway row, Then the address carries the gateway scope and the breakdown lists its virtual models. Written under `playwright-best-practices` plus `gherkin-best-practices` as mandated.

## 6. Preparatory extraction from gateway-canvas

Locked decision 11, executed as the first commit series, behavior unchanged, so tests move rather than change:

- `pages/gateway-canvas/ui/traffic-footer/footer-readings.ts` (`compactCount`, `readDuration`, `pluralized`) moves to `shared/lib/readings/readings.ts`. Tiles, breakdown, meters, and the summary card all print through these three, so units match the footer everywhere.
- `pages/gateway-canvas/lib/log-scope.ts` splits: the row predicates `requestInFlight` and `requestFailed` move to `entities/request-log/lib/request-standing.ts` (the single error authority the usage error counts must share); `LogSubject` and `logScope` stay in the canvas slice, rewritten to import the moved predicates, because subject kinds like `cable` and `ghost-target` are canvas vocabulary.
- `pages/gateway-canvas/lib/traffic-aggregates.ts` moves to `entities/request-log/lib/traffic-aggregates.ts` (it depends on `requestFailed`), and `traffic-footer.tsx` re-imports it. The summary card and the 1h tiles reuse it directly.
- The two private tick hooks (`useDisplayTick` in `traffic-footer.tsx`, `use-canvas-clock.ts`) generalize into `shared/lib/use-display-tick.ts` taking the tick interval; both existing call sites adopt it.

Steiger's layer rules then hold with no cross-page import: usage page, canvas page, and providers page all reach the shared shaping through `entities/request-log` and `shared/lib`.

## 7. Risks: where UX ambition could inflate the data layer, and the cut order

The standing risk of an experience-first approach is that a nice-to-see reading quietly becomes a persisted dimension. Named, with the order I would cut:

1. **Ledger tuple cardinality.** Five-dimension bucket keys are the one place this UX could bloat main. Mitigation is already in the design (hour/day only, minute never persisted); if buckets still grow too many tuples, the first cut is the `24h` hour-bucket range, leaving `1h` live plus `7d/30d` day buckets.
2. **Latency history.** `answeredCount` and `durationMsTotal` are cheap, but if even that is contested, cut the latency series entirely; the Latency tile becomes live-window-only (it already is in the 1h range) and the placeholder's "latency" promise is still kept.
3. **Cost stacking in the chart.** If dual-series day bars prove fussy, cut to a single real-cost series with the equivalent figure living only in tiles, table twin, and breakdown cells; dual semantics survive as text.
4. **Window meter denominators.** If the busiest-window scale reads as too clever, cut the fill bar and keep printed burn plus countdown, which is the honest core of locked decision 8.
5. **The providers-page summary figure.** Cut it and keep only the gateway card; the deep link from the providers page degrades to nothing lost but convenience.

What never gets cut: the table twin (it is the accessibility conformance strategy, not a garnish), the `≈` prefix rule, and the closed-buckets-only report contract (it is what keeps live and ledger from double counting).

Two smaller honesty risks, both handled: the 10,000-row ring (`HELD_ROWS` in `shared/api/engine-logs.ts`) can cover less than an hour under heavy load, so minute buckets older than the oldest held row render as gaps labelled unknown, never as zeros; and equivalent-cost figures could be misread as bills, which the permanent `≈` prefix and the never-merged totals answer by construction.

## SCORES

Scale: 1 to 5, where 5 is best for that quality.

| Criterion           | Score | One sentence                                                                                                                                                                                          |
| ------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Simplicity          | 3     | Many small components, but each is thin, the page logic is pure functions, and the two-plane data model replaces any new push machinery with one seam rule.                                           |
| Blast radius        | 3     | Touches contracts, main IPC, an engine field fill, one new entity slice, and three pages, yet the serving path itself only gains fields it already computes.                                          |
| Honesty of readings | 5     | Approximations are prefixed in the string, cost cannot exist below day width by contract shape, unknown minutes render as gaps, and meters name their own denominator.                                |
| Forward flexibility | 4     | Scope-in-URL plus a group-by report absorbs heatmaps, CSV export, and per-client views without contract rework; hand-rolled SVG is the one ceiling.                                                   |
| Implementation cost | 2     | This is knowingly the expensive candidate: tile radiogroup, chart plus table twin, drill-down table, quota section, and two host surfaces are real renderer work even with the extraction done first. |
