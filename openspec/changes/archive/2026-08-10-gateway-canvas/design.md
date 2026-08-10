# Solution design

## Header and change linkage

- Change id: gateway-canvas
- Schema: recompose
- Proposal: [proposal.md](proposal.md)
- Specs: [specs/gateway-canvas/spec.md](specs/gateway-canvas/spec.md)
- Discovery: [discovery/](discovery/)
- Tasks: None

## Context

The gateway detail screen shows one selectable gateway card on a dotted field, and every composition act runs through forms in the drawer. The topology a person composed stays invisible. This change turns the stage into a node canvas: the gateway, its virtual models, and their targets stand as nodes, and every binding draws as a cable. The proposal freezes fourteen locked decisions, headed by full adoption of `@xyflow/react` 12.11.2. The maintainer's bar is a canvas that feels as fluid as pulling an arrow in Excalidraw. The engine stays untouched: the canvas reads the shipped read models and invokes the shipped mutations.

## Discovery inputs consumed

- `discovery/technical-research.md` finding 1: the stage is a stub and the `node-card` and `dot-grid` utilities already exist, so custom node types wrap them and the library never paints its own skin.
- `discovery/technical-research.md` finding 2: the published manifest facts for 12.11.2 seed Architecture Decision Record (ADR) 0084 and the transitive license sweep.
- `discovery/technical-research.md` finding 3: drag-only binding fails Web Content Accessibility Guidelines (WCAG) 2.2 success criterion 2.5.7, so the plus affordance and the picker form the single-pointer and keyboard path.
- `discovery/technical-research.md` findings 4 and 5: the drop-picker builds on Add Node On Edge Drop, the plus builds on Button Handle, and the macOS gesture config lands as `panOnScroll` on, `zoomOnScroll` off, `zoomOnPinch` on.
- `discovery/technical-research.md` finding 6: the packaged renderer runs under `style-src 'self'`, so a packaged smoke check proves the imperative viewport transform.
- `discovery/technical-research.md` finding 7: browser tests run in real Chromium with no shims, and cable drags drive explicit pointer sequences.
- `discovery/code-map.md`: the file map below cites its entries, and the `panel-width` pattern shapes position persistence.
- `discovery/candidate-panel.md`: candidate A fixes the module cut, which is the three pure lib modules and the thin provider host.
- `discovery/rider-ledger.md`: rider #117 closes as superseded under decision 7, and rider #137 warns that this feature adds browser tests to a run that already produced one flake.
- `discovery/acceptance-references.md`: the delete-key guard, the pane-click collision, the 24px target size, the polite live region, the first-paint measurement rule, and the reduced-motion rule all land as design constraints below.
- `discovery/mobbin-references.md`: every reference anchors the connect gesture on a visible port and turns a missed drop into an add, which confirms decisions 2 and 12.
- `discovery/brainstorm-decisions.md`: consulted, no impact beyond what the amended proposal already carries.

## Goals and non-goals

**Goals:**

- The canvas renders engine truth: the gateway, its virtual models, their targets, and every binding as a cable.
- A cable drag, the plus affordance, and the keyboard all create the same bindings, and every outcome announces.
- Node positions persist per gateway in renderer-owned storage, and a tidy control restores the automatic arrangement.
- The minimap, the zoom controls, and a Canvas menu ship restyled to the design template.
- A packaged build proves the canvas under the strict style policy before the feature lands.

**Non-goals:**

- No router nodes: the tidy layout only reserves their column.
- No flow animation, no per-cable metric labels, and no metrics status bar: all three enter the rider ledger.
- No undo and redo: it enters the rider ledger.
- No engine change, no change to `packages/contracts`, and no new persisted gateway-config shape.
- No live-traffic layer beyond the running state and per-target standing the engine already exposes.

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

- A virtual model maps to one target. `isValidConnection` refuses a second cable during the drag, and a new cable from a bound virtual model rebinds it.
- `node-graph.ts` is the single writer of graph shape. The library's store holds positions and selection, never topology.
- Every structural mutation routes through `useDefineVirtualModel`, so the canvas and the drawer read one truth.
- Every binding a cable drag can create also arrives through single-pointer activations and through the keyboard alone.
- Every port, plus affordance, and cable endpoint carries a pointer target of at least 24 by 24 pixels.
- Esc cancels any drag in flight and leaves the composition unchanged.

## Design

