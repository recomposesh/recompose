# Gateway telemetry design

The gate-1 design document for the gateway-telemetry feature, standard tier, second revision. It folds the fifteen brainstorm decisions, the seventeen findings in `discovery/design-critique.md`, and the four decisions the maintainer locked at the gate on 2026-08-10.

## Why

The canvas made the composition legible, but a running gateway still serves invisible traffic. A person starts a gateway, points a client at it, and reads nothing back. This change gives the gateway detail its live-traffic surfaces: a status footer under the canvas and a logs drawer that opens from the footer. The footer answers whether the gateway is alive and how hard it works. The drawer answers what it just did, request by request. The gateway-canvas design deferred a metrics status bar to its rider ledger, and this change delivers that surface with the log stream beside it.

## What changes

V1 ships the fifteen locked brainstorm decisions below, refined by the gate decisions in the next section.

1. **Cost leaves this slice.** No dollar cell appears anywhere, and the footer's left group ends at tokens per minute. The repository holds no price table, and subscription accounts carry no per-token price. Any figure would read as an estimate at list rates, so the price-table source and the estimate labeling move to a later feature.
2. **A client is a distinct source.** The client count reads distinct request sources seen inside the rolling window, keyed by Internet Protocol (IP) address plus the `User-Agent` header. The metric takes no dependency on a gateway auth layer.
3. **Every aggregate rides one rolling 60-second window.** Requests per minute, tokens per minute, the client count, the error count, and the p95 latency all compute over the same window. The p95 is an exact selection over the window's samples, never a sketch. An empty window reads zeros, and the footer never blanks.
4. **The errors segment hides at zero.** No errors, no segment. Above zero it appears in the danger tint, so its arrival is itself the signal.
5. **The node and wire tally comes from `canvasGraph`.** The derived graph in `pages/gateway-canvas/lib/node-graph.ts` is the one honest source for the footer's right side.
6. **The observation is the row.** `ProviderRequestLog` gains the gateway slug and the virtual model id, so one `ProviderObservation` carries the whole log row with no correlation state. A wall-clock stamp joins at publish time, because `startedAt` reads a monotonic clock. The feed attaches through the non-destructive `subscribe()` and never calls `popOldest` or `clear`, because the management usage queue already drains the buffer through them. Rows leave the engine child on the existing report path, and the main process coalesces them on the established 16 ms cadence. A new `engine:logs` push channel delivers a backfill on subscribe, then bounded append batches.
7. **The renderer computes the footer aggregates from the same rows.** One source feeds both surfaces, and no second metrics contract exists.
8. **The scope selectors are the selection, one mechanism.** A virtual model's selector and its canvas node select the same subject: pressing one selects the node, and selecting the node lights the selector. `All` is the gateway scope. The `Errors` chip is an independent extra narrowing that composes with whatever scope stands. A selected target shows a transient selector carrying its name for as long as the selection holds. The brainstorm drew every selector as a chip, and gate decision G4 redraws the exclusive scopes as a segmented control while the `Errors` chip stays a chip.
9. **Selection scopes the rows.** The gateway shows everything, a selected virtual model shows the requests that passed through it, and a selected target shows the requests that reached it.
10. **Rows read newest at the top, with deep history.** The drawer keeps up to 10,000 rows, matching the engine ring buffer, behind a virtualized list. TanStack Virtual enters as a new dependency, because nothing installed covers list virtualization and the house already rides the TanStack stack. Row keys are stable identifiers, never indexes. The list follows the newest row only while the viewport rests at the top.
11. **The drawer height drags and persists.** The existing panel machinery extends to the drawer: `panelBounds` gains a `logs` entry beside the inspector, and the persisted-width pattern carries the height across sessions.
12. **The drawer is a non-modal disclosure.** The canvas stays live while it stands open, selection keeps working, and focus never traps. A visible, keyboard-reachable close control sits in the drawer. A visually hidden polite live region announces appended rows beside the virtualized list, because `role="log"` and virtualization conflict. Web Content Accessibility Guidelines (WCAG) 2.2 success criterion 2.4.11, focus not obscured, binds the layout.
13. **No prompt or completion bodies ever ride in a row.** The privacy rule on `requestOutcomeSchema` extends to the log stream: failures carry status-derived sentences only.
14. **Copy names the alias a virtual model, never a bare model.** A live indicator sits beside the drawer title while the stream stands connected.
15. **Naming resolves three collisions.** The footer is `traffic-footer`, because `status-bar` names the shipped widget and `toolbar-footer` names the start-failure line under the toolbar. Critique finding 1 sharpens the first collision into a disposition: `traffic-footer` replaces the placeholder `StatusBar` at its gateway-route mount. The drawer is `logs-drawer`, because `gateway-drawer` names the right-side inspector.

