# usage Specification

## Purpose

A person running gateways all day has no way to answer what they spent, what failed, or which model carried the traffic. The telemetry surfaces answer for one gateway over one rolling minute, and they forget. This surface therefore keeps a ledger of its own. Main accrues every settled row into tuple-keyed hour buckets, prunes to the retention window the settings hold, and answers one range at a time. The screen over that ledger stands as a single explorer. Two filters narrow it, and a window either reaches back a fixed width or takes the edges a person draws on a calendar. Five tiles read the standing window, one chart draws it, and three panels fold it down the domain hierarchy. Every reading also exists as printed text, and missing data reads as missing rather than as zero. Every figure carrying money says which basis priced it.

## Requirements

### Requirement: Main accrues settled rows into a bucketed ledger exactly once

Main MUST keep a usage ledger of tuple-keyed hour buckets in `userData/usage.json`, opened at its own schema version under the shipped atomic-write and quarantine paths. The logs desk MUST tell the ledger each row exactly once, at the moment the row settles, and backfill MUST never reach the observer. A replayed or resent row MUST accrue nothing, guarded by the accrual watermark plus a trailing window of recent row ids. Buckets MUST fold on Coordinated Universal Time (UTC) hour boundaries. The bucket tuple MUST carry the whole domain hierarchy, with every level past the gateway optional. Accrual MUST stamp the account kind into the tuple, so a cost basis survives the account's later deletion or rename.

#### Scenario: a served request accrues once

- Given a running gateway serving a virtual model
- When the gateway serves a request and the row settles
- Then the ledger's bucket for that hour and tuple counts one more request

#### Scenario: a restart replays nothing twice

- Given a ledger holding an hour of served history
- When the app restarts and the engine sends its retained rows again
- Then every ledger figure returns unchanged and nothing doubles

### Requirement: Reports answer closed hours only, and the live plane folds in the renderer

The `usage:report` channel MUST answer one range of closed hour buckets, folded to day width where the ask asks for days, and the hour still filling MUST never ride an answer. The ask MUST carry the range, an optional bucket width, and the reader's own day offset. A window spanning two days or less MUST ask for hour buckets. Every folded day MUST break at the reader's midnight, and an ask naming no offset MUST fold at Coordinated Universal Time (UTC). Each view MUST ask the narrowest range reaching over its window and the window standing before it, because the tiles compare the two. The renderer MUST fold the trailing hour into minute buckets from its own log-row cache through the same accrual rule the ledger uses. The seam between the two planes is a bucket boundary, so no request may count twice across it. Freshness MUST poll rather than push, at the bucket width's own pace.

#### Scenario: a short window asks for hours

- Given a month of served history
- When the person stands the window at the last 24 hours
- Then the ask names hour buckets and the caption says so

#### Scenario: a folded day breaks where the reader lives

- Given a reader whose midnight stands hours off Coordinated Universal Time (UTC)
- When the explorer folds a window into days
- Then each day holds the traffic of that reader's own day

#### Scenario: the live hour never reads from the ledger

- Given a person watching the 1h range
- When a request settles
- Then the reading moves from the renderer's own row cache without a ledger read

### Requirement: One explorer answers every usage question

The usage screen MUST stand as one explorer: a filter bar over the window, five metric tiles reading it, one chart, and three breakdown panels. The panels MUST fold by gateway, by virtual model, and by target. The tiles MUST read rather than steer, and the chart MUST carry its own measure and stacking controls. The requests tile MUST compare its window against the window standing before it, and the errors tile MUST read as a share of the requests beside it. Every reading MUST also exist as printed text: the legend prints each series' window total, and a folded data table prints every bucket the chart draws. The caption MUST name the bucket width and say that days break at the reader's local midnight. The whole view MUST live in typed search params, so a reload lands on the same view and a summary link deep-links through the same address.

#### Scenario: the chart moves without moving the tiles

- Given the tiles headline the standing window
- When the person picks tokens on the chart's own measure control
- Then the chart draws tokens and every tile figure stands unchanged

#### Scenario: a reload lands on the same view

- Given the person filtered to one gateway with the window at 7 days
- When the screen reloads
- Then the same filters, window, measure, and stacking stand

#### Scenario: the table twin prints every reading as text

- Given a drawn chart
- When the person discloses the chart's data table
- Then every bucket the chart draws prints as a row of text values

### Requirement: Filters narrow the window and name what they can reach

The address MUST carry a gateway filter and a provider filter. Each is a list, and each stands empty while it stands on everything. A provider MUST be a connected account rather than a provider kind, which is what the sidebar and the catalog both call a provider. Each menu MUST list the members the standing window served under the other filter, so narrowing one never hides what a person could still reach for. A search matching no member MUST say so rather than standing empty. The sentence under the title MUST name both filters, the window, and the reader's own zone. A window with no traffic MUST name the quiet and offer clearing the filters or widening the window, rather than drawing an empty chart. A summary card reading zero MUST NOT link into the empty view.

#### Scenario: picking a member narrows every reading at once

- Given traffic served through two gateways
- When the person picks one gateway in the filter menu
- Then the tiles, the chart, and every panel read that gateway alone

#### Scenario: a menu lists what the other filter still reaches

- Given the gateway filter stands on one gateway
- When the person opens the provider menu
- Then it lists the accounts that gateway served and nothing else

#### Scenario: a window with no traffic names its recovery

- Given a running gateway that served nothing in the last 7 days
- When the person filters to it over that window
- Then the page names the quiet and offers clearing the filters or widening the window

### Requirement: A window is a preset or a range a person draws

