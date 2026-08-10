## Implementation tasks

Nine tasks. Tasks 1, 2, 6, and 7 run first and together on disjoint files. Tasks 3, 4, and 5 wait on their gates and run together on disjoint files. Task 8 waits on everything before it, because it assembles the stage. Task 9 waits on task 8, because it drives the running app. Every dispatch names the files it owns, and the others run on disjoint files.

Every task opens with a named failing test, captures the red run it started from, and drives it to green. Test code changes if and only if behavior changes. A `ui/` component ships its `*.stories.tsx` sibling before the branch leaves the machine. Anything that reaches the screen gets looked at through `claude-in-chrome` in both schemes. Prose and spell gates run once at the end of a task's authoring, and findings get fixed in one batch.

- [ ] **Task 1: tokens and the plus glyph.** Owns `theme.css`, `primitives.css`, and `icon.tsx`. Depends on nothing, and runs beside tasks 2, 6, and 7 on disjoint files.
  - [ ] Opens red: a browser test reads the painted cable, port, hit-area, and subtitle values from the page, before the tokens exist.
  - [ ] `theme.css` gains the role tint family, the cable standing family, the port family, `--spacing-hit-target`, the 11px mono subtitle token, the minimap and zoom-tool restyle tokens, and the `--node-tint` hook on `node-card`. `primitives.css` gains the primitive values those tokens draw from. The design project's source of truth settles the restyle values. `IconName` keeps its plus glyph honest.
  - [ ] Layers: browser through painted style, stories for the token sheet where one exists.

- [ ] **Task 2: the pure lib quartet.** Owns `lib/node-graph.ts`, `lib/tidy-layout.ts`, `lib/canvas-positions.ts`, and the `model-draft.ts` additions, each with its unit and property tests. Depends on nothing, and runs beside tasks 1, 6, and 7 on disjoint files.
  - [ ] Opens red: `canvasGraph` derives the gateway, one virtual model, one target, and one resting cable from a served gateway, before the module exists.
  - [ ] `canvasGraph` derives nodes and edges from engine truth plus the overlay, and stays the single writer of graph shape. A stored binding wins over a colliding draft id. `tidyPositions` seats left to right and leaves the router column empty, and `seatForNewNode` births nodes at tidy seats. `storedPositionsRead` parses the persisted overlay and falls back to tidy on a malformed value. `gatewayRebinding` swaps the one target, and `gatewayReleasing` releases a binding into a draft.
  - [ ] Property: fast-check holds one outgoing cable per virtual model across arbitrary edit sequences, and tidy geometry never overlaps, keeps ordered columns, and stays deterministic.
  - [ ] Layers: unit, property. The diff-scoped mutation gate covers all four files.

- [ ] **Task 3: the node components.** Owns `ui/gateway-node/`, `ui/virtual-model-node/`, `ui/target-node/`, and `ui/draft-model-node/`, each folder with its stories sibling. Depends on tasks 1 and 2, and runs beside tasks 4 and 5 on disjoint files.
  - [ ] Opens red: a browser test renders a target node with the purple role frame and the account-kind chip tint, before the components exist.
  - [ ] Each node type wraps `node-card` with the kicker, the name, and the 11px mono subtitle. The frame carries the role tint, and the kicker chip carries the account-kind tint. The target node renders the ghost removed standing as its dashed variant. The draft node draws the dashed border in strong line ink with the placeholder name in secondary ink, never card-level opacity. Ports carry the 24px transparent hit area.
  - [ ] Layers: browser, stories with axe in both schemes.

- [ ] **Task 4: the cable and the picker.** Owns `ui/binding-cable/`, `ui/drop-picker/`, and `lib/cable-announcements.ts`, with stories siblings. Depends on tasks 1 and 2, and runs beside tasks 3 and 5 on disjoint files.
  - [ ] Opens red: a browser test selects a cable and reads the widened stroke and halo, before the edge exists.
  - [ ] `binding-cable` renders the bezier with its standing tint, the selection halo from the `node-card` glow recipe, endpoint grab handles with the hit area and a grab cursor, and the in-flight connection line. `drop-picker` runs the two-stage popover over the untouched `OptionList`: account first, provider model second, anchored to the pending card, capped with a scroll region. Esc dismisses it and the pending card leaves. `announcedOutcome` renders one sentence per binding outcome for the live region.
  - [ ] Layers: browser, stories with axe in both schemes.