## Decisions at the gate

The maintainer returned reject with notes at gate 1 and locked four decisions on top of the fifteen:

- **G1.** This regeneration folds all seventeen critique findings.
- **G2.** Per-role kicker-safe ink tokens enter the theme and the design project on the sibling node-kicker branch. This feature reads them for the segment tint marks.
- **G3.** The footer stays passive, selectable monospace text. A discrete disclosure control at its trailing end opens the drawer.
- **G4.** The scope selectors draw as a `SegmentedControl` holding `All`, one segment per virtual model, and the transient target segment. The independent `Errors` chip sits beside it, and overflow goes behind the house `OverflowMenu`.

## The status footer

The arrangement prose in this section is the sole layout source of truth.

`traffic-footer` replaces the placeholder `StatusBar` at its mount on the gateway route, which today renders hardcoded zeros with a dollar cell. It keeps the shipped rhythm: the `h-status-bar` height, the `bg-surface-toolbar` ground, and the meter and reading ink split. The dollar cell leaves with the replacement, per decision 1. The footer spans the main pane and stops at the inspector's leading edge.

The footer reads as passive, selectable monospace text, never as one large button. A discrete disclosure control sits at its trailing end, sized to the shipped push-button recipe with its hover, active, and focus states. The control carries the stable accessible name `Logs` plus `aria-expanded`, and it opens and closes the drawer. The Gateway menu gains a `Show Logs` checkbox item behind a `Cmd+Shift` accelerator, arriving through the `canvas:command` channel and reading the same visibility store.

Idle, the left cluster reads `0 req/min   p95 0ms   0 client apps`, then a thin vertical separator, then `0 tok/min`. The right cluster reads `0 nodes · 0 wires` in secondary ink, tallied from `canvasGraph`. Under load the left side reads `42 req/min   p95 1.1s   3 client apps | 18.2k tok/min   3 errors`. The error count takes the trailing end of the left side in the danger tint, so its arrival never shoves a neighbor.

The client cell counts distinct client apps. On a loopback gateway every request shares the machine's address, so the key collapses to the `User-Agent` header, and the label says what the cell truly counts. The definition, distinct client apps seen in the last minute, rides the cell's accessible description, the gateway scope's empty-state line, and the `engine-logs` contract docs.

The left cluster recomputes on a one-second display tick that runs while the footer stands mounted. The tick decouples the display from the 16 ms push cadence, so a quiet gateway still decays to zeros and a busy one never repaints per frame. `traffic-aggregates` stays a pure function of the rows and the current instant.

Two formatting rules govern the numbers. Counts above 999 read compact with one decimal, as in `18.2k`. Durations read seconds with one decimal, as in `1.1s`, and an empty window's p95 reads `0ms`.

The loaded footer must fit the 720 px window minimum. Under a container query the right cluster hides first, then `tok/min`, then the p95 cell. `req/min` and the error count go last. The two-scheme page pass verifies the loaded example at 720 px.

## The logs drawer

The drawer is a flex sibling under the stage, never an overlay. Opening it shrinks the stage, and React Flow lays its furniture out again, so the zoom cluster and the minimap stay visible and reachable. Nothing covers focusable content, which satisfies WCAG 2.2 success criterion 2.4.11 by construction. The drawer occupies the canvas column only and stops at the inspector's leading edge, so the footer and the drawer share one span.

The height drags on the top edge through `PanelSeparator`, which gains an `axis` extension (`'inline' | 'block'`), because today the horizontal axis runs through its orientation, arrow keys, pointer reads, cursor classes, and width vocabulary. The bounds field docs generalize with it. `panelBounds` gains the `logs` entry with five named numbers: `min: 160`, `max: 480`, `collapseBelow: 48`, `step: 16`, and `standing: 280`. At 160 the header and four rows still read. At 280 the drawer stands eight rows tall before anybody sizes it. 480 matches the house panel maximum, and the shipped collapse slack and arrow step carry over unchanged. A drag under the collapse threshold closes the drawer and drives the same open state the disclosure control's `aria-expanded` reads.

