# Usage screen design

The gate-1 design document for the usage-screen feature, revised on 2026-08-11 after the gate-1 critique. It writes up the synthesis the maintainer picked as locked decision 13 and folds every critique finding. The eight blocker-candidates resolve below, each adopted improvement states its decision in place, and the four nits fold into the sections they touched. The discovery arms sit beside it under `discovery/`: `research.md`, `approach-ux-first.md`, `approach-minimal.md`, `approach-data-first.md`, `mobbin-references.md`, `cliproxyapi-research.md`, `rider-ledger.md`, `locked-decisions.md`, and `design-critique.md`.

## Why

The screen already exists as a promise. The sidebar navigates to a live `/usage` route, and the page's empty state says a gateway's rate, latency, tokens, and spend will collect there. Nothing behind that promise exists yet:

- Nothing persists request history. The engine holds a bounded in-memory ring of 10,000 rows, and the management queue eats rows as it reads them. The app can never answer what a machine spent last week.
- The engine parses a six-way token split per dialect and then drops it at the Inter-Process Communication (IPC) boundary. The row that reaches the renderer keeps one total.
- Cost has no home. The gateway-telemetry spec bans a cost figure everywhere, while the usage page's own copy promises spend. Both can't stand.
- The aggregators spec waits on this screen by name: the credential-scoped endpoint returns spend data with nowhere to put it, so "the check waits for the surface that can hold its answer."
- The settings spec describes an inert log-retention row, yet the shipped settings page renders no such row, so the spec already disagrees with the build. The retention control this change adds is new, not a rewiring.

Prior art says the surface earns its keep. Anthropic and OpenAI both ship a first-party usage API over the same skeleton: minute, hour, and day bucket widths with capped counts, and cached tokens broken out from uncached. Request counts sit beside token counts, and cost appears at daily granularity only (`research.md`). The CLIProxyAPI ecosystem grew four companion dashboards the moment upstream removed its built-in statistics, which marks usage visibility as the most demanded capability around this kind of gateway (`cliproxyapi-research.md`).

## What changes

The change lands one vertical: a widened log row from the engine, a persisted usage ledger in main, a pricing pipeline, and three pull channels. On top of those sit the usage explorer screen, compact summary cards that deep-link into it, a new retention control in settings, and three spec amendments. A preparatory extraction stage moves shared log shaping down to lower layers first, carrying one declared behavior change in the shared formatters.

## The picked approach

The candidate panel ran three approaches, and the maintainer picked a synthesis of all three (locked decision 13):

- **The screen comes from approach C** (`approach-ux-first.md`): metric tiles that double as the chart's selector, a hand-rolled Scalable Vector Graphics (SVG) chart with a data-table twin, a hatch-textured equivalent-cost series, a drill-down breakdown table over the domain hierarchy, a quota meter per account with the busiest-window denominator, a two-plane seam between live and ledger data, and six named stories with their states.
- **The data spine comes from approach A** (`approach-minimal.md`): one main-owned `userData/usage.json` hour-bucket ledger, three invoke channels, no push event, group-by folds in the renderer, and day folds in main.
- **The correctness laws come from approach B** (`approach-data-first.md`): settled-once accrual through an observer on the logs desk, a replay guard in a meta record, and property laws destined for tests.

Latency ships as average only, and the tile face and chart caption name the statistic. The footer's p95 and this screen's average then read as different questions rather than different answers. Histograms, time-to-first-token readings, per-status maps, per-client-key maps, a push channel, and monthly shards stay out as recorded escape hatches. The gate-1 critique reshaped the presentation layer throughout this revision, and every locked decision stands.

## The screen

### Anatomy

Reading order, top to bottom:

