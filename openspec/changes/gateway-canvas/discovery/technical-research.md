# Discovery brief: gateway-canvas (tier full)

## Scope and what I read

Repository side: `openspec/changes/gateway-canvas/proposal.md` and `openspec/changes/gateway-canvas/specs/gateway-canvas/spec.md`, `apps/desktop/package.json`, `apps/desktop/src/renderer/src/pages/gateway-canvas/ui/gateway-stage/gateway-stage.tsx`, `apps/desktop/src/renderer/src/pages/home/ui/ghost-graph/ghost-graph.tsx`, `apps/desktop/src/renderer/csp-policy.ts`, `apps/desktop/src/renderer/src/app/styles/theme.css` (grep), `docs/adr/0053-flow-green-is-a-canvas-token-the-palette-does-not-carry-yet.md`, `pnpm-workspace.yaml` (grep). Web side: official xyflow, W3C WAI, and MDN documentation.

## Finding 1: the renderer carries no graph library today, and the canvas is a stub

`apps/desktop/package.json` lists no graph, diagram, drag, gesture, or canvas dependency. The React stack is React 19.2.8, Vite 8.1.5, Tailwind 4.3.3, TanStack Router 1.170, TanStack Query 5.101, Base UI 1.6, Electron 43.2, on pnpm workspaces.

`apps/desktop/src/renderer/src/pages/gateway-canvas/ui/gateway-stage/gateway-stage.tsx` is a plain `<section className="... dot-grid">` holding one `node-card` button. There is no viewport, no transform, no edge, no hit testing. The visual vocabulary the canvas needs already exists as Tailwind utilities in `apps/desktop/src/renderer/src/app/styles/theme.css`: `@utility dot-grid` (22px radial-gradient grid on `--color-dot-grid`) and `@utility node-card` (1.5px `--color-accent-ink` border, `--radius-card`, `--shadow-raised`). `apps/desktop/src/renderer/src/pages/home/ui/ghost-graph/ghost-graph.tsx` already draws the gateway-to-virtual-model shape as inline SVG with a dashed connector, which is the visual reference for a cable at rest.

So the feature is a viewport and interaction problem, not a styling problem. The tokens survive whichever engine draws the nodes.

## Finding 2: React Flow (`@xyflow/react`) is the standard path, and it fits this stack

