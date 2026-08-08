# Acceptance references for `gateway-canvas`

## Scope, and the gap stated up front

Repository side I read `openspec/changes/gateway-canvas/proposal.md`, `openspec/changes/gateway-canvas/specs/gateway-canvas/spec.md`, `openspec/changes/gateway-canvas/discovery/technical-research.md`, `openspec/changes/gateway-canvas/discovery/brainstorm-decisions.md`, `openspec/changes/gateway-canvas/discovery/code-map.md`, and `openspec/changes/archive/2026-08-08-gateway-virtual-models/discovery/acceptance-references.md` for voice, plus targeted greps that surfaced `apps/desktop/.storybook/preview.ts`, `apps/desktop/package.json`, `apps/desktop/src/renderer/src/app/styles/main.css`, `apps/desktop/src/main/windows/window-options.ts`, `apps/desktop/src/main/windows/main-window.ts`, and `apps/desktop/src/renderer/src/app/routes/-app-shell.stories.tsx`. Web side I read xyflow official docs, xyflow and Excalidraw issue trackers, and W3C WAI.

Gaps: I did not open `apps/desktop/src/renderer/src/pages/gateway-canvas/ui/gateway-stage/gateway-stage.tsx` or the existing draft hooks (the code map already describes them and the read budget went to the gate files), the design template at `templates/gateway/index.html` lives outside this checkout, and three field reports below are known to me only through search summaries rather than a direct fetch. Each of those is flagged where it is used.

## 0. Two contradictions inside the change's own records, worth settling before the spec freezes