1. **Window strip.** The range control, a `SegmentedControl` with segments for 1h, 24h, 7d, and 30d, lives in the shell toolbar's trailing slot. Decision: the control that governs every number on the page must stay visible while a two-screen page scrolls, and the shell already owns that slot with the providers route as precedent.
2. **Header and scope path.** The heading stays. Under it, the active scope renders as a path control over the domain hierarchy: gateway, virtual model, real model, provider, account. Pressing a segment truncates the scope to it, and the root segment reads as all traffic and clears every level. Decision: the scope is a hierarchy, a path draws one, and the cascade of removing a level becomes self-evident, which a row of dismissible chips hides.
3. **Quota strip.** The quota and balance section renders above the tiles and the chart. Decision: the 5-hour window carries the page's only deadline, the cited Firecrawl reference orders the current cycle above history, and sitting above the tiles keeps the selector beside the chart it drives.
4. **Metric tiles as the chart selector.** Five tiles form one radio group: requests, tokens, spend, latency, and errors. Each tile names what it prints on its face: a request count, a token total with its cached share, the spend figures over covering days, the average latency labelled as an average, and an error count with its rate line. The tiles adopt the shipped node-card selectable language, with its hover, active, and pressed treatments of a tint border and a glow ring, and the selected tile's label repeats as the chart's series label so the link survives without color.
5. **The time series.** Hand-rolled SVG bars over `d3-scale` band and linear scales. The tokens series stacks uncached input, cached input, and output. The spend series renders real cost as a solid fill and equivalent cost as a solid tint that clears 3:1 on its own, with a diagonal hatch texture overlaid in a contrasting ink, so the texture carries the distinction and the base carries the contrast. The hatch pitch stays fixed in user-space units, and below a named minimum bar width the hatch drops while the legend and the table twin carry the distinction. A printed caption always states the range, the bucket width, the total, the peak, and that day boundaries follow Coordinated Universal Time (UTC). Hovering a bar shows a popover reading with the bucket's printed values, under a pointer cursor. A disclosure reveals the data-table twin: one row per bucket, one column per series.
6. **Breakdown table.** One table groups by the next hierarchy level below the deepest active scope. A group-by control above it regroups without narrowing, the pivot the cited Grok and Cursor references use. Columns carry the name, requests, tokens, spend, and a share meter beside a printed percentage. The numbers stay selectable text, numeric columns right-align in `tabular-nums`, and the drill lives in a trailing chevron control with its own accessible name, such as "Break down by virtual model," so the row never becomes one hit target. A context menu on each row carries the copy and scope acts.

### States

- **Machine-empty.** The existing card stays as the whole body until a first row or bucket exists, copy intact.
- **Scoped-empty.** When the active scope holds no traffic in the range, the chart and table give way to a state that names the scope and offers the recovery: clear the deepest scope level or widen the range. Example copy: "Nothing served through this gateway in the last 7 days." The copy lands as a frozen-set amendment, the process rider #108 established. At the source, a summary card whose own reading is zero renders without its link, so the app stops manufacturing this state.
- **Loading.** Two cases, split. The 1h range reads zeros because the live plane covers it, and a zero there is true. A ledger-backed range renders width-stable placeholders: each tile keeps its label and unit and draws a dash of the figure's own width, the chart draws its axis and caption with no bars, and an indeterminate marker sits inline in the section header. Nothing reflows on arrival, and a false zero never prints.
- **The gap rule.** Minutes older than the oldest held row render as gaps labelled unknown, never as zeros.
- **Ledger refusal.** An inline card names the failed operation and carries a Retry act. The range selection moves to 1h so the control matches what draws. The range control never lies.
- **Balance failure.** The credits card keeps its last read with its staleness stamp, names the failure, and carries a refresh control.
- **Route crash.** Stays with the shipped error page.

### The two-plane seam

The trailing hour computes live in the renderer from the log-row cache the app already fills machine-wide. Everything older comes from the main-process ledger. Reports return closed buckets only, so the open bucket never appears in an answer and the two planes never double count. The seam is a bucket boundary, never a guess.

### Interaction model

Scope lives in typed search params: the range, the selected metric, and one optional param per hierarchy level. The path control writes them, back and forward walk the drill history, and a reload lands on the same view. Compact summary cards on the gateway and provider surfaces deep-link into the pre-filtered page through the same params (locked decision 2).

