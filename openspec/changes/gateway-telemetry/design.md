# Solution design

## Header and change linkage

- Change id: gateway-telemetry
- Schema: recompose
- Proposal: [proposal.md](proposal.md)
- Specs: [specs/gateway-telemetry/spec.md](specs/gateway-telemetry/spec.md)
- Discovery: [discovery/](discovery/)
- Tasks: None

## Context

A running gateway serves traffic the screen never shows. The engine already records almost every fact this feature needs: `provider-observability.ts` keeps a ring buffer of per-request observations, and `gateway-traffic.ts` notes each serving turn's outcome. Nothing carries those facts to the renderer as history, and the gateway route's `StatusBar` renders hardcoded zeros. This design turns the recorded facts into two surfaces on the gateway detail: the `traffic-footer` strip that aggregates the last minute, and the `logs-drawer` that streams request rows under the stage. The approved proposal fixes the behavior. This document fixes the build: contracts, module cut, interfaces, tests, and rollout.

## Discovery inputs consumed

- `discovery/research.md` hazard 1: the ring buffer drains destructively through the management usage queue, so the feed attaches with `subscribe()` and decision 3 makes the renderer cache the durable copy.
- `discovery/research.md` hazard 2: `startedAt` is monotonic, so the row gains a wall-clock stamp at publish time.
- `discovery/research.md` hazard 3: the traffic contract and the observations use different time bases, so no code joins them by timestamp.
- `discovery/research.md` hazard 4: the privacy docstring on `requestOutcomeSchema` extends verbatim to the `engine-logs` contract docs.
- `discovery/research.md` section 5: the 16 ms coalescing cadence carries over, and the snapshot shape doesn't, so the channel pushes batches.
- `discovery/research.md` section 6: `role="log"` conflicts with virtualization, so a hidden polite region announces batched summaries.
- `discovery/code-map.md`: the file map below cites its entries, and the push-fed query-cache pattern in `shared/api/engine.ts` shapes `engine-logs.ts`.
- `discovery/design-critique.md`: all seventeen findings fold in as the proposal records, and findings 3, 6, 9, and 17 each fix a section below.
- `discovery/brainstorm-decisions.md` and `discovery/mobbin-references.md`: consulted, no impact beyond what the approved proposal already carries.

## Goals and non-goals

**Goals:**

- One row shape carries every request fact from the engine to the renderer, with no correlation state.
- The footer computes its aggregates in the renderer from the same rows, over one rolling 60-second window, on a one-second display tick.
- The drawer streams up to 10,000 rows, newest at the top, behind a virtualized list with stable keys.
- The scope selectors and the canvas selection stay one mechanism across all six subjects.
- The footer's error count and a red cable never disagree.

**Non-goals:**

- No cost cell, no price table, and no spend estimates.
- No second metrics contract: the engine ships rows, never aggregates.
- No change to the management usage queue, its endpoint, or its destructive drain.
- No log persistence to disk and no export: the stream lives and dies with the process.
- No detail pane per row and no jump-to-newest control: both wait for riders.
- No router awareness: the scope vocabulary covers the six subjects that exist today.

## Constraints and invariants

Project rules, binding verbatim:

- TypeScript maximum strictness, always: `strict: true` plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noPropertyAccessFromIndexSignature`. No `any`, no `as` casts to silence errors.
- Never write code comments. Code explains itself through naming and structure.
- The `feature-sliced-design` decision tree places every renderer file, and a new `ui/` component owns a folder with its `*.stories.tsx` sibling.
- Never disable, override, loosen, or silence any gate.
- Test code changes if and only if behavior changes.
- User-facing copy names the alias a virtual model, never a bare model.
- Anything that reaches the screen gets looked at through `claude-in-chrome`, in both schemes, before it lands.

Feature invariants:

- The telemetry feed never calls `popOldest` or `clear`. Only `subscribe()` attaches.
- No row ever carries a prompt, a completion, or any body. Failures carry status-derived sentences only.
- The renderer sees a hashed client key, never an address.
- Every request that fails lands as exactly one row: a provider failure through its observation, a gateway-raised failure through its outcome.
- `traffic-aggregates.ts` and `log-scope.ts` stay pure functions with no clock, no store, and no channel.
- The list follows the newest row only while the viewport rests at the top.

## Design

### One row shape flows one way

The engine threads the gateway slug, the virtual model id, and the hashed client key into the observation as one grouped `servedFor` fact, and stamps `Date.now()` at publish. `gateway-app.ts` derives the client key where the request arrives, hashing the source address and the `User-Agent` header with the existing digest. `watchingTraffic` threads the grant's gateway and virtual model into the provider call, so one observation carries the whole row. The two gateway-raised outcomes that never reach a provider, the 400 unreadable-request and the 502 unreachable-target, publish rows on the same feed with empty provider fields. No other outcome publishes, because every provider outcome already has its observation, which keeps one row per request.

### The transport copies the traffic ledger's cadence, not its shape

`engine-child.ts` subscribes non-destructively and turns each published row into a log report on the parent port. `logs-ledger.ts` in the main process opens a logs desk beside the traffic desk: it buffers rows and flushes at most once per `TRAFFIC_PUSH_MS`. `pushEngineLogs` sends each flush as an append batch on `engine:logs`. A fresh subscriber receives the buffer as chunked backfill batches first. The renderer's `bindEngineLogsToCache` merges every batch into the query cache by row id, caps the cache at 10,000 rows, and never replaces wholesale.

### The footer reads the rows on its own clock

`traffic-aggregates.ts` is a pure function of the rows and the current instant. It counts requests, tokens, distinct client keys, and errors over the trailing 60 seconds, and selects the exact p95 from that window. `traffic-footer` calls it on a one-second tick that runs while mounted, so a quiet gateway decays to zeros and a busy one repaints once per second. The right cluster counts `canvasGraph` nodes and edges directly. The strip replaces `StatusBar` at its `__root.tsx` mount and moves inside the page, keeping the shipped rhythm classes.

### The drawer is a flex sibling with one open state

`logs-drawer` renders under `GatewayStage` inside the page column. One external store, `logs-drawer-visibility.ts`, feeds the disclosure control, the `Show Logs` menu item over `canvas:command`, and the drag-to-collapse path. `PanelSeparator` gains the `axis` extension and drives the height against `panelBounds.logs`. The header composes the title, the `StatusChip` stream state, the `SegmentedControl` scopes with the `Errors` chip, the `OverflowMenu` overflow, and the close control.

### Scoping is one predicate

`log-scope.ts` turns the canvas subject and the errors toggle into a single row predicate, exactly as the proposal's scope table states. Target and ghost-target matching isolates behind one identity function, so the sibling `gateway-target-identity` change lands on either side without reshaping the predicate. `log-list` renders the filtered rows through `useVirtualizer` with row ids as keys. It holds the viewport on prepend unless it rests at the top, and it feeds the hidden polite live region with batched summaries.

## Data model and contracts

### Entities

- `LogRow` in `packages/contracts/src/engine-logs.ts`: `{ id, at, gateway, virtualModel?, origin, method, provider?, accountId?, providerModel?, status, durationMs?, tokens?, clientKey, failure? }`. `origin` reads `'provider' | 'gateway'`. `virtualModel` is absent only on the unreadable-request row. `failure` carries the status-derived sentence, never body text.
- `LogBatch`: `{ kind: 'backfill' | 'append', rows: readonly LogRow[] }`. Backfill arrives as bounded chunks, and their union equals the engine buffer at subscribe time.
- `TrafficAggregates` in `lib/traffic-aggregates.ts`: `{ requestsPerMinute, tokensPerMinute, clientApps, errors, p95Ms }`.
- `panelBounds.logs`: `{ min: 160, max: 480, collapseBelow: 48, step: 16, standing: 280 }`.

### State transitions

- The stream connects on gateway start: backfill batches arrive, then appends. The header reads live.
- The gateway stops: no batch arrives, the header reads stopped, and the cached rows hold.
- The gateway restarts: a new backfill merges by row id into what the cache holds, and nothing a person saw disappears.
- The cache exceeds 10,000 rows: the oldest rows leave, mirroring the engine ring buffer.

### Channel and storage contracts

- `engine:logs` joins `ipcEvents` as a renderer-bound push channel carrying `LogBatch`, beside `engine:traffic`.
- A log report joins the child-to-parent union in `engine-protocol.ts`, carrying rows from the child to the logs desk.
- The drawer height persists through the shipped `panel-width` store under the `logs` panel name. View state per the established rule: a missing value falls back to `standing`.
- The `engine-logs` docs carry the privacy rule and the client apps definition verbatim.

## Error handling

- A provider failure is a typed row: `status` and the status-derived `failure` sentence, with no duration. The row renders the danger ink and the empty duration cell.
- A gateway-raised failure is a typed row with `origin: 'gateway'` and empty provider fields. It counts in the footer's errors, so the cable and the footer agree.
- A stopped gateway is a state, not an error: the `StatusChip` reads stopped, and the rows stay.
- A batch that fails schema parse never reaches the cache: the bind path drops it and reports through the established invalid-push handling, so a malformed push can't blank the drawer.
- An unknown canvas subject narrows nothing: `log-scope.ts` returns the gateway predicate, so a future subject kind degrades to showing more, never to an empty lie.
- A clipboard copy that the platform refuses leaves the list state unchanged and surfaces nothing: the row cursor holds.

## File map

Engine and contracts:

- `packages/contracts/src/engine-logs.ts`: `logRowSchema`, `logBatchSchema`, privacy and client apps docs (create)
- `packages/contracts/src/engine-protocol.ts`: the log report joins the child report union (modify)
- `packages/contracts/src/ipc.ts`: `ipcEvents` gains `engine:logs` (modify)
- `packages/contracts/src/index.ts`: barrel export for `engine-logs` (modify)
- `packages/engine/src/provider/provider-observability.ts`: the observation gains the grouped `servedFor` fact (gateway, virtual model, client key), and publish stamps the wall clock (modify; the serving turn split into `serving-turn.ts` under the line budget)
- `packages/engine/src/gateway-traffic.ts`: threads the grant's gateway and virtual model into the observation, and publishes the two gateway-raised outcome rows (modify)
- `packages/engine/src/gateway-app.ts`: derives the hashed client key from the inbound request (modify)
- `packages/engine/src/engine-child.ts`: subscribes non-destructively and reports rows to the parent port (modify)

Main process and preload:

- `apps/desktop/src/main/engine-host/logs-ledger.ts`: `openLogsDesk`, the 16 ms coalescing desk with chunked backfill (create)
- `apps/desktop/src/main/engine-host/engine-host.ts`: routes log reports through the logs desk (modify)
- `apps/desktop/src/main/engine-host/engine-host-types.ts`: `EngineHostDeps` gains the logs push callback (modify)
- `apps/desktop/src/main/ipc/push-events.ts`: `pushEngineLogs` beside `pushEngineTraffic` (modify)
- `apps/desktop/src/main/index.ts`: wires the logs push into the engine host (modify)
- `apps/desktop/src/main/menu/app-menu-template.ts`: the Gateway menu gains the `Show Logs` checkbox item (modify)
- `apps/desktop/src/preload/index.ts`: the event bridge gains `engine:logs` (modify)

Pages layer, slice `gateway-canvas`:

- `apps/desktop/src/renderer/src/pages/gateway-canvas/lib/traffic-aggregates.ts`: the pure rolling-window math (create)
- `apps/desktop/src/renderer/src/pages/gateway-canvas/lib/log-scope.ts`: the pure subject-to-predicate function with the isolated target identity (create)
- `apps/desktop/src/renderer/src/pages/gateway-canvas/ui/traffic-footer/traffic-footer.tsx`: the footer strip with tick, drop order, and disclosure control, with stories sibling (create)
- `apps/desktop/src/renderer/src/pages/gateway-canvas/ui/logs-drawer/logs-drawer.tsx`: the flex-sibling container, header, selectors, and resize edge, with stories sibling (create)
- `apps/desktop/src/renderer/src/pages/gateway-canvas/ui/log-list/log-list.tsx`: the virtualized list, row cursor, and live region, with stories sibling (create)
- `apps/desktop/src/renderer/src/pages/gateway-canvas/ui/log-row/log-row.tsx`: one request row on the fixed grid, with stories sibling (create)
- `apps/desktop/src/renderer/src/pages/gateway-canvas/ui/gateway-canvas-page/gateway-canvas-page.tsx`: composes the footer and the drawer under the stage (modify)
- `apps/desktop/src/renderer/src/pages/gateway-canvas/testing/gateway-canvas.testkit.ts`: seeds gain log rows (modify)

Shared and app layers:

- `apps/desktop/src/renderer/src/shared/ui/panel-separator/panel-separator.tsx`: the `axis` extension (modify)
- `apps/desktop/src/renderer/src/shared/ui/status-chip/status-chip.tsx`: the danger tone and the positive tone ink (modify)
- `apps/desktop/src/renderer/src/shared/api/engine-logs.ts`: `engineLogsQueryOptions` and `bindEngineLogsToCache` with the merge (create)
- `apps/desktop/src/renderer/src/shared/api/index.ts`: barrel export (modify)
- `apps/desktop/src/renderer/src/shared/lib/logs-drawer-visibility.ts`: the one open state (create)
- `apps/desktop/src/renderer/src/shared/lib/panel-resize.ts`: `panelBounds` gains the `logs` entry (modify)
- `apps/desktop/src/renderer/src/shared/lib/index.ts`: barrel export (modify)
- `apps/desktop/src/renderer/src/shared/testing/fake-gateways.ts`: `emitEngineLogs`, `listenForEngineLogs`, `forgetEngineLogsListeners` (modify)
- `apps/desktop/src/renderer/src/shared/testing/fake-bridge.ts`: the frozen event map gains `engine:logs` (modify)
- `apps/desktop/src/renderer/src/shared/testing/index.ts`: barrel export (modify)
- `apps/desktop/src/renderer/src/app/routes/__root.tsx`: the conditional `StatusBar` leaves, and the logs push binds in the mount effect (modify)
- `apps/desktop/src/renderer/src/app/styles/theme.css`: `--color-running-ink` and the danger tone tokens (modify)
- `apps/desktop/src/renderer/src/widgets/status-bar/`: retires with its mount (delete)

Manifest, gates, and end-to-end:

- `apps/desktop/package.json`: gains `@tanstack/react-virtual` pinned exactly (modify)
- `apps/desktop/stryker.config.json`: the mutate list gains the pure pair (modify)
- `.github/workflows/ci.yml`: the mutation diff glob widens to the same files (modify)
- `apps/desktop/e2e/features/gateway-telemetry/`: the eight feature files graduate unchanged (create)
- `apps/desktop/e2e/steps/gateway-telemetry-*.steps.ts`: one step file per feature file (create)
- `docs/adr/XXXX-the-log-list-adopts-tanstack-react-virtual.md`: the adoption record, numbered at implementation (create)

## Interfaces

Consumes:

- `providerObservability().subscribe(listener)` and `ProviderRequestLog` from `packages/engine/src/provider/provider-observability.ts`
- `watchingTraffic`, `NoteTraffic` from `packages/engine/src/gateway-traffic.ts`, and `SpendGrantFor` from `packages/engine/src/gateway-app.ts`
- `ipcEvents` from `packages/contracts/src/ipc.ts`, and `TRAFFIC_PUSH_MS` from `apps/desktop/src/main/engine-host/traffic-ledger.ts`
- `canvasGraph`, `CanvasGraph` from the slice's `lib/node-graph.ts`, and `subjectOf` with `InspectorSubject` from `canvas-wiring.ts` and `gateway-drawer.tsx`
- `SegmentedControl`, `Chip`, `StatusChip`, `OverflowMenu`, `PanelSeparator` from `shared/ui`, and `panelBounds`, `subscribeToPanelWidths` from `shared/lib`
- `useVirtualizer` from `@tanstack/react-virtual`

Produces:

- `logRowSchema`, `LogRow`, `logBatchSchema`, `LogBatch` from `packages/contracts/src/engine-logs.ts`
- `trafficAggregates(rows: readonly LogRow[], now: number): TrafficAggregates` from `lib/traffic-aggregates.ts`
- `logScope(subject: LogSubject, errorsOnly: boolean): (row: LogRow) => boolean` and `LogSubject` from `lib/log-scope.ts`
- `engineLogsQueryOptions(slug: string)` and `bindEngineLogsToCache(queryClient: QueryClient): () => void` from `shared/api/engine-logs.ts`
- `logsDrawerOpen(): boolean`, `toggleLogsDrawer(): void`, `closeLogsDrawer(): void`, `subscribeToLogsDrawerVisibility(listener: () => void): () => void` from `shared/lib/logs-drawer-visibility.ts`
- `emitEngineLogs(batch: LogBatch): void`, `listenForEngineLogs`, `forgetEngineLogsListeners` from `shared/testing`
- `openLogsDesk(push: (batch: LogBatch) => void): LogsDesk` from `apps/desktop/src/main/engine-host/logs-ledger.ts`

## Decisions

One numbered block per choice. A decision that meets the Architecture Decision Record (ADR) bar carries its draft.

### 1. The log list adopts `@tanstack/react-virtual`

Ten thousand monospace rows need virtualization, nothing installed provides it, and the house already rides the TanStack stack. The library is headless, so the design system keeps owning every painted pixel.

**Alternatives considered:** hand-rolled windowing, rejected because scroll anchoring and measurement caching are exactly the hard parts a maintained library owns. `react-window`, rejected because it brings its own components rather than headless hooks and sits outside the adopted stack.

**ADR draft:** landed as `docs/adr/0086-the-log-list-adopts-tanstack-react-virtual.md` at the gate-2 close (0085 rides the open toolbar-drag pull request). Draft content:

> **Status:** Proposed.
> **Context:** The logs drawer lists up to 10,000 streaming rows, newest at the top. Rendering them all breaks the frame budget, and nothing installed covers list virtualization. The repository already depends on TanStack Router, Query, and Form.
> **Decision:** Adopt `@tanstack/react-virtual`, pinned exactly, as the virtualization engine for `log-list`. Row keys are stable row ids, never indexes. The list follows the newest row only while the viewport rests at the top, and prepend stability is this feature's own code.
> **Consequences:** One new dependency, `MIT` licensed with no transitive additions, enters the license sweep. The documented chat pattern anchors to the end, so the newest-at-top orientation takes the less-paved path, covered by a browser test that proves the viewport holds on prepend. Virtualization breaks `role="log"`, so a hidden polite live region announces batched arrivals.

### 2. Gateway-raised outcomes publish rows on the observation feed

The 400 unreadable-request and the 502 unreachable-target outcomes never produce an observation, so a drawer fed by observations alone would count zero errors while a cable reads red. These two outcomes publish rows themselves, and no other outcome does, because every provider outcome already has its observation. One request, one row, no correlation state.

**Alternatives considered:** naming the exclusion and filing a rider, rejected because the surfaces would disagree from day one. Correlating outcomes with observations after the fact, rejected because the per-turn grant exists to avoid exactly that ordering problem.

**ADR draft:** none, the frozen decision 6 architecture carries it.

### 3. The renderer cache is the durable copy, and backfill merges by row id

The management usage queue drains the engine ring buffer destructively, so the buffer can shrink behind the drawer's back. A backfill that replaced the cache would remove rows a person is reading, without a trace. The bind merges every batch by row id and caps the cache at 10,000, so reopening never loses what a person saw.

**Alternatives considered:** replace-on-backfill, rejected for the silent shrink. Making the engine drain non-destructive, rejected because the management endpoint's contract stands outside this change.

**ADR draft:** none, a cache rule the contract docs carry.

### 4. A one-second display tick decouples reading from transport

Aggregates freeze on a quiet gateway and would repaint per frame on a busy one if the window recomputed per push. The footer recomputes on a one-second tick while mounted, and `trafficAggregates` stays a pure function of rows and an instant, so the tick is trivially testable with a fake clock.

**Alternatives considered:** recomputing per push, rejected because a busy gateway pushes every 16 ms. Engine-side aggregates, rejected because decision 7 forbids a second metrics contract.

**ADR draft:** none, a renderer-local rule.

### 5. The client key hashes at the gateway edge

Distinctness needs the source address and the `User-Agent` header, and the privacy rule forbids shipping either. `gateway-app.ts` hashes the pair with the digest the engine already uses for request identifiers, so the renderer counts distinct keys without ever seeing an address.

**Alternatives considered:** raw address and header in the row, rejected by the privacy rule. Hashing in the renderer, rejected because the address would cross two process boundaries first.

**ADR draft:** none, the privacy commitment carries it.

### 6. `PanelSeparator` grows an axis instead of a sibling component

The separator's drag, keyboard, collapse, and restore logic is the same interaction in either direction. An `axis` extension (`'inline' | 'block'`) swaps the orientation, the pointer coordinate, the cursor, and the size vocabulary, and every existing call site stays untouched by defaulting to `'inline'`.

**Alternatives considered:** a second vertical separator component, rejected because it duplicates the one piece of interaction knowledge the repository already owns.

**ADR draft:** none, a component-API decision the stories prove.

### 7. Mutation scope widens to the pure pair

The mutate list gains `traffic-aggregates.ts` and `log-scope.ts`, which makes the diff-scoped gate stricter, never weaker. The engine-side row source rides the engine package's existing mutation gate. The deliberate exclusions: the `ui/` components and the stores, because the runner is node-only and their behavior lands in browser and end-to-end layers. `shared/api/engine-logs.ts` also stays out as a channel boundary shell.

**Alternatives considered:** leaving renderer files out of scope, rejected because the pure pair is exactly the node-side logic the mutation rule exists for.

**ADR draft:** none, gate widening follows the existing mutation rule.

## Test matrix

| Layer          | What this layer proves (or why none)                                                                                                                                                                                                                                                                        | Check command                                                                                                                                                                                        |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit           | window math per aggregate, exact p95 selection, decay past 60 seconds, distinct client keys, the six-subject predicate, merge-by-id and the 10,000 cap, compact and duration formatting, the engine row source: field threading, wall-clock stamp, gateway-outcome rows, exactly one row per failed request | `pnpm --filter @recompose/desktop exec vitest run --project unit` and `pnpm --filter @recompose/engine run test`                                                                                     |
| Integration    | real-Chromium proofs: the footer reads pushed rows on the tick, the drawer opens, resizes, collapses, and remembers, selectors mirror the selection both ways, the viewport holds on prepend, the live region announces batches, stories pass axe in both schemes                                           | `pnpm --filter @recompose/desktop exec vitest run --project browser --project storybook --project storybook-dark`                                                                                    |
| End-to-end     | the eight feature files drive the running app: footer readings, the menu twin, streaming, scoping, privacy, and the clipboard paths                                                                                                                                                                         | `pnpm run test:e2e`                                                                                                                                                                                  |
| Property       | fast-check on `trafficAggregates`: p95 equals the sorted-selection oracle, counts equal naive filters, rows outside the window never count, aggregates stay non-negative; on `logScope`: every scoped set is a subset of the gateway scope, and the errors toggle only ever shrinks a set                   | `pnpm --filter @recompose/desktop exec vitest run --project unit`                                                                                                                                    |
| Mutation scope | the pure pair against the diff-scoped gate, with components, stores, and the api shell excluded as decision 7 records, and the engine row source under the engine package's own gate                                                                                                                        | `pnpm --filter @recompose/desktop run test:mutation --incremental --mutate "src/renderer/src/pages/gateway-canvas/lib/traffic-aggregates.ts,src/renderer/src/pages/gateway-canvas/lib/log-scope.ts"` |

Designated mutant killers:

- The window edge: a property test places a row exactly 60 seconds back and asserts it never counts, so an off-by-one boundary mutant dies.
- The p95 oracle: a property test compares against a naive sort-and-index oracle, so any selection mutant dies.
- The subset law: a property test asserts every scope's rows are a subset of the gateway scope's, so a predicate mutant that widens dies.
- The one-row law: a unit test fails one request through a provider and asserts exactly one row lands, so a double-publish mutant dies.

## Task decomposition hooks

Every task owns disjoint files, and the others run on disjoint files.

- Task 1: contracts, owning `engine-logs.ts`, `engine-protocol.ts`, `ipc.ts`, and the contracts barrel (depends on: none, hands off: `LogRow`, `LogBatch`, and the channel name)
- Task 2: engine row source, owning the four engine files, with unit tests and the red-run proof (depends on: 1, hands off: rows published on `subscribe()`)
- Task 3: main and preload, owning `logs-ledger.ts`, the engine-host pair, `push-events.ts`, `main/index.ts`, the menu template, and the preload bridge (depends on: 1, hands off: `engine:logs` pushes reaching windows)
- Task 4: the pure pair with unit and property tests, owning `lib/traffic-aggregates.ts` and `lib/log-scope.ts` (depends on: 1, hands off: `trafficAggregates` and `logScope`)
- Task 5: shared additions, owning `shared/api/engine-logs.ts`, `logs-drawer-visibility.ts`, `panel-resize.ts`, the testing twins, the fake bridge, and the three barrels (depends on: 1, hands off: the bound cache and the fakes stories ride)
- Task 6: tokens and `StatusChip`, owning `theme.css`, `status-chip.tsx`, and the design project entry (depends on: none, hands off: `--color-running-ink` and the danger tone)
- Task 7: dependency and gates, owning `package.json`, the lockfile, `stryker.config.json`, and `ci.yml` (depends on: none, hands off: the installed virtualizer and the widened gate)
- Task 8: `PanelSeparator` axis, owning `panel-separator.tsx` and its stories (depends on: none, hands off: the `axis` prop)
- Task 9: the footer, owning `ui/traffic-footer/`, the `__root.tsx` mount swap, and the `widgets/status-bar` retirement (depends on: 4, 5, 6, hands off: the strip on the gateway route)
- Task 10: the drawer cluster, owning `ui/logs-drawer/`, `ui/log-list/`, `ui/log-row/`, the page composition, and the testkit (depends on: 4, 5, 6, 7, 8, hands off: the working drawer the end-to-end suite drives)
- Task 11: end-to-end, owning the graduated features and their step files (depends on: 3, 9, 10, hands off: the driven scenarios)

## Risks

- [Risk] Newest-at-top prepend fights the virtualizer's end-anchored patterns → Mitigation: task 10 spikes scroll anchoring first, and a browser test asserts the viewport holds on prepend.
- [Risk] A 10,000-row backfill lands as one giant push message → Mitigation: the logs desk chunks backfill into bounded batches on the same channel.
- [Risk] A provider failure publishes both an outcome row and an observation row → Mitigation: only the two observation-less outcomes publish, and the one-row unit test guards it.
- [Risk] The G2 kicker-safe tokens haven't landed when task 10 needs the tint marks → Mitigation: the implementer checks the node-kicker branch first, and this branch lands the token names itself if it wins the race.
- [Risk] The sibling `gateway-target-identity` change reshapes target matching mid-flight → Mitigation: the identity comparison isolates in one `log-scope.ts` function, and the implementer checks which change lands first.
- [Risk] Retiring `widgets/status-bar` leaves dead exports that trip the knip gate → Mitigation: task 9 deletes the slice with its mount in one commit.
- [Risk] Wall-clock stamps and monotonic durations get joined somewhere → Mitigation: rows order newest first by `at` with the id as the tiebreak, and no code subtracts `at` from `startedAt`.
- [Risk] The one-second tick makes browser tests time-dependent → Mitigation: the tick tests run on fake timers, and e2e asserts presence, never latency.
- [Risk] New browser tests join a suite with known flaky candidates → Mitigation: no test waits on wall time, and list tests pin their rows through the testkit.

## Migration and rollout

No stored data migrates. The observation gains an optional grouped fact, so the management usage queue's payload stays backward compatible and its consumers read on unchanged. The `engine:logs` channel and the log report are additive: an old renderer ignores them. The drawer height rides the existing panel-width storage under a new name, which old builds ignore and rollback orphans harmlessly. `StatusBar` retires in the same release its replacement lands, and the release notes name the live footer. Deploy order inside the branch: contracts land first, the engine and main-process edges next, the renderer surfaces last, and the merge blocks on the eight feature files. Rollback is a revert of the feature branch, because every contract change is additive and no schema versioned.

## Open questions

- Which letter completes the `Show Logs` accelerator. The proposal defaults to `Cmd+Shift+L`, and the menu template review at task 3 confirms it without moving any boundary.
- Whether a jump-to-newest control earns a rider after real use. The list behavior stands either way.

## End-to-end verification

The final observable check runs in the development app. Start a gateway serving two virtual models and point a client at it. The footer counts the requests, the client app, and the tokens within a second, and the tally matches the canvas. Unbind one target and send a request. The footer's error count appears, the cable reads red, and a 502 row with empty provider cells stands at the top of the opened drawer. Select nodes and scopes in both directions, stop the gateway, and read stopped with every row intact. Close and reopen the drawer and read the same rows. Narrow the window to 720 px with traffic flowing and read the footer dropping cells in its stated order, in both color schemes.

A fresh-context reviewer diffs the result against six criteria. The footer and the cables never disagree on errors. Every row survives a reopen and a restart backfill. The selection and the scope strip mirror each other across all six subjects. No prompt, completion, or provider answer text appears anywhere in either surface. The keyboard alone opens the drawer, walks the rows, and copies one. The two-scheme pass covers the loaded footer at the window minimum.
