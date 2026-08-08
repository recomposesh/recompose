# Gateway canvas design

The gate-1 design document for the gateway-canvas feature, amended from the entry proposal on 2026-08-08.

## Why

The first composition slice wired a virtual model to one stored target through forms and drawers. The topology those forms create stays invisible: a person reads lists and infers the wiring. The gateway detail screen becomes a canvas, so the wiring itself is the interface. Seeing the gateway, its virtual models, and their targets as connected nodes makes the composition legible at a glance. Dragging a cable between ports turns a binding into direct manipulation instead of a form submission.

The maintainer set one bar for this slice: the canvas must feel immediately intuitive, with cable drawing as fluid as pulling an arrow in Excalidraw.

## What changes

V1 ships the fourteen locked decisions below. The maintainer locked the first eleven on 2026-08-08 and ratified three more at gate 1. The delta spec freezes them as requirements.

1. **The topology draws engine truth only.** The canvas renders the gateway, its virtual models, and each virtual model's single target. No router nodes appear: routers stay a separate later feature, and the left-to-right layout keeps a column free for them. The design template's full chain stays the north star, not this slice's scope.
2. **The canvas shows only wired nodes, and a cable dropped on empty canvas opens a picker.** Stored accounts never float unwired, and no palette tray exists. Dropping a dragged cable on empty space opens a compact picker of stored accounts, grouped as the existing `OptionList` groups them. The picked account materializes as a target node at the drop point, already wired. A missed drop becomes an add, never a silent cancel. Esc cancels any drag in flight.
3. **The plus affordance creates a draft virtual model node in place.** A bare gateway draws an automatic wire ending in a plus. Pressing it, or dragging from the gateway's port to empty space, drops a connected draft node and opens the inspector with the name field focused. Definition completes in the inspector: name, alias, and provider model. Binding completes with the cable gesture of decision 2, with no drawer detour. Decision 12 extends the plus to every source port.
4. **Cables are first-class objects.** A cable takes selection on press, and the inspector shows the bound target and its model. Dragging a cable's endpoint onto another compatible node rebinds it. Delete unbinds a selected cable. Under the one-target rule, a new cable dragged from a bound virtual model rebinds it, and the old cable falls.
5. **The live layer stays out of v1, but the minimap and the zoom controls ship.** The canvas ships static topology plus the status the engine already exposes: gateway running state and per-target standing as pin and cable colors. React Flow ships `MiniMap` and `Controls` as ready components, so the maintainer pulled both into v1 on 2026-08-08. They render restyled to the design template, never in the library's default skin. Flow animation, per-cable metric labels, and the metrics status bar defer to the rider ledger.
6. **A person drags nodes anywhere, and positions persist per gateway.** A tidy control restores the automatic arrangement, and a new node starts where that arrangement places it. The persisted layout is renderer-owned state in the `panel-width` pattern, never gateway config.
7. **The shipped target policy holds.** Every stored account kind stands as a target in the drop-picker: subscription, key, aggregator, and local. That matches `accountsStandingAsTarget` and the shipped `targets.feature` exactly. Whether a target can answer stays a per-request decision. Rider #117 closes as superseded, with the reasoning on its thread.
8. **Every drag gesture keeps a single-pointer twin.** Drag-only binding fails Web Content Accessibility Guidelines (WCAG) 2.2 success criterion 2.5.7 through failure F108. The plus affordance and the picker form the single-pointer path for every binding a cable drag can create. The accessibility contract below carries the full requirement set.
9. **Delete on a selected virtual model node removes the definition after a confirm dialog.** Cable deletion, which only unbinds, stays confirmation-free. Undo and redo stay out of v1 and enter the rider ledger.
10. **An abandoned draft survives.** A draft node abandoned mid-definition stays on the canvas in a distinct draft treatment. It holds across deselection, inspector close, and leaving the screen, exactly like the shipped `useHeldDraft` behavior. It stays until the person completes the definition or deletes the node.
11. **The interaction layer adopts `@xyflow/react` 12.11.2 in full.** React Flow owns the viewport, pan and zoom, node drag, edge rendering, and connection drag. Nodes and cables render as custom types wrapping the existing `node-card` and `dot-grid` vocabulary, so the design system keeps owning the rendered look.
12. **The plus affordance lives on every source port, in every state.** An amendment to decision 3, ratified at gate 1 from the design-critic pass. The gateway's plus opens the draft virtual model, and a virtual model's plus opens the drop-picker. A wired gateway never loses its add path, and the single-pointer twin of decision 8 stays real.
13. **Node tint splits by element.** The card frame carries the role tint: teal for a gateway, blue for a virtual model, purple for a target, and orange reserved for the router. The 17px kicker glyph chip carries the account-kind tint. Locked at gate 1 to resolve the collision between the template's role tints and the shipped account-kind tints.
14. **A broken binding keeps its cable and lands on a ghost target node.** When a target leaves the registry, the cable terminates on a dashed ghost node labeled as removed. Repair is the same cable gesture as any rebind. Locked at gate 1.