The spend tile carries one special rule: cost exists only at day width. At a sub-day range the tile face prints today so far and says so. Selecting the tile snaps the range control to 7d unless a day-width range already stands, so the control and the chart never disagree. Ranges map onto the locked bucket ladder: the 1h range folds live rows in the renderer, and the longer ranges pull hour or day buckets from the ledger. Range segments wider than the retention window render inert with the reason named, in the shipped inert-control vocabulary. An annotation on the chart marks the retention edge at the oldest retained bucket. Report freshness is polling through TanStack Query with `staleTime` tied to the bucket width, and one display clock re-derives the tiles and the open bucket on a short tick. No push channel exists.

In a narrow window the page follows the footer's container discipline. The tiles wrap to a two-row grid below a named container width. Breakdown columns leave in a stated order, the share meter first and then tokens, with the name and the spend cell last standing. The chart holds its minimum bar width and drops to fewer buckets rather than thinner bars.

The screen also gets a desktop command surface, mirroring the route-scoped Gateway menu. A Usage menu carries range items under accelerators, a metric submenu, a checkbox item for the table twin, and a Refresh item. Refresh takes its own accelerator while Cmd+R keeps its View-menu meaning, the renderer reload, a stated decision rather than an inherited accident.

### Pattern sources

The Mobbin arm supplies the named references (`mobbin-references.md`): ElevenLabs' clickable stat tiles doubling as the metric selector, Grok's group-by pivot breakdown table, and Cursor's range chips. Firecrawl contributes the per-pool quota gauge with reset copy, whose cycle-above-history order this revision now follows. OpenAI Platform sets the single-page usage precedent and the hover reading that splits tokens. The dominant pattern across all five: one usage explorer with filters and drill-down, never analytics scattered across entity pages.

### Stories and states

Six page stories ship, each with a dark twin: `NothingServedYet` (kept as is), `BusyMachine`, `SpendByDay`, `DrilledIntoGateway`, `QuotaWindows`, and `LedgerRefusal`. The scoped-empty state authors as a variant of `DrilledIntoGateway`, and the `LedgerRefusal` play asserts the Retry act and the range control moving to 1h. The fake bridge and the fake engine pushes grow answers for the three new channels, so stories and browser tests author non-empty states through the existing seams.

## The data spine

- **One store.** Main owns `userData/usage.json`, written through the shipped atomic-write and quarantine paths, with a `schemaVersion` and a migration chain. A shard split into per-month files enters the accompanying Architecture Decision Record (ADR) as a recorded escape hatch, not built now.
- **Buckets.** UTC hour buckets, keyed by the full domain tuple: gateway, virtual model, provider model, provider, and account. The ledger stamps `accountKind` at accrual by resolving the account, so the cost basis survives account deletion or rename.
- **Measures per bucket.** `requests`, `failed`, `answeredCount`, `durationMsSum`, and the six-way token object covering input, output, cache read, cache write, reasoning, and total. `answeredCount` with `durationMsSum` yields the average-latency series, and average is the only latency the ledger serves.
- **Folds.** Day folds from hours in main at answer time, on UTC boundaries, and the screen says so: the chart caption and the quota copy both name UTC, since the logs drawer prints local wall-clock time and the two surfaces must read as different clocks on purpose. Minute never persists: the live plane covers the trailing hour.
- **Channels.** Three invoke channels: `usage:report`, `usage:quota-windows`, and `usage:balances`. The third name settles here as `usage:balances`, over the longer variant one discovery arm used. No push event. The report answers tuple-keyed closed buckets, and the renderer folds every group-by from them, so one response shape serves the tiles, the chart, and the breakdown.
- **Row widening.** `logRowSchema` gains one optional nested `usage` object with input, output, cache read, cache write, and reasoning counts, filled from the split the engine already parses. The existing `tokens` field stays the total, so every shipped consumer keeps reading unchanged.

## The correctness laws