### One direction of data flow

Engine truth flows one way. `gatewaysQueryOptions` and `accountsQueryOptions` feed `servedModels`, which reads each binding against the registry. `canvasGraph` in `node-graph.ts` turns that reading, plus the renderer overlay, into nodes and edges. The page hands both to a controlled `<ReactFlow>` inside the provider host that `gateway-stage.tsx` becomes. `onNodesChange` applies position changes only. Every other change type falls on the floor, so the library's store never becomes a second source of truth. A completed gesture calls `useDefineVirtualModel` with a rewritten gateway, the cache updates, and the graph re-derives.

### The overlay carries what engine truth can't

Two renderer-only standings ride beside the derived graph as a `CanvasOverlay`. The draft virtual model node holds an unfinished definition through the extended `useHeldDraft`, which now keeps a canvas seat beside the definition. The pending target card holds the spot where a dropped cable landed while the drop-picker stands open. `canvasGraph` appends overlay nodes and their draft cables after the derived ones, so the overlay can never shadow a stored binding.

### Positions persist in the panel-width pattern

`canvas-positions.ts` holds the pure overlay arithmetic: parse a stored string into positions, and lay held positions over tidy seats. `canvas-position-store.ts` is the storage shell in the `panel-width` pattern: subscribe, read, set during a drag, and keep on settle, under the key `recompose.canvas.positions.<slug>`. The split mirrors the shipped `panel-resize.ts` and `panel-width.ts` pair, so the arithmetic stays in mutation scope and the shell stays a boundary. Per ADR-0065 the overlay is view state: a missing or malformed value falls back to the tidy arrangement without a report. The stored gateway config keeps its vestigial `layout` field unread, which decision 4 below records.

### Tidy layout reserves the router column

`tidyPositions` arranges left to right in four columns: the gateway in column zero, virtual models in column one, column two reserved for routers, and targets in column three. The reserved column stays empty in v1, so the later router feature inserts without rearranging anything. `seatForNewNode` places a new node where the tidy arrangement would put it, which is where a draft node and a picked target materialize. The Tidy control drops the stored overlay and animates every node back to its tidy seat, at duration zero under reduced motion.

### The drop-picker completes a binding in two stages

A cable released on empty canvas runs the Add Node On Edge Drop pattern. `onConnectEnd` reads an invalid connection state, materializes a pending target card at `screenToFlowPosition`, and anchors the drop-picker popover to that card, never to a bare coordinate. Stage one offers the stored accounts through the untouched `OptionList` over `targetGroups`. Stage two offers the picked account's live model list from `providerModelsQueryOptions`, because a binding needs a provider model and the stored shape refuses a blank one. The pick commits one `useDefineVirtualModel` write, and the pending card becomes a wired target node. Esc at either stage dismisses the picker and removes the pending card, the stated exception to the never-silent-cancel rule. A drop that lands on a stored target node whose account differs from the current binding opens stage two only.

### The plus affordance lives on every source port

Each source port renders a Button Handle: a persistent plus button inside the handle's 24px hit area, hidden by `useConnection` only while a drag is in flight. The gateway's plus drops a connected draft virtual model node at its tidy seat and opens the inspector with the name field focused. A virtual model's plus opens the drop-picker anchored to a pending card at the target column's seat. A bare gateway draws its automatic wire ending in the plus, so no state loses the add path. The plus is a real focusable button, which makes it the keyboard path. Tab reaches it, Enter activates it, and the picker's option list operates by arrow keys and Enter.

### Cables are first-class and rebinding is a drag

`binding-cable` renders the custom edge and the in-flight connection line. A press selects the cable, the inspector shows the bound target and its provider model, and both endpoints paint as port-tinted grab handles. `onReconnect` rebinds a dragged endpoint onto another compatible node through `gatewayRebinding`. `deleteKeyCode` unbinds a selected cable without confirmation, and Delete on a selected virtual model node asks first, then removes the definition. Unbinding releases the stored definition into a held draft node that keeps its name, alias, and seat, because the stored shape requires a target. The draft rebinds through the same cable gesture, which recreates the definition.

### A removed target keeps its cable on a ghost

When a bound account leaves the registry, `servedModels` reads the standing as removed, and `canvasGraph` derives a ghost target node per missing account. The ghost renders as the target node's removed standing: a dashed card labeled as removed, with the cable in the broken tint. Repair is the same endpoint drag or plus path as any rebind.