1. **Missed drop.** `openspec/changes/gateway-canvas/specs/gateway-canvas/spec.md` says "A drop outside a compatible node MUST leave the composition unchanged." Brainstorm decision 2 in `openspec/changes/gateway-canvas/discovery/brainstorm-decisions.md` says the opposite: "Dropping a dragged cable on empty space opens a compact picker ... A missed drop becomes an add, never a silent cancel." Only one of those can be the acceptance criterion. The brainstorm is the later record and matches the [Add Node On Edge Drop](https://reactflow.dev/examples/nodes/add-node-on-edge-drop) prior art, so the spec text is the one to amend.
2. **Plus affordance reach.** The spec scopes the plus affordance to a gateway "with nothing wired". Brainstorm decision 8 makes the dragless twin a constraint on every binding, which means the plus cannot be an empty-state garnish. The requirement needs rewriting so the affordance is always present, not only when the canvas is bare.

## 1. Gates this repository already enforces, which become acceptance criteria for free

- `apps/desktop/.storybook/preview.ts` sets `a11y: { test: 'error' }` and `apps/desktop/package.json` pins `@storybook/addon-a11y` 10.5.4. Every canvas story fails the build on an axe violation. React Flow's own DOM ships inside those stories, so its default markup has to pass axe under this project's error gate, not merely "not be flagged".
- `apps/desktop/src/main/windows/window-options.ts` sets `titleBarStyle: 'hidden'` on darwin, and `apps/desktop/src/renderer/src/app/styles/main.css` paints `-webkit-app-region: drag` (line 31) with a `no-drag` escape (line 35). A frameless drag region swallows pointer events wherever it overlaps. `apps/desktop/src/renderer/src/app/routes/-app-shell.stories.tsx` already asserts the computed `-webkit-app-region` value from the page, which is exactly the shape the canvas assertion should take.
- `apps/desktop/src/main/windows/main-window.ts` already guards `will-navigate` and installs a `setWindowOpenHandler` that routes to `shell.openExternal`. React Flow renders an attribution anchor pointing at reactflow.dev unless it is suppressed, so that anchor lands in a guarded path rather than an unguarded one. Whether to suppress it is a maintainer and licence decision, per [Remove attribution](https://reactflow.dev/learn/troubleshooting/remove-attribution).

## 2. Accessibility: two normative criteria, one of which the library does not cover

**SC 2.5.7 Dragging Movements (AA).** Already established in the technical research and locked as brainstorm decision 8. Drag-only binding is the exact shape of [F108](https://www.w3.org/WAI/WCAG22/Techniques/failures/F108). Note the widened exposure: brainstorm decision 6 persists node positions per gateway, which makes node repositioning persisted state and therefore also a dragging movement under [Understanding SC 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html). React Flow covers that half already, since arrow keys move a focused node.

**SC 2.5.8 Target Size (Minimum) (AA), not yet named anywhere in this change.** The [W3C Understanding page](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) states "The size of the target for pointer inputs is at least 24 by 24 CSS pixels", with a spacing exception that passes an undersized target only when a 24 CSS pixel circle centred on its bounding box does not touch another target or another undersized target's circle. Ports, the plus affordance, and cable endpoints are all pointer targets. The React Flow docs do not publish a default handle size, and community threads report the built-in drop zones as too small to hit reliably: [xyflow#1155](https://github.com/wbkd/react-flow/issues/1155) asks how to enlarge the circles and zones, and [discussion #1180](https://github.com/wbkd/react-flow/discussions/1180) describes the drop zones as "pixel-perfect small". The library's own answer is the `connectionRadius` prop, added in [v11.5.0](https://xyflow.com/blog/react-flow-v-11-5) and defaulting to 20, plus the [Easy Connect](https://reactflow.dev/examples/nodes/easy-connect) pattern that turns the whole node into a drop target. A widely repeated "6px default" figure comes from reading the shipped stylesheet rather than from documentation, so treat the number as unverified and measure the painted box instead.

**Keyboard connection is our work, and the sources initially disagreed.** I fetched [the React Flow accessibility guide](https://reactflow.dev/learn/advanced-use/accessibility): it documents `nodesFocusable`, `edgesFocusable`, `disableKeyboardA11y`, `autoPanOnNodeFocus`, `ariaLabelConfig`, `ariaRole`, and `domAttributes`; Tab moves focus through nodes and edges, Enter or Space selects, Escape clears, arrow keys move a selected node with Shift for speed. It documents no key sequence for starting or completing a connection, and mentions handles only through the `handle.ariaLabel` string. A search summary suggested [xyflow#5633](https://github.com/xyflow/xyflow/issues/5633) proved keyboard-initiated connections exist; I fetched the issue, and its reproduction is "start a connection from a handle while moving the node with arrow keys", which is a mouse-started connection plus keyboard node movement. Conflict resolved: React Flow ships no keyboard path from one handle to another, matching the technical research. The plus affordance and picker are the keyboard path, and they are this feature's own code.

**The live region is louder than it should be.** The same accessibility guide states the `A11yDescriptions` component "includes an element with `aria-live=\"assertive\"`" and announces "Moved selected node {direction}. New position, x: {x}, y: {y}" on node movement. Assertive interrupts whatever the screen reader is saying. [MDN's live region guidance](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions) reserves assertive for time-sensitive notifications, and comparable projects have walked it back: [microsoft/vscode#185371](https://github.com/microsoft/vscode/issues/185371) opened a review of assertive overuse across the codebase in favour of polite. A per-arrow-key coordinate announcement is the queue-flooding pattern reported against assertive regions in [FreedomScientific/standards-support#782](https://github.com/FreedomScientific/standards-support/issues/782). `ariaLabelConfig` is the documented override.

## 3. Interaction collisions users actually hit, mapped to this canvas

- **A connection drag that ends on empty canvas also fires `onPaneClick`.** [xyflow#5057](https://github.com/xyflow/xyflow/issues/5057), filed 2025-02-26, closed by PR #5089. This is precisely the collision the code map predicts for `apps/desktop/src/renderer/src/pages/gateway-canvas/lib/use-press-away.ts`: the drop that is supposed to open the picker would also read as a press on the field and clear selection. Fixed upstream, but the criterion still belongs in the spec because the repository's own press-away handler is a second, independent listener.
- **Backspace and Delete reach the canvas from text fields.** [xyflow#2254](https://github.com/wbkd/react-flow/issues/2254) reports the delete key handler preventing backspace elsewhere on the page, and [xyflow#3416](https://github.com/xyflow/xyflow/issues/3416) reports Shift plus Backspace deleting the selected node while a person is typing, reproducible on React Flow's own home page, because the internal handler skips input elements only when no modifier is held. Both are known to me through search summaries rather than a direct fetch. Given brainstorm decision 3 (a draft node opens the inspector with the name field focused) and decision 9 (Delete removes a definition behind a confirm), this is the highest-probability defect in the whole feature.
- **`nodrag` suppresses selection as a side effect.** [xyflow#4493](https://github.com/xyflow/xyflow/issues/4493) reports that in v12 the `nodrag` class stopped preventing selection the way it did in v11; [xyflow#3069](https://github.com/wbkd/react-flow/issues/3069) reports the inverse, a `nodrag` element still selecting its node under `selectNodesOnDrag: false`; [xyflow#4980](https://github.com/xyflow/xyflow/issues/4980) ties the behaviour to `nodeDragThreshold`. The [utility classes doc](https://reactflow.dev/learn/customization/utility-classes) also notes that `nodrag` is wrong when a node is not draggable and `nopan` is the right class there. The canvas puts a plus button, and possibly fields, inside nodes, so press semantics need explicit coverage rather than trust.
- **Snap radius versus the empty-canvas picker.** Community reports on the add-node-on-edge-drop pattern note that with `connectionRadius` snapping active, a release near a handle can still be read as a release on the pane and add a node when a connection was intended (surfaced through [discussion #3497](https://github.com/xyflow/xyflow/discussions/3497)). Under brainstorm decision 2 that misfire opens a target picker after a person aimed at a real port, which is a visible wrong outcome rather than a silent one.

## 4. Platform failures: this app ships to macOS, Windows, and Linux

- **Trackpad pinch escapes the canvas and zooms the page.** [xyflow#5074](https://github.com/xyflow/xyflow/issues/5074) (React Flow 12.4.2, Chrome 133, macOS 15.1.1) reports pinch over a node zooming the entire viewport instead of the flow, and [xyflow#5494](https://github.com/xyflow/xyflow/issues/5494) (12.8.1, Chrome 139 arm64, macOS 15.4.1) reports the same once `panOnScroll` is enabled, which is exactly the configuration the technical research recommends for macOS feel. [xyflow#931](https://github.com/wbkd/react-flow/issues/931) adds that ctrl plus wheel ignores `panOnScroll: false` and `zoomOnScroll: false` and eventually hands the gesture to browser zoom. In a browser tab, page zoom is recoverable. In a packaged Electron window it looks like the app broke. These reports come from search summaries; the version and OS detail is quoted from them but I did not fetch the issues individually.
- **Non-integral display scaling offsets cables from their ports.** [xyflow#4954](https://github.com/xyflow/xyflow/issues/4954), fetched: React Flow 12.3.4, Windows 11 at 125% scaling, Chromium 111, connection line no longer matching the handle position once a node sits far from the origin. Closed, with no workaround recorded in the issue body. Persisted per-gateway positions (decision 6) make far-from-origin coordinates reachable in normal use.
- **The frameless titlebar drag region.** Covered in section 1. The criterion is a computed-style assertion, not a visual check.
- **Packaged CSP.** Carried forward from technical research finding 6: `style-src 'self'` in build mode versus `'unsafe-inline'` in serve mode means a broken packaged canvas can hide behind a healthy `pnpm dev`.

## 5. Render lifecycle: the first paint is where this class of library fails

React Flow cannot draw an edge until it has measured the node and located the handle, so a naive mount shows nodes stacked at the origin with no cables for a frame. The official guidance is `width`/`height` or `initialWidth`/`initialHeight` on nodes plus `useNodesInitialized()`, discussed at length in [discussion #2973](https://github.com/xyflow/xyflow/discussions/2973) and the [SSR configuration guide](https://reactflow.dev/learn/advanced-use/ssr-ssg-configuration). The [common errors page](https://reactflow.dev/learn/troubleshooting/common-errors), which I fetched, adds the failure list worth turning into criteria: a missing stylesheet import leaves the canvas unstyled; a custom node without source or target handles cannot carry an edge; a CSS library overriding `.react-flow__edges` with `overflow: hidden` hides edges; handles hidden with `display: none` break connection detection, where `opacity: 0` or `visibility: hidden` do not; a `nodeTypes` object recreated per render trips a warning, which StrictMode reproduces even on correct code ([xyflow#3835](https://github.com/xyflow/xyflow/issues/3835)); and a parent container without a height produces the width-and-height error, which also fires as a false positive when the flow is hidden and reshown ([discussion #2927](https://github.com/xyflow/xyflow/discussions/2927)). That last one matters here because `apps/desktop/src/renderer/src/pages/gateway-canvas/lib/inspector-width.ts` and the panel resize machinery change the canvas's available width at runtime.

## 6. Testing and story determinism

- Drive cable drags with an explicit `mouse.down`, several `mouse.move` calls, then `mouse.up`, because of the Playwright `steps` off-by-one recorded against React Flow v12 in [xyflow#4775](https://github.com/xyflow/xyflow/issues/4775) (carried from the technical research).
- Pin the viewport in stories with an explicit `defaultViewport` rather than an animated `fitView`. `fitView` timing is the documented flake source: [xyflow#4801](https://github.com/xyflow/xyflow/issues/4801) ("fitView() sometimes fails after flow initialization"), [xyflow#3946](https://github.com/xyflow/xyflow/issues/3946), and [xyflow#4803](https://github.com/xyflow/xyflow/issues/4803) on `duration` not taking effect. [React Flow 12.5.0](https://reactflow.dev/whats-new/2025-03-27) claims "no more setTimeout or requestAnimationFrame and no more split second frames of unfitted views", so 12.11.2 should be better, but a pinned viewport removes the question entirely.
- Assert cable geometry from the painted page using `paintedBox` and `paintedStyle` from `apps/desktop/src/renderer/src/shared/testing/index.ts`, never from a handler call count, per `.claude/rules/tdd-bdd.md`.
- Under `prefers-reduced-motion: reduce`, run any viewport animation at duration 0. React Flow has no built-in support for the preference; every viewport function takes a `duration` option ([FitViewOptions](https://reactflow.dev/api-reference/types/fit-view-options)), so this is a one-line branch and a testable criterion.

## 7. The "Excalidraw feel" bar, read through Excalidraw's own complaints

The maintainer's bar is "as fluid as pulling an arrow in Excalidraw". Excalidraw's tracker shows what people actually complain about once that fluidity ships, and each complaint is a criterion in disguise:

- **Over-eager binding.** [excalidraw#4797](https://github.com/excalidraw/excalidraw/issues/4797) ("arrows lock to everything"), [#6685](https://github.com/excalidraw/excalidraw/issues/6685) where maintainers acknowledge auto-binding to nearby shapes is annoying when unwanted, [#6952](https://github.com/excalidraw/excalidraw/issues/6952) proposing shape-to-arrow binding be dropped for too many false positives, and [#10538](https://github.com/excalidraw/excalidraw/issues/10538). A binding must follow aim, not proximity.
- **No rebind path except redraw.** [excalidraw#8802](https://github.com/excalidraw/excalidraw/issues/8802) reports that the only way to rebind is dragging the point handle. Brainstorm decision 4 already promises endpoint rebinding, so make it a scenario rather than an intention.
- **No discoverable unbind.** [#6685](https://github.com/excalidraw/excalidraw/issues/6685) again, and [#3690](https://github.com/excalidraw/excalidraw/issues/3690).
- **Bindings that silently reappear or drift.** [excalidraw#9314](https://github.com/excalidraw/excalidraw/issues/9314) (an arrow rebinding itself to a shape it was unbound from) and [#9115](https://github.com/excalidraw/excalidraw/issues/9115) (binding errors after dragging or undo). The canvas equivalent: moving a node must never change what it is bound to.

React Flow's answer to the preview half is that a handle gains the `connecting` class while a connection line is over it and `valid` when the connection is allowed, per the [Handle component reference](https://reactflow.dev/api-reference/components/handle), with `isValidConnection` deciding. That is the hook for showing a person, before release, what will happen.

## 8. Candidate acceptance criteria, in house spec voice

**Accessible parity**

1. Every binding a cable drag can create MUST also be creatable through a sequence of single-pointer activations with no dragging (SC 2.5.7, F108).
2. Every binding MUST be creatable using the keyboard alone. React Flow ships no keyboard path between handles, so the plus affordance and picker MUST carry it.
3. Every node position reachable by drag MUST also be reachable by keyboard, because positions persist per gateway.
4. Every port, plus affordance, and cable endpoint that accepts a pointer MUST present a hit target of at least 24 by 24 CSS pixels, or satisfy the 24 pixel spacing exception (SC 2.5.8). The painted dot MAY stay smaller than its hit target.
5. Escape during any drag MUST cancel it and leave the composition unchanged.
6. Binding, rebinding, unbinding, and refusal MUST announce through a live region. Routine outcomes SHOULD announce politely; only a refusal MAY interrupt. Per-keystroke coordinate announcements MUST NOT reach the region.
7. Every canvas story MUST pass the axe gate already set to `error` in `apps/desktop/.storybook/preview.ts`, in both colour schemes.

**Gesture correctness**

8. A cable released within the snap radius of a compatible port MUST bind to that port and MUST NOT open the empty-canvas picker.
9. A cable released on empty canvas MUST open the target picker and MUST NOT also clear the current selection (the `onPaneClick` collision, `xyflow#5057`, and the repository's own `use-press-away`).
10. A press on a control inside a node (the plus, a menu, a field) MUST NOT start a node drag or a viewport pan, and MUST NOT be swallowed such that the node fails to select.
11. Dragging a node MUST NOT change any binding.
12. Dragging a cable's endpoint onto another compatible node MUST rebind it, without a delete-then-redraw detour.
13. A compatible drop target MUST be visibly distinguished before release, and an incompatible one MUST visibly refuse.

**Keyboard safety**

14. While focus sits in a text field, Backspace, Delete, and Shift plus Backspace MUST edit the text and MUST NOT delete any node or cable (`xyflow#2254`, `xyflow#3416`).
15. Deleting a selected virtual model node MUST ask for confirmation; deleting a selected cable MUST NOT.

**Platform**

16. A two-finger trackpad scroll MUST pan the canvas, and a pinch MUST zoom the canvas, including when the pointer sits over a node or over the inspector. Neither gesture may zoom the Electron page (`xyflow#5074`, `xyflow#5494`, `xyflow#931`).
17. Cable endpoints MUST meet their ports at 125% Windows display scaling and at macOS Retina scaling, including for nodes far from the layout origin (`xyflow#4954`).
18. The canvas region MUST compute `-webkit-app-region: no-drag`, asserted from the page the way `apps/desktop/src/renderer/src/app/routes/-app-shell.stories.tsx` already asserts the titlebar.
19. The packaged build MUST render nodes and cables under `style-src 'self'`, proven by a packaged smoke check rather than by `pnpm dev`.
20. Activating any external link the canvas library renders MUST NOT navigate the renderer away from the app, or the link MUST be suppressed.

**Render lifecycle**

21. Cables MUST be present on first paint. No frame may show nodes at the origin or a node without its cable.
22. The canvas MUST re-render correctly after the inspector resizes, collapses, or reopens, and after the window resizes.
23. A virtual model whose target was removed MUST still render, with its cable in the broken treatment, and MUST NOT blank the canvas.
24. The canvas MUST produce no console error or warning in dev, under StrictMode, or in the packaged build.
25. Any hidden handle MUST be hidden with `opacity` or `visibility`, never `display: none`.

**Motion and determinism**

26. Under `prefers-reduced-motion: reduce`, every viewport animation MUST run at duration 0.
27. Canvas stories MUST pin an explicit viewport rather than rely on an animated fit.

## 9. Recommendation

Amend the spec on three points before it freezes: settle the missed-drop contradiction in favour of the brainstorm's picker, promote the plus affordance from empty-state garnish to the general accessible path, and add SC 2.5.8 target size beside the SC 2.5.7 criterion the technical research already surfaced, because it is the one normative requirement nobody in this change has named yet and it is decided by CSS the moment the first port ships.

Then treat criteria 8, 9, 14, and 16 as the four that must have failing tests written first. They are the intersection of "this library's users reported it", "this repository already has a second listener in that path", and "the maintainer's fluidity bar dies if it is wrong". Criterion 17 needs the Windows arm of the existing three-OS matrix rather than a local check.

Weakest evidence, flagged: the "6px default handle" figure (stylesheet reading, not documentation), the `xyflow#3416` and `xyflow#2254` delete-key reports and the `xyflow#5074`/`#5494` pinch reports (search summaries, not fetched issue pages), and the connection-radius-versus-pane-detection misfire (a community discussion rather than a tracked issue). Each is cheap to confirm with a spike once the library is installed, and none of them changes the shape of its criterion.

## Sources

- [React Flow accessibility guide](https://reactflow.dev/learn/advanced-use/accessibility)
- [React Flow common errors](https://reactflow.dev/learn/troubleshooting/common-errors)
- [React Flow utility classes](https://reactflow.dev/learn/customization/utility-classes)
- [React Flow Handle component](https://reactflow.dev/api-reference/components/handle)
- [React Flow FitViewOptions](https://reactflow.dev/api-reference/types/fit-view-options)
- [React Flow 12.5.0 release notes](https://reactflow.dev/whats-new/2025-03-27)
- [React Flow v11.5.0 release, connectionRadius](https://xyflow.com/blog/react-flow-v-11-5)
- [Add Node On Edge Drop example](https://reactflow.dev/examples/nodes/add-node-on-edge-drop)
- [Easy Connect example](https://reactflow.dev/examples/nodes/easy-connect)
- [SSR and measurement guide](https://reactflow.dev/learn/advanced-use/ssr-ssg-configuration)
- [Remove attribution](https://reactflow.dev/learn/troubleshooting/remove-attribution)
- [xyflow#5057 connection drag fires onPaneClick](https://github.com/xyflow/xyflow/issues/5057)
- [xyflow#4954 connections offset at 125% scaling](https://github.com/xyflow/xyflow/issues/4954)
- [xyflow#5633 connection line during keyboard node move](https://github.com/xyflow/xyflow/issues/5633)
- [xyflow#5074 pinch zoom escapes to page zoom](https://github.com/xyflow/xyflow/issues/5074)
- [xyflow#5494 pinch zoom with panOnScroll](https://github.com/xyflow/xyflow/issues/5494)
- [xyflow#931 ctrl plus wheel ignores zoom props](https://github.com/wbkd/react-flow/issues/931)
- [xyflow#3416 Shift plus Backspace deletes a node while typing](https://github.com/xyflow/xyflow/issues/3416)
- [xyflow#2254 delete key handler blocks backspace elsewhere](https://github.com/wbkd/react-flow/issues/2254)
- [xyflow#4493 nodrag no longer prevents selection in v12](https://github.com/xyflow/xyflow/issues/4493)
- [xyflow#3069 nodrag element still selects its node](https://github.com/wbkd/react-flow/issues/3069)
- [xyflow#4980 nodrag and nodeDragThreshold](https://github.com/xyflow/xyflow/issues/4980)
- [xyflow#1155 handles and drop zones too small](https://github.com/wbkd/react-flow/issues/1155)
- [xyflow discussion #1180 larger edge drop zones](https://github.com/wbkd/react-flow/discussions/1180)
- [xyflow discussion #3497 add node on edge drop and connection radius](https://github.com/xyflow/xyflow/discussions/3497)
- [xyflow discussion #2973 initialize, measure, layout, render](https://github.com/xyflow/xyflow/discussions/2973)
- [xyflow discussion #2927 width and height warning false positive](https://github.com/xyflow/xyflow/discussions/2927)
- [xyflow#3835 nodeTypes warning under StrictMode](https://github.com/xyflow/xyflow/issues/3835)
- [xyflow#4801 fitView fails after initialization](https://github.com/xyflow/xyflow/issues/4801)
- [xyflow#3946 setNodes plus fitView in an uncontrolled flow](https://github.com/xyflow/xyflow/issues/3946)
- [xyflow#4803 fitView duration not working](https://github.com/xyflow/xyflow/issues/4803)
- [xyflow#4775 Playwright drag steps off-by-one](https://github.com/xyflow/xyflow/issues/4775)
- [W3C Understanding SC 2.5.8 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- [W3C Understanding SC 2.5.7 Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)
- [W3C F108 dragging failure technique](https://www.w3.org/WAI/WCAG22/Techniques/failures/F108)
- [MDN ARIA live regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions)
- [microsoft/vscode#185371 review of assertive live regions](https://github.com/microsoft/vscode/issues/185371)
- [FreedomScientific/standards-support#782 assertive region queue flooding](https://github.com/FreedomScientific/standards-support/issues/782)
- [excalidraw#4797 arrows bind to everything](https://github.com/excalidraw/excalidraw/issues/4797)
- [excalidraw#6685 improve arrow binding UX](https://github.com/excalidraw/excalidraw/issues/6685)
- [excalidraw#6952 disable reverse binding](https://github.com/excalidraw/excalidraw/issues/6952)
- [excalidraw#10538 remove arrow binding](https://github.com/excalidraw/excalidraw/issues/10538)
- [excalidraw#8802 rebinding requires dragging the point handle](https://github.com/excalidraw/excalidraw/issues/8802)
- [excalidraw#9314 arrow rebinds itself after unbinding](https://github.com/excalidraw/excalidraw/issues/9314)
- [excalidraw#9115 binding errors on drag and undo](https://github.com/excalidraw/excalidraw/issues/9115)
- [excalidraw#3690 disable arrow binding](https://github.com/excalidraw/excalidraw/issues/3690)