- **Accrual point.** The ledger accrues through an `onRow` observer on the logs desk. The desk already owns the settled and failed authority, including the rows an interrupt rewrites, so main never duplicates that predicate.
- **Replay guard.** A meta record persists `accruedThrough` plus `recentRowIds`. On restart, replayed rows older than the watermark skip, and recent ids skip, so a replay never double counts.
- **Flush cadence.** Writes debounce: a few seconds after the last accrual, a bounded maximum under sustained load, plus a flush on quit and on interrupt.
- **Retention.** The prune runs on load and on every flush, dropping buckets older than the retention window.
- **Forget stays an accounting no-op.** Forgetting a gateway never erases its buckets. Usage is an accounting record, and the breakdown keeps naming the departed slug.
- **Property laws.** Three laws land as property tests, each with a deterministic fixed-value twin per the house mutation rule: conservation (measures summed over buckets equal the same measures summed over rows), order independence (any permutation of the same rows yields identical buckets), and idempotency (accruing a settled row twice equals accruing it once).

## Pricing

- **Source.** The LiteLLM price map (`model_prices_and_context_window.json`), fetched from its raw GitHub address on a 24-hour refresh. The ecosystem treats it as the standard price source (`cliproxyapi-research.md`).
- **Cache and fallback.** The fetched map lands in a userData cache, and a bundled resource snapshot serves a first boot offline. Resolution order: the in-memory copy, then the cache, then the bundle.
- **Where cost computes.** Only in main, at answer time, at daily granularity only. No price ever crosses IPC, no cost figure persists anywhere, and a corrected price recomputes every historical day on the next report.
- **Units.** The report carries cost as integer micro-dollar amounts, so a sub-cent day survives the wire, and the renderer prints a day below one cent as less than one cent, never as zero dollars.
- **Basis split.** API-key and aggregator traffic price as estimated cost. Subscription traffic prices as equivalent cost, always carrying the approximation prefix. Local traffic carries no cost at all. Where both kinds meet, the two figures stack on their own lines under the word labels billed and equivalent, never joined by a plus sign, so nobody reads them as arithmetic.
- **Misses stay visible.** A model the map can't price surfaces by name and request count, never as zero dollars.
- **Provenance.** Every report carries what priced it: the source, synced or bundled, and the fetch time.

## Quota and balances

The quota algebra computes in main, over the ledger plus the retained ring, and answers through `usage:quota-windows`:

- Per subscription account: 5-hour and weekly window burn, the window start, and the account's busiest observed same-length window. The copy names the derivation: hour buckets on UTC boundaries, from local logs, never an official quota.
- The gauge draws a fixed track, fills it with the current burn, and marks the busiest-window record as a line on the track rather than as the track's end, so a new record moves the marker instead of rescaling every earlier reading. The caption prints the absolute record and its date beside the burn, for example "≈ 1.2M tokens this window, against your busiest 5-hour window: 2.0M on 3 August." When the current window is itself the record, the copy says so instead of a full bar claiming exhaustion.
- The 5-hour reset countdown derives from the window anchor and carries the approximation prefix. The weekly gauge shows burn without a countdown, since no honest derivation of the weekly boundary exists.
- OpenRouter credits answer through `usage:balances` with a read-at stamp, so the staleness label is data rather than guesswork, and the card carries the refresh control the failure state also uses.

## Settings

The retention control is new: the settings page renders no retention row today, and the spec's inert-row scenario describes a control the build never rendered. The row lands in the Data section, beside the config folder row. The control is the kit's three-segment `SegmentedControl` offering 7, 30, and 90 days, with 30 the default. `settingsSchema` gains `usageRetentionDays`, constrained to exactly those three values, behind a settings schema version bump with a migration in the existing chain.

Shortening the window is destructive: the prune drops buckets on the next flush, with no undo. The row therefore carries a description naming what a shorter window drops. A shortening that would prune existing buckets confirms through the consequence flow the server section's restart confirmation already ships. The flow holds the change until the person accepts the cost.

## The extraction stage

Before any page work, one extraction stage moves shared shaping down (locked decision 11):