The header row carries `Logs · <Gateway name>` and a `StatusChip` beside the title: `Live` in the positive tone while the stream stands connected, `Stopped` in the inert tone once the gateway stops. The chip never leaves the reading order. To its right sit the G4 selectors: the `SegmentedControl` with `All`, one segment per virtual model, and the transient target segment, plus the `Errors` chip beside it. Each virtual model segment carries a leading tint mark drawn from its role token, the kicker-safe ink G2 lands in the theme. Segments past the available width go behind the house `OverflowMenu`. The close control ends the row.

The drawer and the inspector both answer the canvas selection, so the arbitration is explicit. A pane click that clears the selection returns the control to `All`, removes the transient segment, and never closes the drawer. Pressing a segment never opens a closed inspector.

## The rows

A row is one upstream attempt, because the observation is the row. A turn that retries across targets writes one row per attempt, adjacent in time and sharing the hashed request identity the engine already stamps. Two gateway-raised outcomes never reach a provider and so produce no observation: the 400 unreadable-request and the 502 unreachable-target outcomes in `gateway-traffic.ts`. Both join the stream as rows, so the footer's error count and a red cable always agree. Such a row carries the gateway slug, the virtual model where the gateway knows it, the status, and the status-derived sentence, and its provider cells read empty.

Rows sit on a fixed grid with a named truncation priority. The time, status, and duration cells never truncate. The model pair truncates the provider model first, and each of its two cells carries a native title with the full text. The provider and account pair truncates from the account end. The virtual model cell prints the id, never the display name. A departed subject prints its raw id in secondary ink, following the ghost vocabulary.

One row reads, in the monospace type: the time as `14:22:09`, the method as `POST`, and `creative → sonnet` as the virtual model id and the provider model it resolved to. Right-aligned, it carries `anthropic · work` as the provider and the account, then the status code, then the duration as `0.9s`. The status cell paints tone ink on the digits with no dot: `200` in the running ink, `429` in the warning ink, and `500` in the danger ink. The digits carry the meaning and the ink reinforces it, so color never stands alone.

A failed row shows no duration. Its duration cell stays visually empty, with a screen-reader-only label reading `no duration`. No glyph fills the cell, because the middle dot already means separator twice in the same row.

The list takes one tab stop. Up and Down move a row cursor, and `Cmd+C` copies the focused row. New rows arrive as bounded batches on the 16 ms cadence and append at the top. The list follows the newest row only while the viewport rests at the top, so reading history never yanks the scroll position. The backfill on subscribe merges by stable row id rather than replacing, because the management usage queue drains the shared ring buffer as it reads. A replace could shrink what a person is reading without a trace, and a merge never can. An empty scope shows the one-line placeholder from the table below, so a filtered-out list never reads as broken.

## The scope table

The scope predicate covers all six `InspectorSubject` kinds. The `Errors` chip composes with every row of this table.

| Subject         | Rows shown                                                      | Lit selector                  | Empty-state line                            |
| --------------- | --------------------------------------------------------------- | ----------------------------- | ------------------------------------------- |
| `gateway`       | Every row                                                       | `All`                         | No requests from any client app yet.        |
| `virtual-model` | Rows that passed through the virtual model                      | Its segment                   | No requests through this virtual model yet. |
| `cable`         | Rows of the virtual model the cable binds                       | That virtual model's segment  | No requests through this virtual model yet. |
| `target`        | Rows whose canvas target identity matches                       | The transient target segment  | No requests reached this target yet.        |
| `ghost-target`  | Rows whose canvas target identity matches the departed identity | A transient `Removed` segment | No requests reached the removed target yet. |
| `draft`         | Every row                                                       | `All` stays lit               | No requests from any client app yet.        |

A sibling change, `gateway-target-identity`, opened on 2026-08-10, redefines the canvas target identity as the account and real model pair rather than the account alone. The `target` and `ghost-target` predicates and the transient segment key off the canvas target identity, whichever shape stands, and never hardcode the account id. The implementer checks which change lands first.

## Names and placement

Every renderer component below sits in the `pages/gateway-canvas` slice, beside the page that owns it, following version 2.1 of Feature-Sliced Design. None lands in `widgets`, because only the gateway detail composes these surfaces. Each `ui` component owns its `ui/<name>/<name>.tsx` folder and ships a stories sibling before the branch leaves the machine.