## The picked approach

Three candidates competed, each bound by the locked decisions, and all three tied at 19 of 25 in the panel's scoring. The maintainer picked candidate A on 2026-08-08 for its intuitiveness ceiling and for the project's search-before-build rule. The full write-ups live in `discovery/candidate-panel.md`.

**Candidate A, full adoption of `@xyflow/react` 12.11.2, picked.** React Flow owns the mechanics, and the slice keeps its draft machinery, read models, picker, and inspector wiring. `gateway-stage.tsx` becomes a thin provider host, and `usePressAway` retires because `onPaneClick` takes its job. Each decision maps to a documented library surface:

- The Add Node On Edge Drop pattern powers the decision 2 drop-picker.
- The Button Handle pattern hosts the decision 3 plus affordance.
- `onReconnect` rebinds a cable, and `deleteKeyCode` unbinds one, per decision 4.
- `isValidConnection` enforces the one-target rule during a drag.
- `A11yDescriptions` publishes the live region the accessibility contract requires.

Three new pure lib modules keep the graph logic testable:

- `node-graph.ts` derives nodes and edges from engine truth.
- `tidy-layout.ts` arranges left to right with a reserved router column.
- `canvas-positions.ts` persists the per-gateway position overlay in the `panel-width` pattern.

**Candidate B, a hand-rolled stage, rejected.** Zero new dependencies, the smallest blast radius, and a property-testable core spoke for it. It lost on feel: gesture quality rests on first-party tuning, zoom falls out of v1, and every accessibility affordance lands as new code.

**Candidate C, the `@xyflow/system` primitives under a first-party React layer, rejected.** It keeps full pixel ownership with far less first-party mechanics than candidate B. It lost on stability: the package versions React Flow's internal layer at 0.0.x with no dedicated docs, so any bump can break without notice. The accessibility surface also stays first-party, which candidate A buys ready-made.

**Dependency facts and the decision record.** The published manifest of `@xyflow/react` 12.11.2 declares `license: "MIT"` and a React peer range that React 19.2.8 satisfies. Its dependencies are `zustand`, `classcat`, and `@xyflow/system`, which pulls the `d3` drag, selection, and zoom modules. The attribution badge is a request, never a license term. An Architecture Decision Record (ADR) lands with the implementation and records the adoption, the attribution decision, and the transitive license sweep.

**Platform fit.** React Flow's scroll defaults fit the web, not macOS. The canvas sets `panOnScroll` on, `zoomOnScroll` off, and `zoomOnPinch` on, so a two-finger scroll pans and a pinch zooms.

**Two named risks with acceptance steps.** First, React Flow's internal store must never become a second source of truth beside derived engine state. `node-graph.ts` stays the single writer of graph shape, and positions stay the only library-owned state. Second, the packaged renderer runs under a Content Security Policy (CSP) of `style-src 'self'`, while the dev server carries `'unsafe-inline'`. Release 12.11.2 applies viewport transforms through imperative style writes, so a packaged-build smoke check proves that write path before the feature lands.