- The footer's reading formatters move to `shared/lib`, with one declared behavior change: the compact count grows a magnitude ladder through k, M, and B, and a second exact formatter with grouping separators lands beside it for tile headlines. The footer's tests update in the same stage, because behavior changed and the test invariant demands it. Compact forms belong to dense cells, and the exact form belongs to headlines.
- The number rules land with the formatters: `tabular-nums` on every figure that ticks or sits in a column, right alignment on numeric table columns, the sub-cent floor from the pricing section, and a named type ramp per region, the mono value ramp for readings and the sans ramp for labels.
- The `requestInFlight` and `requestFailed` predicates plus the traffic aggregates move into a new `entities/request-log` slice, so the footer, the drawer, and the usage page share one error authority. This move is pure, and its tests move without rewriting.
- The two private display-tick hooks generalize into one `shared/lib` hook taking the interval, and both existing call sites adopt it.

## Spec conflicts this delta settles

`research.md` names three conflicts, and each settles in the delta rather than standing silent:

1. **The cost ban narrows.** The gateway-telemetry purpose line "no cost figure appears anywhere" narrows to the footer and the logs drawer. This delta amends that spec, and the usage screen becomes the single cost surface, at daily granularity only.
2. **The retention scenario was already stale.** The settings spec scenario describes an inert log-retention row, and the shipped page renders no such row. The delta replaces the stale scenario with the new live control over `usageRetentionDays`, including its consequence flow.
3. **The aggregators spec gets its answer.** Its waiting sentence resolves: this screen hosts the balance card, and the delta records the home.

## Rider positioning

From `rider-ledger.md`:

- **Issues #44, #47, and #33.** Quota-aware routing, cost-based routing, and auto routing all name per-account usage tracking and a model pricing catalog as shared assets. This change builds both once, as the ledger and the price-map pipeline, and those issues consume them. Nothing here forks their knowledge.
- **Rider #123.** The `subscriptions:activate` channel belongs to a later account-switching surface. The quota section shows per-account figures and grows no activate control, so the rider stays unclaimed.
- **Rider #108.** The precedent shapes both empty states: a state that paints nothing is a defect, and new screen copy is a frozen-set amendment. The shipped machine-empty card stays with its copy intact, and the scoped-empty copy lands through the same amendment process.
- **Rider #140.** The end-to-end traffic dependency: proving token and spend figures in CI rides on the mocked-upstream decision that rider parks.
- **Rider #153.** Its standing test-infra settings bind the visual specs: the recorded baseline tolerance and the test lanes govern how a chart-bearing screen behaves under CI load.

## Design-system gap analysis

The screen composes these `shared/ui` primitives as they stand:

- `SegmentedControl` carries the range picker and the retention control.
- `Badge` marks hierarchy levels in breakdown rows.
- `StatusChip` carries standing marks where a row needs one.
- `Icon` supplies every glyph.
- `PageError` keeps owning route-level crashes.
- The node-card selectable recipe from the theme lends the tiles their hover, active, and pressed treatments.

`Chip` leaves the earlier revision's list: it's a toggle for narrowing lists, and scope removal with a cascade needs the path control below instead.

The screen needs new tokens, recorded in the design project before the components consume them:

- Series colors: `--color-series-input`, `--color-series-cached`, `--color-series-output`, `--color-series-cost`, `--color-series-cost-equivalent`, `--color-series-errors`, and `--color-meter-fill`. Each is a `light-dark()` pair that clears 3:1 against `--color-surface-card` in both schemes, and each stands apart from the domain role tints, because every saturated theme token already carries a domain meaning, teal for gateway among them.
- Hatch geometry: stroke width, pitch, and angle, fixed in user-space units, so one pattern definition serves the chart and any later surface.
- A wider measure token for data surfaces, since the existing column token is a reading measure and a five-column table isn't reading.

Seven components are new to the system, and each lands in the recompose-design-system Claude Design project during implementation:

- **Metric tile.** A selectable stat card with a headline figure and a qualifying line. `SegmentedControl` renders compact text segments, not selectable cards.
- **SVG series chart.** Stacked and hatch-textured bars over band and linear scales. No shared primitive paints a data series, and the home page's ghost graph is page-local decoration.
- **Proportion fill.** One primitive draws magnitude as a fill and serves both gauge shapes, the share meter in the breakdown and the window meter in the quota strip, so one implementation carries one contrast result.
- **Scope path.** A hierarchy path whose segments truncate the scope on press. No primitive draws a path, and the kit's toggle chip carries the wrong semantics.
- **Table shell.** The breakdown table and the data-table twin are two tables on one screen, and one shell keeps them one shape.
- **Disclosure.** The table twin's reveal. The kit has no disclosure primitive.
- **Hover popover.** The chart's bucket reading under the pointer. The kit has no popover primitive.

## Accessibility acceptance

From `research.md` and the critique, written as testable criteria:

- Web Content Accessibility Guidelines (WCAG) success criterion 1.4.11 conformance rides on the "available in another form" clause: every reading prints as text, and the data-table twin carries every bucket value the chart draws. The acceptance test: the page still reads complete with the chart's SVG deleted.
- The chart root is `role="img"` with `aria-labelledby` naming the metric, the scope, and the range.
- Every bar and gauge fill clears 3:1 through its solid base color in both schemes, measured from the page through the house dual-scheme pass. The hatch is a texture over that base, never the fill itself. The pass takes two named measurements: the equivalent series' base fill against `--color-surface-card` in both schemes, and hatch legibility at the 30d bar width in the 720px minimum window.
- Each approximate figure carries a screen-reader text form, so the accessible name reads "about $1.10 equivalent" without leaning on the glyph, and the visible approximation glyph takes full ink at a stated minimum size.
- The drill chevrons and the path segments carry their own accessible names, and the tile radio group is one tab stop with arrow keys inside.
- Reduced motion follows ADR-0079's posture: no entrance animation exists to disable, numbers swap without transition, and bars repaint to their new height without animation.

## Out of scope

Everything decision 13 defers stays out, recorded as escape hatches rather than silent scope:

- latency histograms and percentile series
- time-to-first-token readings
- per-status maps and per-client-key maps or views
- a usage push channel
- monthly shard files
- CSV export
- hourly heatmaps
- editable price overrides
- the models.dev fallback source
- balances beyond OpenRouter
- a weekly reset countdown
- a raw-request table on the page
- local-calendar day folds, with the UTC captions above carrying the honesty until a rider revisits the fold
- minute persistence across restarts
- detached-engine backfill through the management queue

## Capabilities

### New capabilities

- `usage`: the usage ledger with its accrual, retention, and replay guarantees, the pricing pipeline, the quota derivation, the three pull channels, and the usage explorer screen with its accessibility contract.

### Modified capabilities

- `gateway-telemetry`: the cost ban narrows to the footer and the logs drawer, and the log row contract gains the optional usage split object.
- `settings`: the stale inert-row scenario gives way to the new live retention control over `usageRetentionDays`, with its consequence flow.
- `aggregators`: the waiting sentence resolves, and the usage screen's balance card becomes the home for the credential-scoped answer.

## Impact

- `packages/contracts`: `logRowSchema` widens with one optional object, a new usage contracts module lands with cost in micro-dollar units, and the IPC surface gains three invoke channels with their type-level specs.
- `packages/engine`: three small touches carry the parsed usage split from the measure onto the row. The serving path gains no new behavior.
- `apps/desktop` main: a usage desk beside the logs desk, the usage store, the pricing module, the quota algebra, the channel handlers, and the route-scoped Usage menu in the menu template.
- `apps/desktop` renderer: the extraction stage, the rewritten usage page, the new `entities/request-log` slice, typed search params on the route, summary cards on the gateway and provider surfaces, the new token families in the theme, and a stories sibling for every new component.
- Settings: one schema version bump with its migration, and the new retention row with its consequence flow.
- Dependencies: `d3-scale` enters the renderer, and the vendored price snapshot enters the bundled resources.
- One new ADR amends ADR-0016's usage-storage line to the main-owned ledger, records the LiteLLM price source, records poll-over-push, and records the shard split and the other deferrals as escape hatches.
- The end-to-end suite gains one usage journey, riding on rider #140's mocked upstream.