- `ui/traffic-footer/traffic-footer.tsx`: the status footer, replacing `StatusBar` at its gateway-route mount.
- `ui/logs-drawer/logs-drawer.tsx`: the flex-sibling container, the header row, the selectors, and the resize edge.
- `ui/log-list/log-list.tsx`: the virtualized list, the row cursor, and the hidden live region beside it.
- `ui/log-row/log-row.tsx`: one request row on the fixed grid.
- `lib/traffic-aggregates.ts`: the pure rolling-window math, a function of the rows and the current instant.
- `lib/log-scope.ts`: the pure function that turns the canvas selection and the selector state into one row predicate, per the scope table.

The shared layers gain small, pattern-copying additions:

- `shared/ui/panel-separator`: the `axis` extension and the generalized bounds field docs.
- `shared/api/engine-logs.ts`: `engineLogsQueryOptions` and `bindEngineLogsToCache`, copying the push-fed query-cache pattern in `shared/api/engine.ts`, with the merge-by-row-id backfill.
- `shared/lib/logs-drawer-visibility.ts`: the open state, in the `inspector-visibility` pattern, read by the disclosure control, the separator collapse, and the menu item alike.
- `shared/lib/panel-resize.ts`: `panelBounds` gains the `logs` entry named above.
- `shared/testing`: `emitEngineLogs`, `listenForEngineLogs`, and `forgetEngineLogsListeners` beside the traffic twins, and the fake bridge's frozen event map gains the new channel.

The channel and its contracts follow the traffic precedent:

- `engine:logs` joins `ipcEvents` beside `engine:traffic`, exactly as decision 6 names it, and the preload map exposes it.
- `packages/contracts/src/engine-logs.ts`: `logRowSchema` and `logBatchSchema`, where a batch is either the backfill on subscribe or an append. Its docs carry the privacy rule and the client apps definition.
- `packages/contracts/src/engine-protocol.ts`: a structured log report joins the child-to-parent report union.
- `apps/desktop/src/main/engine-host/logs-ledger.ts`: `openLogsDesk`, the coalescing desk beside `openTrafficDesk`, on the same 16 ms cadence.
- `apps/desktop/src/main/ipc/push-events.ts`: `pushEngineLogs` beside `pushEngineTraffic`.
- The main-process menu template: the Gateway menu gains the `Show Logs` checkbox item on the `canvas:command` channel.

## Design-system gap analysis

The existing system covers most of the surface:

- `SegmentedControl` in `shared/ui` carries the exclusive scopes, `Chip` carries the independent `Errors` narrowing, and `OverflowMenu` carries the segment overflow.
- `StatusChip` in `shared/ui` carries the `Live` and `Stopped` states beside the drawer title.
- `StatusBar` donates the footer's shipped rhythm: the height, the ground, and the ink split survive the replacement.
- The panel machinery in `panel-resize.ts` and `panel-width.ts` extends to the drawer's dragged, remembered height, at the cost of the `PanelSeparator` axis extension.
- The push-fed query-cache pattern in `shared/api/engine.ts` and the 16 ms coalescing desk in `traffic-ledger.ts` give the transport its whole shape.
- The existing type and ink tokens cover the monospace footer and rows. Where this document names a value the scale lacks, the token follows the document, and the design system's source of truth records it first.

The net-new pieces, named so nothing hides in the implementation:

- **The footer strip.** `traffic-footer` inherits the `StatusBar` rhythm, and everything live arrives new: the window math, the tick, the drop order, and the disclosure control.
- **The drawer container.** No bottom flex-sibling panel exists, and the inspector is a side panel with different bounds. `logs-drawer` is new.
- **The virtualized list.** Nothing installed covers list virtualization. `log-list` is new, and it owns the live-region pairing and the row cursor.
- **The log row.** `log-row` is a new monospace grid anatomy with its truncation priority.
- **The transient target segment.** New behavior on `SegmentedControl`: a segment mounted while a target selection holds, carrying the target's name, plus the `Removed` twin for a ghost target.
- **Two ink tokens.** `--color-running-ink` for the green status digits and a `StatusChip` danger tone. Both enter the theme and the design project. The segment tint marks read the per-role kicker-safe ink that G2 lands from the sibling node-kicker branch.

One dependency is net new: `@tanstack/react-virtual`, pinned exact, recorded in an Architecture Decision Record (ADR) with the license sweep. The Mobbin pass in `discovery/mobbin-references.md` corroborates the layout this analysis assumes. That pass settled a bottom panel under the stage, selectors in the header, and a live indicator beside the title. The status code stays the strongest color accent.