### The accessibility build

Four contracts land as code. First, the plus and picker path covers every binding a drag can create, with no dragging. Second, the same path works by keyboard alone, because React Flow ships no key sequence between handles. Third, `A11yDescriptions` publishes the live region, `ariaLabelConfig` overrides the assertive default to polite, and `announcedOutcome` in `cable-announcements.ts` feeds one sentence per binding outcome. Only a refusal interrupts. Fourth, ports, plus buttons, and cable endpoints size their hit areas with the new `--spacing-hit-target` token at 24px. `connectionRadius` and the edge's `interactionWidth` pin to the same named value. The port-number field already claims `--spacing-port`, so the hit-area family takes the new name. While focus sits in a text field, Backspace and Delete edit text and never reach the canvas, guarded in the page and proven in a browser test.

### The tint split and the token families

The card frame carries the role tint through a `--node-tint` custom property on the `node-card` utility: teal for the gateway, blue for a virtual model, purple for a target. The orange router tint stays out until the router feature needs it. The 17px kicker glyph chip carries the account-kind tint through the shipped kind tokens. `theme.css` gains the cable stroke colors per state, the port dot tokens, the hit-area token, the 11px mono subtitle text token, and the minimap and zoom-tool restyle tokens. Where the template names a value the scale lacks, `primitives.css` gains the primitive first. The flow-green token stays out, exactly as ADR-0053 rules.

### Canvas furniture and the menu

`canvas-minimap` restyles `MiniMap` as the template's 172 by 112 bottom-right map card, with mask and node fill from `light-dark()` tokens and an inset clear of the panel separator. `canvas-zoom-controls` restyles `Controls` as the bottom-left cluster on the shipped push-button recipe, with the interactivity lock off. A new Canvas menu carries Zoom In, Zoom Out, Zoom to Fit, and Tidy. The View menu's three page-zoom roles leave, because two menu items can't share one accelerator and page zoom breaks the fixed chrome. The Canvas menu claims `CmdOrCtrl+=`, `CmdOrCtrl+-`, and `CmdOrCtrl+0`, and Tidy ships without an accelerator. Menu clicks reach the page over a new renderer-bound `canvas:command` event through the typed event map, and `use-canvas-commands.ts` drives the viewport.

### First paint, gestures, and the packaged proof

Every node declares the template's card size as `width` and `height`, so edges draw on first paint and no frame shows nodes at the origin. The page derives its initial viewport instead of animating a fit, and stories pin `defaultViewport` themselves. The gesture config reads macOS-native: two-finger scroll pans, pinch zooms, wheel zoom stays off. `onPaneClick` takes over from the retired `usePressAway`, clearing selection and closing the inspector, and it ignores the click that ends a connection drag. The packaged build renders under `style-src 'self'`, and a packaged end-to-end check opens a wired gateway and asserts nodes and cables painted. Serve mode carries `'unsafe-inline'` and would hide the break.

## Data model and contracts

### Canvas graph entities

- `CanvasNode`: a discriminated union over `kind`: `gateway`, `virtual-model`, `target`, `ghost-target`, `draft-model`, and `pending-target`. Node ids read `gateway`, `model:<id>`, `target:<accountId>`, `ghost:<accountId>`, `draft`, and `pending`.
- `CanvasEdge`: one binding cable per served virtual model, plus the draft and pending cables from the overlay. `CableStanding` reads `resting`, `live`, `broken`, `draft`, or `pending`.
- `CanvasOverlay`: the held draft with its seat, and the pending target card with its drop point, each possibly absent.
- `NodePositions`: a readonly record from node id to `{ x, y }`.

### State transitions

- A draft node arrives from the gateway's plus or from an unbind, holds through deselection, inspector close, and leaving the screen, and leaves on a completed definition or an explicit delete.
- A pending card arrives from a drop on empty canvas or a plus press on a virtual model, becomes a wired target on the committed pick, and leaves on Esc.
- A binding arrives from `gatewayDefining` or `gatewayRebinding`, releases to a draft through `gatewayReleasing`, and reads as broken while its account is missing.

### Storage and channel contracts

- `localStorage` key `recompose.canvas.positions.<slug>` holds the per-gateway `NodePositions` overlay, view state per ADR-0065, validated on read with a tidy fallback.
- One new renderer-bound event joins the typed event map: `canvas:command` with payload `zoom-in`, `zoom-out`, `zoom-to-fit`, or `tidy`. No request channel changes, and the gateway-config schema doesn't change.