- [ ] **Task 5: the canvas furniture.** Owns `ui/canvas-minimap/` and `ui/canvas-zoom-controls/`, with stories siblings. Depends on task 1, and runs beside tasks 3 and 4 on disjoint files.
  - [ ] Opens red: a dark-scheme story reads the minimap mask from the theme token, before the restyle exists.
  - [ ] The minimap restyles to the template's map card, drives its mask and node fill from `light-dark()` tokens, and insets clear of the panel separator. The zoom controls size to the shipped push-button recipe, carry the tidy control, and keep the interactivity lock off.
  - [ ] Layers: browser, stories with axe in both schemes.

- [ ] **Task 6: the Canvas menu ride.** Owns `app-menu-template.ts`, `main/index.ts`, `preload/index.ts`, and `contracts/src/ipc.ts`. Depends on nothing, and runs beside tasks 1, 2, and 7 on disjoint files.
  - [ ] Opens red: the typed event map carries `canvas:command`, and the menu template holds a Canvas menu without page-zoom roles, before either exists.
  - [ ] The Canvas menu carries Zoom In, Zoom Out, Zoom to Fit, and Tidy on the freed accelerators, and the page-zoom roles leave the View menu. The handlers send `canvas:command` to the focused window, and the preload bridge forwards it.
  - [ ] Layers: unit, type-level for the event map.

- [ ] **Task 7: the dependency and the gates.** Owns `package.json`, the lockfile, `stryker.config.json`, and `ci.yml`. Depends on nothing, and runs beside tasks 1, 2, and 6 on disjoint files.
  - [ ] Opens red: the license sweep runs over the transitive set, before the dependency lands.
  - [ ] `@xyflow/react` 12.11.2 lands pinned exactly, and the sweep clears `zustand`, `classcat`, `@xyflow/system`, and the `d3` modules first. A refusal escalates to the maintainer. The mutation config and the diff glob widen to the pure canvas lib files.
  - [ ] Layers: the license gate and the widened mutation gate themselves.

- [ ] **Task 8: the stage integration.** Owns `gateway-stage`, `gateway-canvas-page`, `gateway-drawer`, `lib/use-held-draft.ts`, `lib/use-canvas-commands.ts`, `lib/canvas-position-store.ts`, the `use-press-away` and `add-model-flow` retirements, the testkit, and the slice browser tests. Depends on tasks 2 through 7.
  - [ ] Opens red: a browser test drags a cable from a virtual model port onto a target node and reads the binding from the read model, before the stage holds a flow.
  - [ ] The stage becomes the controlled `ReactFlowProvider` host: `canvasGraph` supplies nodes and edges, `onNodesChange` applies position changes only, and a foreign change type changes nothing. Pan on scroll stays on, zoom on scroll stays off, and pinch zooms. The drop on empty canvas births the pending card and the picker. The gateway plus births the draft with inspector focus, and the plus and keyboard paths bind without a drag. The inspector shows one body per selection subject, and its add button retires. Delete unbinds a cable without confirmation, asks before a node leaves, and never fires from a text field. Positions persist per gateway, and tidy restores the arrangement. The live region announces bind, refusal, and unbind.
  - [ ] Layers: browser for every gesture and its dragless twin, stories for the assembled stage.

- [ ] **Task 9: end-to-end.** Owns the `gateway-canvas-*.steps.ts` step definitions, `gateway-screen.ts`, and the packaged smoke additions. Depends on task 8.
  - [ ] Opens red: the frozen scenarios run against the built app and fail, before the steps exist.
  - [ ] The thirty-six frozen scenarios graduate from `gherkin/gateway-canvas/` into `apps/desktop/e2e/features/gateway-canvas/` as a directory copy. Drags drive explicit pointer sequences with no steps option, and every assertion reads outcome state. The packaged proof opens a wired gateway under the strict style policy and reads nodes and cables painted with a silent console.
  - [ ] Layers: end-to-end across the three-OS matrix, plus the packaged proof.