The range control MUST offer the live hour, the last 24 hours, the last 7 days, the last 30 days, and a custom window. A custom window MUST come from a calendar a person draws a range on, with a clock field at each edge. The calendar MUST also offer the standing presets, including this week and this month, which land as custom windows over the reader's own week and month. The calendar grid, its keyboard walk, its month navigation, and its accessible day names MUST come from a library rather than a hand-built grid. The control MUST render segments wider than the retention window inert, with the window named as the reason.

#### Scenario: a drawn range moves every reading

- Given a month of served history
- When the person draws a two-day range on the calendar and applies it
- Then every reading stands over those two days and the header prints both edges

#### Scenario: this week lands on the reader's own week

- Given the window stands at the last 24 hours
- When the person picks This week
- Then the window opens at the local week start and reaches the present

### Requirement: Cost tells the truth about its basis

Cost MUST exist at day width only, priced at answer time in main from the LiteLLM price map. The map refreshes daily, and a vendored snapshot serves a first boot offline. Figures MUST cross the wire as integer micro-dollars. Traffic billed by key MUST price as a billed estimate, and subscription traffic MUST price as an equivalent figure under the approximation prefix. Local traffic MUST carry no cost figure at all. The two bases MUST NOT merge. A sub-cent day MUST print as less than one cent, never as zero dollars. A model the price map can't name MUST surface by name with its request count rather than hiding behind a zero.

#### Scenario: billed and equivalent never merge

- Given a day served through both a keyed account and a subscription account
- When the person reads that day's spend
- Then billed and equivalent print as two labelled figures and nothing adds them together

#### Scenario: selecting spend snaps the range onto day width

- Given the range stands at 24h
- When the person selects the spend tile
- Then the range control moves to 7d and the chart draws spend by day

#### Scenario: a sub-cent day never prints zero dollars

- Given a day whose billed traffic cost less than one cent
- When the person reads that day's spend
- Then it reads as less than one cent

### Requirement: The quota strip claims only what local logs can prove

Per subscription account, the strip MUST show 5-hour and weekly window burn derived from local logs on UTC hour boundaries. Windows MUST fold in time order: one opens at the first activity at or after the previous close and closes a fixed length later. The gauge MUST draw burn on a fixed track and mark the record as a line, so a new record moves the marker instead of rescaling history. A record-breaking window MUST say it's the busiest on record rather than filling the bar. The 5-hour reset countdown MUST carry the approximation prefix, and the weekly gauge MUST show burn without a countdown. The copy MUST name local logs as the derivation and never claim an official quota.

#### Scenario: the gauge fills a fixed track toward the record

- Given a subscription that burned inside the current 5-hour window
- And a larger burn on record from an earlier window
- When the person reads the account's 5-hour gauge
- Then the fill draws the burn with a marker at the record and its date

#### Scenario: every figure names its derivation

- When the person reads the quota strip
- Then the copy names local logs on UTC hour boundaries as the source
- And nothing claims an official remaining quota

### Requirement: An aggregator balance is a reading at a moment

OpenRouter credits MUST print as an account balance beside the instant of the reading, never as a live counter. The desk MUST cache the last good reading, and a failed refresh MUST keep that reading standing beside the failure sentence.

#### Scenario: a failed refresh keeps the last reading

- Given the credits card holds a reading
- And no answer comes back from OpenRouter
- When the person refreshes the card
- Then the last balance stays with its read-at stamp and the card names the failure

### Requirement: Missing data reads as missing, never as zero

While history loads, tiles MUST hold placeholders instead of zeros and the chart MUST draw its furniture without bars. An idle live hour MUST read a true zero. A refused read MUST surface as an inline card that names the failure and offers Retry, on the live plane as much as on the ledger plane. The range control MUST then move to the live plane, so it matches what draws. Range segments wider than the retention window MUST render inert with the window named as the reason.

#### Scenario: a history-backed range loads as placeholders

- Given stored history whose answer takes its time
- When the person selects the 7d range
- Then each tile keeps its label and draws a dash instead of a figure

#### Scenario: a refused read names itself and keeps the control honest

- Given stored usage history the app fails to read
- When the person selects the 7d range
- Then an inline card names the failed read and offers Retry
- And the range control moves to 1h

### Requirement: Retention prunes the ledger to the stored window

The ledger MUST prune on every flush to the retention window the settings document holds. The 30d range MUST render inert when retention holds fewer days, and the chart MUST mark where retained history begins when served history outruns the window.

#### Scenario: the chart marks where retained history begins

- Given served history longer than the retention window
- When the person reads the widest chart
- Then an annotation marks the oldest retained day

### Requirement: A route-scoped Usage menu drives the explorer

While the usage surface stands, the application menu MUST carry a Usage menu. The menu holds the ledger ranges under accelerators, a metric submenu naming the series the chart draws, a checkbox item for the chart's data table, and a Refresh item. Refresh takes its own accelerator and leaves the renderer reload untouched. Menu picks MUST reach the page over the `usage:command` event and travel the same search the on-screen controls write. The page MUST report the data table's standing back over `system:usage-table`, so the tick reads what the person sees.

#### Scenario: a menu pick moves the same address a press would

- Given the usage surface stands at 24h
- When the person picks Last 7 Days from the Usage menu
- Then the explorer reads the last 7 days exactly as if the range control moved

#### Scenario: the metric submenu names only what the chart draws

- When the person opens the metric submenu
- Then it offers the chart's own measures and no reading the chart can't draw

#### Scenario: the data table tick follows the twin

- Given the chart's data table stands closed
- When the person picks Show Data Table from the menu
- Then the twin opens and the menu tick reads on