## Error handling

- A refused `gateways:update` surfaces its refusal sentence in the inspector through the shipped `IpcResultError` path. The draft or the previous binding holds, and the live region announces the refusal.
- An invalid connection during a drag reads as a typed refusal from `isValidConnection`: the port paints the refusing state, and release changes nothing.
- A removed target is the typed `ServedTarget` removed standing, rendered as the ghost node and the broken cable, never a blank canvas.
- A failed provider model list read in stage two shows the query's typed refusal with a retry, and the pending card holds.
- A malformed positions value falls back to tidy seats, per the ADR-0065 rule that view state never reports.
- Esc during any drag cancels it and leaves the composition unchanged.

## File map

Pages layer, slice `gateway-canvas`:

- `apps/desktop/src/renderer/src/pages/gateway-canvas/lib/node-graph.ts`: nodes and edges from engine truth plus the overlay, the single writer of graph shape (create)
- `apps/desktop/src/renderer/src/pages/gateway-canvas/lib/tidy-layout.ts`: the left-to-right arrangement with the reserved router column and seats for new nodes (create)
- `apps/desktop/src/renderer/src/pages/gateway-canvas/lib/canvas-positions.ts`: pure position overlay arithmetic, parsing and layering (create)
- `apps/desktop/src/renderer/src/pages/gateway-canvas/lib/canvas-position-store.ts`: the `localStorage` shell in the `panel-width` pattern (create)
- `apps/desktop/src/renderer/src/pages/gateway-canvas/lib/cable-announcements.ts`: one sentence per binding outcome for the live region (create)
- `apps/desktop/src/renderer/src/pages/gateway-canvas/lib/use-canvas-commands.ts`: subscribes to `canvas:command` and drives the viewport (create)
- `apps/desktop/src/renderer/src/pages/gateway-canvas/lib/model-draft.ts`: gains `gatewayRebinding` and `gatewayReleasing` beside `gatewayDefining` (modify)
- `apps/desktop/src/renderer/src/pages/gateway-canvas/lib/use-held-draft.ts`: the held draft gains its canvas seat (modify)
- `apps/desktop/src/renderer/src/pages/gateway-canvas/lib/use-press-away.ts`: retires, `onPaneClick` takes its job (delete)
- `apps/desktop/src/renderer/src/pages/gateway-canvas/ui/gateway-node/gateway-node.tsx`: the gateway node type wrapping `node-card`, with stories sibling (create)
- `apps/desktop/src/renderer/src/pages/gateway-canvas/ui/virtual-model-node/virtual-model-node.tsx`: the virtual model node type, with stories sibling (create)
- `apps/desktop/src/renderer/src/pages/gateway-canvas/ui/target-node/target-node.tsx`: the target node type including the ghost removed standing, with stories sibling (create)
- `apps/desktop/src/renderer/src/pages/gateway-canvas/ui/draft-model-node/draft-model-node.tsx`: the dashed draft treatment, with stories sibling (create)
- `apps/desktop/src/renderer/src/pages/gateway-canvas/ui/binding-cable/binding-cable.tsx`: the custom edge, its state tints, and the connection line, with stories sibling (create)
- `apps/desktop/src/renderer/src/pages/gateway-canvas/ui/drop-picker/drop-picker.tsx`: the two-stage popover wrapping `OptionList`, with stories sibling (create)
- `apps/desktop/src/renderer/src/pages/gateway-canvas/ui/canvas-minimap/canvas-minimap.tsx`: the `MiniMap` restyle, with stories sibling (create)
- `apps/desktop/src/renderer/src/pages/gateway-canvas/ui/canvas-zoom-controls/canvas-zoom-controls.tsx`: the `Controls` restyle, with stories sibling (create)
- `apps/desktop/src/renderer/src/pages/gateway-canvas/ui/gateway-stage/gateway-stage.tsx`: becomes the thin `ReactFlowProvider` host holding the controlled flow (modify)
- `apps/desktop/src/renderer/src/pages/gateway-canvas/ui/gateway-canvas-page/gateway-canvas-page.tsx`: wires selection, overlay, commands, and the inspector (modify)
- `apps/desktop/src/renderer/src/pages/gateway-canvas/ui/gateway-drawer/gateway-drawer.tsx`: the selection-subject inspector with one body per subject (modify)
- `apps/desktop/src/renderer/src/pages/gateway-canvas/ui/add-model-flow/`: retires, the draft node and inspector take its job (delete)
- `apps/desktop/src/renderer/src/pages/gateway-canvas/testing/gateway-canvas.testkit.ts`: seeds gain canvas shapes (modify)