Latest stable is 12.11.2, published 2026-07-06 ([React Flow changelog](https://reactflow.dev/whats-new)). Verified from the published package manifest at `unpkg.com/@xyflow/react@12.11.2/package.json`:

- `license: "MIT"`
- `dependencies: { classcat: ^5.0.3, zustand: ^4.4.0, @xyflow/system: 0.0.79 }`
- `peerDependencies: { react: ">=17", react-dom: ">=17", @types/react: ">=17", @types/react-dom: ">=17" }`

React 19 is supported. The old blocker was zustand 4's peer range, tracked in [xyflow#5229](https://github.com/xyflow/xyflow/issues/5229) and [xyflow#5095](https://github.com/xyflow/xyflow/issues/5095); it was resolved by a zustand release, and the peer range on `@xyflow/react` itself is `>=17`, which React 19.2.8 satisfies. `@xyflow/system` carries the framework-agnostic `XYDrag` and `XYPanZoom` helpers and pulls `d3-drag`, `d3-selection`, and `d3-zoom` ([Migrate to React Flow 12](https://reactflow.dev/learn/troubleshooting/migrate-to-v12), [xyflow#4334](https://github.com/xyflow/xyflow/issues/4334)). Run the repository license gate against that transitive set before committing to it; I did not verify each d3 module's license text.

Attribution is a request, not a licence term. The docs state plainly that they cannot legally require the badge because the library is MIT, and ask commercial users who pass `proOptions={{ hideAttribution: true }}` to subscribe ([Remove attribution](https://reactflow.dev/learn/troubleshooting/remove-attribution)). Treat it as a maintainer decision, not a compliance blocker.

Prior art is dense: Langflow builds its canvas on React Flow, Flowise and Dify sit in the same React Flow ecosystem, and n8n ported the identical paradigm to Vue Flow, a community port of the React Flow API ([xyflow README](https://github.com/xyflow/xyflow)). I could not confirm Dify's canvas library from an official Dify source, so treat that one as unverified.

### Trade-off against hand-rolling SVG cables

Hand-rolling keeps the dependency count at zero and keeps every line inside the repository's own gates. The cost is that the canvas needs a viewport transform, wheel and pinch handling, node measurement, pointer capture, a drag state machine, bezier edge geometry, drop-target hit testing within a radius, a focus ring order across nodes and edges, and an `aria-live` region. React Flow ships all of that, plus a documented a11y surface (see Finding 3). Against `max-lines`, complexity, and the diff-scoped Stryker gate, a hand-rolled viewport is a large surface of node-side-equivalent logic to mutation-test for behaviour the library already proves upstream. The recommendation is React Flow, with the repository's own components as custom node types so `node-card` and `dot-grid` keep owning the pixels.

Alternatives I considered and set aside: tldraw (an infinite whiteboard, wrong primitive and a heavier licence question), Konva or PixiJS (canvas raster, gives up DOM semantics and therefore the a11y and Playwright story this repository depends on), Rete.js (node editor, far smaller ecosystem and no React 19 story surfaced), Foblex Flow (Angular).

## Finding 3: the spec as written fails WCAG 2.2 SC 2.5.7, and this is the biggest acceptance-criteria gap

The spec's second requirement says "A person MUST be able to drag a cable out of a node's port and drop it on a compatible node to create the binding." If dragging is the only way to create a binding, that is the exact failure condition F108 describes: the only way to actuate a function is dragging a target element from its initial position to another position, with no single-pointer alternative ([F108](https://www.w3.org/WAI/WCAG22/Techniques/failures/F108), [Understanding SC 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)). SC 2.5.7 Dragging Movements is Level AA in WCAG 2.2.

The escape is cheap and W3C names it: the alternative may be a series of single-pointer interactions, for example activating the element, opening a menu, and choosing a destination. Two conforming shapes, both of which React Flow supports:

- Click the source port, then click the target port (click-click connect).
- Click the plus affordance, then choose a target from a list.

The second one is already in the proposal. Requirement three ("a wire ending in a plus affordance that serves as the add-here entry point") is a single-pointer path to a binding. Make it the general path rather than the empty-state path, and SC 2.5.7 is satisfied by the same affordance the design already wants. Note that node repositioning by drag also falls under 2.5.7 if node positions are persisted state; if positions are purely cosmetic and auto-laid-out, that exposure disappears.

Recommended acceptance criteria to add to the spec before it freezes:

1. Every binding the cable drag can create is also creatable through a sequence of single pointer activations, with no dragging.
2. Nodes and cables are reachable and operable by keyboard, and a binding can be created without a pointer at all.
3. Creating, rejecting, and removing a binding is announced through a live region.

React Flow covers part of this out of the box and leaves one hole. Nodes and edges are focusable by default (`nodesFocusable` and `edgesFocusable` default `true`), Enter or Space selects, Escape clears, arrow keys move a node, `autoPanOnNodeFocus` defaults `true`, an `A11yDescriptions` component publishes an `aria-live` region, and 12.7.0 (2025-06-11) added `ariaRole`, `ariaLabelConfig`, and `domAttributes` ([Accessibility](https://reactflow.dev/learn/advanced-use/accessibility), [ReactFlow component API](https://reactflow.dev/api-reference/react-flow), [changelog](https://reactflow.dev/whats-new)). What it does not ship is keyboard-driven connection creation between handles: the `<Handle>` docs describe connection points, not a keyboard path to connect them ([Handle](https://reactflow.dev/api-reference/components/handle)). That gap is this feature's own work, and the plus affordance is the natural place to put it.

## Finding 4: the "Excalidraw feel" and the "plus affordance" both map to named React Flow examples

- **Plus affordance at the end of an auto-drawn wire.** The official [Add Node On Edge Drop](https://reactflow.dev/examples/nodes/add-node-on-edge-drop) example uses `onConnectStart` and `onConnectEnd`, checks `connectionState.isValid`, and creates a node at `screenToFlowPosition(...)` when the cable is released on empty canvas. The [Button Handle](https://reactflow.dev/ui/components/button-handle) component is a handle rendering a plus button that opens a picker, and it uses `useConnection` to hide itself while a drag is in flight. Between them they are requirement three, already written down by the library authors.
- **Fluidity.** `connectionRadius` defaults to `20` and is the snap distance around a handle where a release still lands a connection ([API reference](https://reactflow.dev/api-reference/react-flow)). The [Easy Connect](https://reactflow.dev/examples/nodes/easy-connect) example turns the whole node into a drop target, which is the closest analogue to how Excalidraw binds an arrow to whatever shape it lands on. [Temporary Edges](https://reactflow.dev/examples/edges/temporary-edges) keeps a released-but-incomplete cable alive as a reconnectable ghost, which is worth considering for the "drop outside a compatible node" case the spec currently resolves by discarding.
- **Validation.** `isValidConnection` returning `false` blocks the edge, and handles pick up `connecting` and `valid` class names during the drag, which is the hook for painting a compatible port ([Connection events](https://reactflow.dev/examples/interaction/connection-events)).
- **Custom cable rendering.** `connectionLineComponent` replaces the in-flight line ([Connection line example](https://reactflow.dev/examples/edges/custom-connectionline)), which is where the eventual flow-green treatment would live.

## Finding 5: macOS pan and zoom defaults are wrong out of the box

React Flow defaults `zoomOnScroll: true` and `panOnScroll: false` ([API reference](https://reactflow.dev/api-reference/react-flow)). On macOS, a two-finger trackpad scroll should pan and a pinch should zoom, which is what Figma, Sketch, and Excalidraw do. For a desktop app that runs `hig-doctor` over `src/renderer/src` in its lint script, shipping the web default reads as a defect. Set `panOnScroll: true`, `zoomOnScroll: false`, and leave `zoomOnPinch: true`. Confirm the final choice against the `hig` MCP server or the `macos-design-guidelines` skill; I did not query either.

## Finding 6: CSP and Tailwind integration, one item to prove rather than assume

`apps/desktop/src/renderer/csp-policy.ts` emits `style-src 'self' 'unsafe-inline'` in serve mode and `style-src 'self'` in build mode. Per [MDN's style-src reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/style-src), a strict `style-src` blocks `<style>` elements, `style="..."` attributes, `setAttribute("style", ...)`, and `cssText` assignment, but does not block per-property CSSOM writes such as `element.style.transform = ...`. React sets the `style` prop property by property, which is why React inline styles survive strict CSP. React Flow's base styles ship as a real stylesheet you import yourself, so Vite extracts them into a bundled file served from `'self'`.

The one thing to prove: release 12.11.2 lists "applying viewport transforms imperatively" as a performance change ([changelog](https://reactflow.dev/whats-new)). If that imperative write goes through `style.transform =` it is fine under `style-src 'self'`; if it ever goes through `setAttribute('style', ...)` or `cssText`, the packaged build breaks while `pnpm dev` looks healthy, because serve mode carries `'unsafe-inline'` and build mode does not. Make a packaged-build smoke check part of the acceptance work rather than trusting the dev run. Tailwind 4 wants the stylesheet imported from the global CSS after `@import "tailwindcss"` rather than from a component file ([React Flow UI on React 19 and Tailwind 4, 2025-10-28](https://reactflow.dev/whats-new/2025-10-28)).

## Finding 7: testing implications

React Flow's own [testing guide](https://reactflow.dev/learn/advanced-use/testing) recommends Cypress or Playwright because the library measures nodes in the real DOM before it can render edges, and it documents jsdom shims (`ResizeObserver`, `DOMMatrixReadOnly`, `offsetWidth`/`offsetHeight`, `SVGElement.getBBox`) only for jest. This repository already runs component tests in Vitest browser mode against real Chromium (`@vitest/browser-playwright`, `vitest-browser-react` in `apps/desktop/package.json`), so it lands on the "real browser, no shims" side of that guide, and `d3-drag`, which the guide says does not work outside a browser, works there.

Two concrete gotchas to plan for:

- Playwright drag against React Flow v12 has a reported `steps` off-by-one where `page.mouse.move(x, y, { steps: n })` executes only n minus 1 steps ([xyflow#4775](https://github.com/xyflow/xyflow/issues/4775)). Drive cable drags with an explicit `mouse.down` then several `mouse.move` calls then `mouse.up`, and assert on outcome state rather than on the gesture.
- Assert bindings through observable outcome (the binding exists in the read model, and a cable is present), never through `onConnect` call counts, which the repository's `.claude/rules/tdd-bdd.md` forbids anyway.

Also relevant to gates: every new component under a `ui/` segment needs its `*.stories.tsx` sibling, and Chromatic snapshots of an auto-fitted viewport will be unstable unless the story pins node positions and disables `fitView` animation.

## Recommendation

1. Adopt `@xyflow/react` 12.11.2, MIT, pinned exactly as the rest of `apps/desktop/package.json` pins its dependencies, and write an ADR recording the choice, the attribution decision, and the rejected hand-rolled alternative.
2. Render nodes as custom node types wrapping the existing `node-card` and `dot-grid` utilities so the canvas inherits the design system rather than React Flow's default skin.
3. Amend the spec before it freezes so that every binding reachable by drag is also reachable by a single-pointer sequence and by keyboard, citing WCAG 2.2 SC 2.5.7 and F108 in the requirement.
4. Build the plus affordance on the Add Node On Edge Drop and Button Handle patterns, and treat it as the accessible path, not only the empty-state garnish.
5. Configure `panOnScroll: true`, `zoomOnScroll: false`, `zoomOnPinch: true` for macOS-native feel, and confirm against HIG.
6. Prove the packaged build under `style-src 'self'` as an explicit acceptance step.

## Gaps in this brief

- The proposal points at "the Claude Design project reference at `templates/gateway/index.html`", and a glob for `templates/**/*.html` in this checkout returns nothing, so the visual reference lives outside the repository and I could not read it. Every visual claim here comes from `theme.css` and the existing components instead.
- I did not read `add-model-flow`, `gateway-drawer`, or `served-model-row` under `apps/desktop/src/renderer/src/pages/gateway-canvas/ui/`, so I cannot say how the canvas should absorb or coexist with the current form-based add flow. That reconciliation is an open design question for the brainstorm.
- No bundle-size figure: npm and npmx both returned HTTP 403 to the fetch tool, so I have the dependency list from the published manifest but no measured install or gzip size.
- No Mobbin lookup and no HIG MCP query; the macOS gesture recommendation rests on platform convention and React Flow's documented defaults, not on a cited HIG rule.
- Dify's use of React Flow is widely repeated but I found no official Dify source for it; Langflow, Flowise, and n8n via Vue Flow are the safer prior-art citations.
- ADR-0053 records that flow green has no token yet and lands when the canvas gains live traffic, so this feature should not paint cables flow green unless it also carries live traffic, which the current spec does not.

Sources:

- [React Flow changelog](https://reactflow.dev/whats-new)
- [React Flow component API reference](https://reactflow.dev/api-reference/react-flow)
- [React Flow accessibility guide](https://reactflow.dev/learn/advanced-use/accessibility)
- [React Flow Handle component](https://reactflow.dev/api-reference/components/handle)
- [React Flow testing guide](https://reactflow.dev/learn/advanced-use/testing)
- [Add Node On Edge Drop example](https://reactflow.dev/examples/nodes/add-node-on-edge-drop)
- [Button Handle component](https://reactflow.dev/ui/components/button-handle)
- [Easy Connect example](https://reactflow.dev/examples/nodes/easy-connect)
- [Temporary Edges example](https://reactflow.dev/examples/edges/temporary-edges)
- [Custom connection line example](https://reactflow.dev/examples/edges/custom-connectionline)
- [Connection events example](https://reactflow.dev/examples/interaction/connection-events)
- [Migrate to React Flow 12](https://reactflow.dev/learn/troubleshooting/migrate-to-v12)
- [React Flow UI on React 19 and Tailwind 4 (2025-10-28)](https://reactflow.dev/whats-new/2025-10-28)
- [Remove attribution](https://reactflow.dev/learn/troubleshooting/remove-attribution)
- [xyflow repository README](https://github.com/xyflow/xyflow)
- [xyflow#5229 React 19 not supported](https://github.com/xyflow/xyflow/issues/5229)
- [xyflow#5095 zustand bump for React 19](https://github.com/xyflow/xyflow/issues/5095)
- [xyflow#4334 @types packages as dependencies](https://github.com/xyflow/xyflow/issues/4334)
- [xyflow#4775 Playwright drag steps regression](https://github.com/xyflow/xyflow/issues/4775)
- [W3C Understanding SC 2.5.7 Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)
- [W3C F108 dragging failure technique](https://www.w3.org/WAI/WCAG22/Techniques/failures/F108)
- [MDN Content-Security-Policy style-src](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/style-src)
- [@xyflow/react 12.11.2 published manifest](https://unpkg.com/@xyflow/react@12.11.2/package.json)
