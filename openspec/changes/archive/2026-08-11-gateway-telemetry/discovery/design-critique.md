# Design critique (gate-1 input)

Read-only design-critic pass over the first proposal revision, 2026-08-10. Seventeen ranked findings. The maintainer returned reject-with-notes at gate 1 and locked four decisions on top of the fifteen from the brainstorm; the second proposal revision folds every finding below with those decisions.

## Maintainer decisions at the gate (2026-08-10)

- G1. The proposal is regenerated with the critique folded in (reject with notes).
- G2. Per-role kicker-safe ink tokens enter the theme and the design project (runs in the node-kicker branch, but the tokens land in the shared theme this feature also reads).
- G3. The footer stays passive, selectable mono text; a discrete disclosure control at its trailing end opens the drawer (finding 4's fix).
- G4. The scope selectors draw as a SegmentedControl (All, one per virtual model, transient target segment) with the independent Errors chip beside it; overflow goes behind the house OverflowMenu (finding 11's fix).

## Findings

1. `widgets/status-bar` already renders this exact footer at hardcoded zeros on the gateway route, dollar cell included. The proposal must state its disposition: `traffic-footer` replaces it at its mount, keeping the shipped rhythm (h-status-bar, bg-surface-toolbar, meter/reading ink split); the dollar cell leaves with it.
2. An overlay drawer buries the canvas zoom cluster (bottom-left) and the minimap (bottom-right), breaking WCAG 2.4.11, which the proposal itself invokes. Fix: the drawer is a flex sibling under the stage, so the stage shrinks and React Flow re-lays its furniture. This also matches the n8n reference reading in the Mobbin pass.
3. `PanelSeparator` is hardwired to the X axis (aria-orientation, arrow keys, clientX, cursor classes, width vocabulary). Decision 11 therefore costs an `axis` extension ('inline' | 'block'), generalized bounds field docs, and the five named bounds numbers for the logs entry. Drag-to-collapse closes the drawer and drives the same open state the disclosure control's aria-expanded reads.
4. One whole-footer button kills copyability, makes the accessible name volatile noise, and has no specified hover/active/focus states. Resolved by G3.
5. No keyboard or menu path opens the drawer. Fix: a checkbox item in the existing Gateway menu (Show Logs, Cmd+Shift accelerator) through the canvas:command channel, reading the same visibility store.
6. Gateway-raised failures (the 400 unreadable-request and 502 unreachable-target outcomes in gateway-traffic.ts) never produce a provider observation, so the cable can read red while the footer counts zero errors. The proposal must either carry gateway-level outcomes in the stream or name the exclusion out loud and file the reconciliation as a rider. It must also state whether a row is one client request or one upstream attempt, and how retry siblings relate.
7. The scope predicate covers three of six InspectorSubject kinds. The proposal gains a six-row table (subject, predicate, lit selector, empty-state line). Defaults: cable scopes as its virtual model; ghost-target scopes by account id with a transient Removed segment; draft lights nothing and leaves the gateway scope.
8. StatusChip has no danger tone and its positive tone does not paint text green (no --color-running-ink token). The status-code cell uses tone ink on the digits with no dot; the missing tokens (--color-running-ink, a StatusChip danger tone) are named in the gap analysis and enter the theme and the design project.
9. Nothing ticks, so aggregates freeze on a quiet gateway and repaint at 60Hz on a busy one. Fix: the footer's left cluster recomputes on a one-second display tick, decoupled from the 16 ms push cadence, running while mounted; traffic-aggregates stays a pure function of rows and now.
10. The errors segment sits mid-cluster and shoves its neighbors when it appears. Fix: it takes the trailing end of the left cluster, so nothing already on screen ever moves.
11. The chip strip had no overflow story, drew exclusive choices as independent toggles, and lost the canvas tint link. Resolved by G4 plus a leading tint mark on each virtual model segment drawn from the role token.
12. The row anatomy gains: a fixed grid with a named truncation priority (time, status, duration never truncate; the model pair truncates provider-model first, each with a title; provider and account truncate from the account end); the virtual model cell prints the id, not the display name; departed subjects print their raw id in secondary ink following the ghost vocabulary; the list takes a tab stop with an Up/Down row cursor and Cmd+C copies the focused row.
13. The Live indicator must not vanish on stop: StatusChip with word Live (positive) or Stopped (inert) keeps the element in the reading order. The failed row's duration cell stays visually empty with the sr-only no-duration label; the middle-dot marker dies because the glyph already means separator twice in the same row.
14. The loaded footer does not fit the 720 px window minimum. The proposal states the span (the main pane, with the drawer stopping at the inspector's leading edge) and a drop order under a container query: the right cluster hides first, then tok/min, then p95; req/min and errors go last. The two-scheme page pass verifies the loaded example at 720 px.
15. The drawer and the inspector both answer the selection. Arbitration: the drawer occupies the canvas column only; a pane click that clears the selection returns the strip to All, removes the transient segment, and does not close the drawer; pressing a segment never opens a closed inspector.
16. On a loopback gateway the client key collapses to the User-Agent, so the label sharpens to client apps and the definition (distinct client apps seen in the last minute) rides the accessible description, the empty-scope line, and the engine-logs contract docs.
17. The backfill merges by stable row id rather than replacing, because the ring buffer is drained destructively by the management usage queue and a replace can silently shrink what a person is reading. The shared-buffer constraint is stated in Impact.

The critique also noted the proposal cited reference screenshots it disclaims; the second revision drops every "matching the reference" clause in favor of the arrangement prose, which stands as the sole layout source of truth.