Shared and app layers:

- `apps/desktop/src/renderer/src/shared/ui/icon/icon.tsx`: `IconName` gains the plus glyph (modify)
- `apps/desktop/src/renderer/src/app/styles/theme.css`: the role tint, cable, port, hit-area, subtitle, and restyle token families, plus the `--node-tint` hook on `node-card` (modify)
- `apps/desktop/src/renderer/src/app/styles/primitives.css`: the primitive values the new tokens draw from (modify)

Main, preload, and contracts:

- `apps/desktop/src/main/menu/app-menu-template.ts`: the Canvas menu, and the page-zoom roles leave the View menu (modify)
- `apps/desktop/src/main/index.ts`: the Canvas menu handlers send `canvas:command` to the focused window (modify)
- `apps/desktop/src/preload/index.ts`: the event bridge gains `canvas:command` (modify)
- `packages/contracts/src/ipc.ts`: the typed event map gains `canvas:command` (modify)

Manifest, gates, and end-to-end:

- `apps/desktop/package.json`: gains `@xyflow/react` 12.11.2 pinned exactly (modify)
- `apps/desktop/stryker.config.json`: the mutate list gains the pure canvas lib files (modify)
- `.github/workflows/ci.yml`: the mutation diff glob widens to the same files (modify)
- `apps/desktop/e2e/steps/gateway-canvas-*.steps.ts`: step definitions for the Gherkin scenarios (create)
- `apps/desktop/e2e/gateway-screen.ts`: canvas page objects, ports, cables, and the picker (modify)
- `apps/desktop/e2e/packaged-smoke.spec.ts`: the packaged canvas paint proof (modify)
- `docs/adr/0084-the-gateway-canvas-adopts-xyflow-react.md`: the adoption record (create)

## Interfaces

Consumes:

- `gatewaysQueryOptions`, `useDefineVirtualModel` from `shared/api/gateways.ts`
- `accountsQueryOptions` from `shared/api/accounts.ts`, `providerModelsQueryOptions` from `shared/api/provider-models.ts`
- `servedModels`, `ServedModel`, `ServedTarget` from the slice's `model/served-models.ts`
- `targetGroups` from `lib/target-groups.ts`, `OptionList`, `OptionGroup` from `ui/option-list`
- `accountMark`, `accountName` from the account entity's public interface
- `panelBounds`, `subscribeToPanelWidths`, `inspectorOpen`, `toggleInspector` from `shared/lib`
- `ReactFlow`, `ReactFlowProvider`, `Handle`, `MiniMap`, `Controls`, `A11yDescriptions`, `useConnection`, `useReactFlow`, `NodeProps`, `EdgeProps` from `@xyflow/react`

Produces:

- `canvasGraph(gateway: GatewayConfig, accounts: readonly Account[], overlay: CanvasOverlay): CanvasGraph` and the `CanvasNode`, `CanvasEdge`, `CableStanding`, `CanvasOverlay` types from `node-graph.ts`
- `tidyPositions(nodes: readonly CanvasNode[]): NodePositions` and `seatForNewNode(kind: CanvasNodeKind, placed: NodePositions): XY` from `tidy-layout.ts`
- `storedPositionsRead(written: string | null): NodePositions` and `heldOver(tidy: NodePositions, held: NodePositions): NodePositions` from `canvas-positions.ts`
- `subscribeToCanvasPositions(reader: () => void): () => void`, `canvasPositions(slug: string): NodePositions`, `setNodePosition(slug: string, nodeId: string, position: XY): void`, `keepCanvasPositions(slug: string): void`, `dropCanvasPositions(slug: string): void` from `canvas-position-store.ts`
- `gatewayRebinding(gateway: GatewayConfig, modelId: string, target: Target): GatewayConfig` and `gatewayReleasing(gateway: GatewayConfig, modelId: string): GatewayConfig` from `model-draft.ts`
- `announcedOutcome(outcome: BindingOutcome): string` from `cable-announcements.ts`
- `DropPickerProps`: `{ stage: PickerStage; groups: readonly OptionGroup[]; onPickAccount: (accountId: string) => void; onPickProviderModel: (providerModel: string) => void; onDismiss: () => void }` with `PickerStage` as `{ step: 'account' } | { step: 'provider-model'; accountId: string }`
- `CanvasZoomControlsProps`: `{ onTidy: () => void }`