**Testing posture.** The repository's browser tests run in real Chromium, which matches React Flow's own testing guidance and needs no shims. Cable-drag e2e scenarios drive explicit pointer sequences and assert the outcome in the read model, never gesture internals. Canvas stories pin node positions and skip the fit-view animation, so visual snapshots stay stable.

## The inspector

The inspector draws a selection-subject header over one body per subject: gateway, virtual model, target, and cable. The drawer's "Add virtual model" button retires, and the persistent plus of decision 12 takes its job. Selecting any node opens the inspector when it stands closed. The width contract is `panelBounds.inspector`, with a 260 minimum, a 304 standing width, and a 480 maximum. The width never hardcodes to a fixed 304.

## Design-system gap analysis

The visual reference lives in the Claude Design project "recompose-design-system" at `templates/gateway/index.html`. The template draws a three-column app shell over a 22px dot grid: a 248px sidebar, the stage, and a 304px inspector. Node cards measure 158 by 78. Each card carries a kicker row with a 17px tinted glyph chip and an uppercase 10px type label. Under the kicker sit a 13px semibold name and an 11px mono subtitle. The kind tints run teal for the gateway, blue for a virtual model, purple for a target, and orange reserved for the router. Ports are 9px circles, 34px from the card top, on the left or right edge, tinted when live. Selection paints a tinted border, a 3.5px outer glow ring, and a tinted wash. Cables draw as 1.8px bezier paths tinted by state.

The renderer already ships the `node-card` and `dot-grid` utilities in `theme.css`, and the design project stubs `components/canvas/NodeCard.jsx` and `Wire.jsx`.

### New tokens

`theme.css` gains two token families, and the design system's source of truth records them first:

- Cable stroke tokens: one per cable state, covering the resting, live, broken, and selected treatments.
- Port tokens: the 9px circle in its resting and live tints.
- Restyle tokens for the minimap card and the zoom tools, where the template names a value the scale lacks.
- A text token for the 11px mono subtitle, never a snap to the 12px neighbor.
- Hit-area tokens for the 24px pointer targets: the port-number field already claims `--spacing-port`, so this family takes a different name.

Where the template asks for a value the token scale lacks, the token follows the template. The shipped gateway node updates to the subtitle token. Node names truncate with an ellipsis, and a native title tooltip reveals the full name. The flow-green token stays out, exactly as ADR-0053 rules: it lands only when the canvas carries live traffic.

### New component folders

Every component below owns a folder under a `ui/` segment and ships its `*.stories.tsx` sibling before the branch leaves the machine:

- `gateway-node`, `virtual-model-node`, `target-node`, and `draft-model-node`: custom node types wrapping `node-card`.
- `binding-cable`: the custom edge, its state tints, and the in-flight connection line.
- `drop-picker`: the popover that wraps the untouched `OptionList` over `targetGroups`.
- `canvas-minimap`: the `MiniMap` restyle as the template's 172 by 112 bottom-right map card.
- `canvas-zoom-controls`: the `Controls` restyle as the template's bottom-left tools cluster.

### Canvas furniture

The `Controls` interactivity lock stays off. The `MiniMap` mask and node fill derive from `light-dark()` theme tokens. The minimap keeps an inset clear of the panel separator's hit area, and the zoom buttons size to the shipped push-button recipe. A Canvas menu carries Zoom In, Zoom Out, Zoom to Fit, and Tidy. It resolves the `Cmd+=`, `Cmd+-`, and `Cmd+0` collision with Electron's page-zoom menu roles.

### What v1 omits from the template

The template shows animated flow dashes, per-cable wire metric labels, and a metrics status bar. All three stay out of v1 and enter the rider ledger. Router nodes stay out too: they wait for the router feature itself, never for a rider.

