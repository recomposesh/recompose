# Candidate panel

Three Fable writers produced independent approaches on 2026-08-08, each bound by the locked decisions in `brainstorm-decisions.md`. Scores run 1 to 5, higher is better; for burden and blast radius, higher means lighter and smaller. All three tie at 19 of 25; the profiles differ, and the maintainer picked A for its intuitiveness ceiling and the search-before-build rule.

| Criterion                    | A: full React Flow | B: hand-rolled | C: hybrid primitives |
| ---------------------------- | ------------------ | -------------- | -------------------- |
| Fidelity to locked decisions | 5                  | 5              | 5                    |
| Intuitiveness ceiling        | 5                  | 3              | 4                    |
| Gate and testing burden      | 3                  | 3              | 3                    |
| Blast radius                 | 3                  | 5              | 4                    |
| Delivery size                | 3                  | 3              | 3                    |

## A: full adoption of @xyflow/react 12.11.2 (picked)

React Flow owns viewport, pan and zoom, node drag, edge rendering, and connection drag. The slice keeps its draft machinery, read models, picker, and inspector wiring; `gateway-stage.tsx` becomes a thin provider host and `usePressAway` retires in favor of `onPaneClick`. New ui folders: gateway, virtual-model, target, and draft-model nodes, the binding cable, and the drop-picker wrapping `OptionList`. New pure lib modules: `node-graph.ts` (nodes and edges from engine truth), `tidy-layout.ts` (left to right with a reserved router column), `canvas-positions.ts` (per-gateway overlay in the `panel-width` pattern). Decision mechanisms: Add Node On Edge Drop for the drop-picker, Button Handle for the plus, `onReconnect` for rebind, `deleteKeyCode` for unbind, `isValidConnection` for the one-target rule, `A11yDescriptions` for the live region. Riskiest part: keeping React Flow's internal store from becoming a second source of truth beside derived engine state, and proving the imperative viewport transform under packaged `style-src 'self'`.

## B: hand-rolled stage, zero new dependencies

Three layers inside the existing stage: an SVG cable layer, absolutely positioned `node-card` nodes, and a popover layer. No viewport transform at all: fixed scale with native overflow scroll, so pan is platform scroll and zoom is cut from v1. One pure pointer-capture reducer (`cable-drag.ts`) drives every gesture. Honest costs: feel is only as good as first-party tuning, no inherited snap radius or autopan, and the a11y scaffolding is fully first-party. Strengths: zero dependencies, no CSP or license proof, the smallest blast radius, and a fully property-testable core.

## C: hybrid, @xyflow/system primitives under our own React layer

Pins only `@xyflow/system` behind three facades: `use-canvas-viewport` (XYPanZoom), `use-node-drag` (XYDrag), and a first-party `cable-machine.ts` reducer using the library's bezier and coordinate helpers. Keeps full pixel ownership and macOS-native gesture config with far less first-party mechanics than B. Riskiest part: the package is the 0.0.x versioned internal layer of React Flow with no dedicated API docs, so any bump can break without notice; and the whole a11y surface stays first-party, which is exactly what A buys ready-made.