## Decisions

One numbered block per choice. A decision that meets the Architecture Decision Record (ADR) bar links its draft.

### 1. The graph derives, and the library store never writes topology

The flow runs controlled: `canvasGraph` derives nodes and edges every render, and `onNodesChange` applies position changes only. This kills the second-source-of-truth risk the proposal names, at the cost of re-deriving on every registry change, which stays cheap at this node count.

**Alternatives considered:** an uncontrolled flow synced by effect, rejected because two writers of one shape invite drift. Deriving inside the library store, rejected because topology would then live outside the tested pure lib.

**ADR draft:** [ADR-0084](../../../docs/adr/0084-the-gateway-canvas-adopts-xyflow-react.md) carries the adoption and this risk.

### 2. Unbinding releases the definition into a held draft

The stored shape requires one target per virtual model, and the engine stays untouched. Delete on a cable therefore removes the stored definition through `gatewayReleasing` and holds its name, alias, and seat as a draft node. The spec's unbound virtual model node is that draft standing, and rebinding recreates the definition.

**Alternatives considered:** making `target` optional in the stored shape, rejected because it changes contracts and the engine's serving answers for a bound gateway. Deleting outright on unbind, rejected because a one-key gesture would destroy a definition without confirmation.

**ADR draft:** none, the frozen contract decides it.

### 3. The drop-picker commits in two stages, one popover

A binding needs an account and a provider model, and the stored shape refuses a blank one. Stage one picks the account, stage two picks the provider model from the account's live list, and one write commits both. The gesture needs no drawer, and Esc at any stage removes only the pending card.

**Alternatives considered:** committing on the account pick with a placeholder model, rejected at parse by `targetSchema`. Opening the inspector for the model pick, rejected because the proposal promises binding with no drawer detour.

**ADR draft:** none, a screen-level rule the spec carries.

### 4. Positions live under `recompose.canvas.positions.<slug>`, and the config `layout` field stays unread

Decision 6 locks renderer-owned persistence in the `panel-width` pattern, and ADR-0065 draws the line: losing a position costs a drag, so it earns no version and no migration. The gateway config carries a `layout` field that no shipped code reads, minted with the storage foundation. This design leaves it unread and untouched, and the open questions name its retirement.

**Alternatives considered:** persisting positions into the config's `layout` field, rejected because the locked decision forbids it and a config write per node drag would thrash the storage watcher.

**ADR draft:** none, ADR-0065 already carries the rule.

### 5. The Canvas menu claims the zoom accelerators, and page zoom leaves

Electron's `zoomIn`, `zoomOut`, and `resetZoom` roles hold the standard accelerators today. Two items can't share one accelerator, and page zoom distorts the fixed chrome of a design-system app. The Canvas menu takes `CmdOrCtrl+=`, `CmdOrCtrl+-`, and `CmdOrCtrl+0` for canvas zoom and fit, and the three roles leave the View menu.

**Alternatives considered:** keeping the roles and giving the Canvas menu nonstandard accelerators, rejected because canvas zoom is the zoom a person means on this screen. Renderer-local shortcuts with no menu, rejected because menu items are the discoverable and assistive path on macOS.

**ADR draft:** none, the proposal already locks the menu.

### 6. The hit-area token is `--spacing-hit-target`

The 24px pointer-target family needs a name, and the port-number field already claims `--spacing-port`. `--spacing-hit-target` names the WCAG target-size purpose, and `connectionRadius` and `interactionWidth` pin to the same value, so the snap distance and the visible affordance never drift apart.

**Alternatives considered:** overloading `--spacing-port`, rejected because one token would carry two unrelated meanings. A bare numeric literal per component, rejected because the design values rule requires the named token.

**ADR draft:** none, a token-scale rule the design system carries.

### 7. The live region stays polite, and only a refusal interrupts

The library's default region announces assertively, including per-keystroke coordinates. `ariaLabelConfig` overrides the defaults, movement announcements stay at the library's own wording, and `announcedOutcome` feeds binding outcomes as polite announcements. A refused connection interrupts, because the person is mid-gesture and the refusal changes what their release will do.