### Interaction state treatments

Five interaction states exist in no design template yet. Gate 1 settled four of them, and the Claude Design project absorbs the treatments through the `NodeCard.jsx` and `Wire.jsx` stubs:

- Draft node, per decision 10: a dashed 1.5px border on the existing `node-card` box in the strong line color, with a placeholder name in secondary ink. Never card-level opacity, and never tertiary ink. A `claude-in-chrome` pass checks both schemes before it lands.
- Selected cable, per decision 4: the stroke widens and gains an under-stroke halo reusing the `node-card` glow recipe. Both endpoints paint as port-tinted grab handles with the 24px hit box and a grab cursor.
- Drop-picker, per decision 2: on a drop over empty canvas, the target node materializes first as a pending card, and the popover anchors to that card, never to a bare coordinate. The option list caps its height with a scroll region. Esc dismisses the picker and removes the pending card, the stated exception to the never-silent-cancel rule.
- Plus affordance, per decisions 3 and 12: a persistent control on every source port.
- Keyboard focus ring on ports and cables: the one state still without a treatment. It needs authoring in the Claude Design project before or during implementation.

## Accessibility contract

The four requirements below are first-class acceptance criteria, and they land in the delta spec at the freeze.

**A single-pointer twin for every drag.** Every binding a cable drag can create also arrives through a sequence of single-pointer activations, with no dragging. The plus affordance and the drop-picker form that path. This satisfies WCAG 2.2 success criterion 2.5.7, Dragging Movements, at Level AA, and closes failure F108.

**A keyboard path.** Nodes and cables are reachable and operable by keyboard, and a person can create a binding with no pointer at all. React Flow ships focusable nodes and edges, selection keys, and arrow-key movement. It ships no keyboard path between handles, so keyboard binding creation is this feature's own work, anchored on the plus affordance.

**A live region.** Creating, rejecting, and removing a binding announces through a live region. `A11yDescriptions` publishes the region, and every binding outcome feeds it.

**A 24px hit target on every pointer target.** Ports, the plus, and cable endpoints each carry a transparent hit area of at least 24px by 24px. This satisfies WCAG 2.2 success criterion 2.5.8, Target Size (Minimum), at Level AA. React Flow's `connectionRadius` and the custom edge's `interactionWidth` land as pinned, named values.

## Capabilities

### New capabilities

- `gateway-canvas`: render the gateway composition as nodes and cables, edit it through direct manipulation, and honor the accessibility contract above.

### Modified capabilities

- `virtual-models`: the requirement "A virtual model maps to one target" pins the drawer takeover as the add gesture. The canvas replaces that gesture with the draft node and the inspector, so the delta spec carries the modified requirement. The one-target contract and the target policy hold unchanged, per decision 7.

## Impact

The entry proposal scoped this slice as renderer-only, and that claim no longer holds:

- `apps/desktop/package.json` gains `@xyflow/react` 12.11.2, pinned exactly, with its transitive set cleared through the license gate.
- A new ADR under `docs/adr/` records the adoption, the attribution decision, and the license sweep.
- `theme.css` gains the cable stroke, port, hit-area, subtitle, and restyle token families.
- The main-process menu template gains the Canvas menu and its zoom shortcuts.
- The e2e suite gains cable and keyboard scenarios beside the shipped `targets.feature`.
- The engine stays untouched: the canvas draws from read models and invokes mutations that already ship.

## Riders filed on merge

The minimap and the zoom controls left this list when the maintainer pulled them into v1. The feature files four riders when it merges, and closes one:

1. Flow animation: the animated dashes that show traffic on a live cable.
2. Per-cable metric labels: the wire metrics the template draws beside each cable.
3. The metrics status bar under the stage.
4. Undo and redo for canvas edits.

Rider #117 closes as superseded. The shipped target policy offers every stored account kind, and each request decides whether its target can answer. The closing comment carries that reasoning, per decision 7.