## Accessibility commitments

These commitments land in the delta spec's requirements and in review, not as afterthoughts:

- The disclosure control is a real button with the stable name `Logs`, the house hover, active, and focus states, and `aria-expanded`. The footer text itself stays passive and selectable.
- The `Show Logs` menu item gives the drawer a keyboard and menu path that never depends on pointing at the footer.
- The drawer is a flex sibling, so nothing overlays focusable content and WCAG 2.2 success criterion 2.4.11 holds by construction.
- The close control is visible and sits inside the drawer's tab sequence, satisfying the spec's keyboard-reachable close affordance.
- A visually hidden polite live region announces row arrivals, because virtualization breaks `role="log"` announcements. It announces batched summaries, never every row, so a busy gateway stays calm in a screen reader.
- The list is a tab stop with an Up and Down row cursor, and `Cmd+C` copies the focused row.
- The segmented control and the `Errors` chip are keyboard-operable, and decision 8's two-way mirror keeps the keyboard path equal to the pointer path.
- The `Live` and `Stopped` chip keeps the stream state in the reading order instead of vanishing on stop.
- Status meaning never rides on color alone: the code digits carry it, and the tone ink reinforces it.
- Both color schemes get a `claude-in-chrome` pass before any of it lands, including the loaded footer at the 720 px window minimum.

## Privacy commitment

No row ever carries a prompt, a completion, or any request or response body. Failures carry sentences derived from the status alone, extending the rule already written on `requestOutcomeSchema`. The engine hashes request identifiers today, and the client key inherits that discipline: the renderer sees a hash, never an address. The `engine-logs` contract restates the rule and the client apps definition beside the row schema, so the next reader meets both at the type.

## Open questions

Gate 1 carries only questions that don't block, and each one names a recommended default.

1. **Which letter completes the `Show Logs` accelerator?** Default: `Cmd+Shift+L`. The letter reads as logs, and it stays clear of the Canvas menu's zoom keys and Electron's page-zoom roles.
2. **Does the list need a jump-to-newest affordance when the viewport sits away from the top?** Default: ship without it. The viewport stays put by design, and one scroll returns to the top. File it as a rider if use shows the need.

## Capabilities

### New capabilities

- `gateway-telemetry`: the live status footer, the footer-anchored logs drawer, the streaming rows, the scope selectors, and the canvas-selection scoping. The delta spec carries the five requirements.

### Modified capabilities

- None. The gateway-canvas living spec names no footer and no drawer, so both surfaces land as one new capability. The `StatusBar` placeholder this change replaces carries no requirement of its own, and the engine observation gains fields without touching any frozen requirement.

## Impact

The slice crosses every process boundary, and each edge copies a shipped pattern:

- `packages/engine`: `ProviderRequestLog` gains the gateway slug, the virtual model id, and the hashed client key. A wall-clock stamp joins at publish. A non-destructive `subscribe()` consumer feeds the child report path, and the two gateway-raised outcomes join the stream as rows. The engine shares the ring buffer with the management usage drain, so the renderer treats its own cache as the durable copy and merges every backfill by row id.
- `packages/contracts`: the new `engine-logs` module, a log report in the engine protocol, and the `engine:logs` entry in `ipcEvents`.
- Main process and preload: the logs desk beside the traffic desk on the same 16 ms cadence, `pushEngineLogs`, the new channel in the frozen preload map, and the `Show Logs` item in the Gateway menu.
- Renderer: four component folders with stories siblings, two pure lib modules, the `PanelSeparator` axis extension, the `shared/api` and `shared/lib` additions, the `StatusBar` replacement at its gateway-route mount, and the testing twins that stories and browser tests both ride.
- Theme and design project: `--color-running-ink` and the `StatusChip` danger tone land here, and the segment tint marks read the G2 kicker-safe role ink arriving from the sibling node-kicker branch.
- Cross-change order: the sibling change `gateway-target-identity` redefines the canvas target identity as the account and real model pair. The scope predicate keys off that identity either way, and the implementer checks which change lands first.
- `apps/desktop/package.json`: `@tanstack/react-virtual` enters, pinned exact, with an ADR recording the adoption and the transitive license sweep.
- Tests: the e2e suite gains footer and drawer scenarios beside the shipped canvas features, the pure lib modules face the mutation gate, and the two-scheme pass covers the loaded footer at 720 px.