**Alternatives considered:** the assertive default, rejected as the queue-flooding pattern the acceptance references cite. No announcements beyond the library's, rejected because binding outcomes are this feature's own work.

**ADR draft:** none, the accessibility contract in the spec carries it.

### 8. Mutation scope widens to the pure canvas lib

The diff-scoped gate today covers main and scripts only. The mutate list and the pipeline's diff glob gain `node-graph.ts`, `tidy-layout.ts`, `canvas-positions.ts`, and `model-draft.ts`, which makes the gate stricter, never weaker. The deliberate exclusions: the `ui/` components and the hooks, because the mutation runner runs node-only and their behavior lands in browser and end-to-end layers. Also excluded: `canvas-position-store.ts` as a storage boundary shell like `panel-width.ts`, and `cable-announcements.ts` because its sentences are copy that browser tests assert verbatim.

**Alternatives considered:** leaving renderer files out of scope, rejected because the pure trio is exactly the node-side logic the mutation rule exists for.

**ADR draft:** none, gate widening follows the existing mutation rule.

## Test matrix

| Layer          | What this layer proves (or why none)                                                                                                                                                                                                                                  | Check command                                                                                                                                                                                                                                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit           | graph derivation from engine truth and overlay, ghost derivation, tidy seats and the reserved column, position parsing and layering, rebind and release rewrites, announcement sentences                                                                              | `pnpm --filter @recompose/desktop exec vitest run --project unit`                                                                                                                                                                                                                                                     |
| Integration    | real-Chromium drag sequences assert read-model outcomes: cable drop binds, Esc cancels, pane click after a connect drop opens the picker without clearing selection, text-field keys never delete, the plus and keyboard paths bind, stories pass axe in both schemes | `pnpm --filter @recompose/desktop exec vitest run --project browser --project storybook --project storybook-dark`                                                                                                                                                                                                     |
| End-to-end     | the Gherkin scenarios drive explicit `mouse.down`, `mouse.move`, `mouse.up` sequences with no `steps` option, plus the packaged paint proof under the strict style policy                                                                                             | `pnpm run test:e2e` and `pnpm --filter @recompose/desktop run test:e2e:packaged`                                                                                                                                                                                                                                      |
| Property       | fast-check holds the one-target invariant across arbitrary edit sequences, and tidy geometry: no overlap, ordered columns, an empty router column, deterministic seats                                                                                                | `pnpm --filter @recompose/desktop exec vitest run --project unit`                                                                                                                                                                                                                                                     |
| Mutation scope | the pure lib quartet against the diff-scoped gate, with the store shell, hooks, components, and announcement copy excluded as decision 8 records                                                                                                                      | `pnpm --filter @recompose/desktop run test:mutation --incremental --mutate "src/renderer/src/pages/gateway-canvas/lib/node-graph.ts,src/renderer/src/pages/gateway-canvas/lib/tidy-layout.ts,src/renderer/src/pages/gateway-canvas/lib/canvas-positions.ts,src/renderer/src/pages/gateway-canvas/lib/model-draft.ts"` |

Designated mutant killers:

- The one-target rule: a property test edits arbitrary sequences and asserts one outgoing cable per virtual model, so a mutant that admits a second dies.
- The overlay precedence: a test derives a graph where a draft id collides with a stored id and asserts the stored binding wins.
- The reserved column: a test asserts no node ever seats in column two, so a mutant that collapses columns dies.

## Task decomposition hooks

Every cluster owns disjoint files, and the others run on disjoint files.

- Task 1: tokens and glyph (depends on: none, hands off: the token names in `theme.css`, `primitives.css`, and the plus in `icon.tsx`)
- Task 2: the pure lib quartet with unit and property tests, owning `lib/node-graph.ts`, `lib/tidy-layout.ts`, `lib/canvas-positions.ts`, `lib/model-draft.ts` (depends on: none, hands off: `canvasGraph`, `tidyPositions`, the position arithmetic, and the rewrites)
- Task 3: node components, owning the four `ui/*-node/` folders (depends on: 1, 2, hands off: the node types the stage registers)
- Task 4: cable and picker, owning `ui/binding-cable/`, `ui/drop-picker/`, `lib/cable-announcements.ts` (depends on: 1, 2, hands off: the edge type, the connection line, and the picker)
- Task 5: canvas furniture, owning `ui/canvas-minimap/` and `ui/canvas-zoom-controls/` (depends on: 1, hands off: the restyled furniture)
- Task 6: the Canvas menu ride, owning `app-menu-template.ts`, `main/index.ts`, `preload/index.ts`, `contracts/src/ipc.ts` (depends on: none, hands off: the `canvas:command` event)
- Task 7: dependency and gates, owning `package.json`, the lockfile, `stryker.config.json`, `ci.yml` (depends on: none, hands off: the installed library and the widened gate)
- Task 8: stage integration, owning `gateway-stage`, `gateway-canvas-page`, `gateway-drawer`, `use-held-draft.ts`, `use-canvas-commands.ts`, the `use-press-away` and `add-model-flow` retirements, the testkit, and the slice browser tests (depends on: 2, 3, 4, 5, 6, 7, hands off: the working canvas the end-to-end suite drives)
- Task 9: end-to-end, owning the step definitions, `gateway-screen.ts`, and the packaged proof (depends on: 8, hands off: the driven scenarios)

## Risks

- [Risk] The library store drifts from derived truth → Mitigation: the controlled flow applies position changes only, and a browser test asserts a foreign change type changes nothing.
- [Risk] The packaged build breaks under `style-src 'self'` while dev looks healthy → Mitigation: the packaged paint proof gates the merge.
- [Risk] Delete or Backspace in the name field removes a node, the known upstream defect → Mitigation: a first-red browser test types into the inspector and asserts the graph holds.
- [Risk] Pinch or ctrl-wheel escapes to Electron page zoom → Mitigation: the page-zoom roles leave the menu, and an end-to-end check asserts the canvas zooms while the chrome holds.
- [Risk] Cables miss their ports at 125% display scaling far from the origin → Mitigation: the Windows arm of the three-OS matrix runs a far-origin scenario.
- [Risk] The transitive license sweep refuses a `d3` module → Mitigation: the sweep runs in task 7 before any component work builds on the library, and a refusal escalates to the maintainer.
- [Risk] The attribution anchor navigates the renderer → Mitigation: the shipped `will-navigate` guard already routes external links, and a browser test presses the anchor.
- [Risk] New browser tests join a run with a known flake, rider #137 → Mitigation: canvas stories pin `defaultViewport` and positions, and no test waits on a fit animation.
- [Risk] A recreated `nodeTypes` object trips the StrictMode warning → Mitigation: the console stays error-free and warning-free as an asserted criterion in the browser suite.

## Migration and rollout

No stored shape changes and no data migrates. The positions key is additive view state: a build without this feature ignores it, and rollback orphans it without harm. The canvas replaces the stage on the gateway route in one release, and the drawer's add button retires with it. The plus stands as the only add path from day one. The View menu loses page zoom in the same release, which the release notes name. Deploy order inside the branch: the dependency and license sweep land first, the packaged paint proof lands with the stage, and the merge blocks on both. Rollback is a revert of the feature branch, because the engine, the contracts request map, and the stored config stand unchanged.

## Open questions

- Whether the vestigial `layout` field leaves `gatewayConfigSchema` in a later contracts change. This design leaves it unread, so either answer changes nothing here.
- Which exact primitive values the minimap and zoom-tool restyle tokens carry. The design project's source of truth settles them during task 1 without moving any boundary.
- The keyboard focus ring treatment for ports and cables awaits authoring in the design project, as the proposal records. The plus-anchored keyboard path stands regardless of the ring's final look.

## End-to-end verification

The final observable check runs in the development app, then in the packaged build. Open a gateway holding one bound virtual model: the gateway, the virtual model, and the target stand as nodes with a cable per binding. Drag a cable from the virtual model's port to empty canvas, pick an account and a provider model, and the pending card becomes a wired target. Complete the same binding again using only the keyboard, from the plus affordance. Then run the packaged proof and read nodes and cables painted under the strict style policy.

A fresh-context reviewer diffs the result against six criteria. Every binding a drag creates also arrives through the plus and through the keyboard, with announcements in the live region. Esc cancels any drag and the composition holds. Dragged positions survive a relaunch, and Tidy restores the arrangement with column two empty. A removed account renders the ghost node and the broken cable. Text-field editing never deletes a node or cable. The packaged build paints the canvas with no console error and no attribution navigation.
