# 0084: The gateway canvas adopts @xyflow/react

**Status**: Accepted
**Date**: 2026-08-09

## Context

The gateway detail screen becomes a node canvas: the gateway, its virtual models, and their targets stand as nodes, and a person wires them by dragging a cable between ports. The renderer carries no graph, drag, or canvas dependency today, and the shipped stage is one selectable card on a dotted field. The maintainer's bar is cable drawing as fluid as pulling an arrow in Excalidraw. A full accessibility contract rides beside it: a single-pointer twin for every binding, a keyboard path, a live region, and 24px hit targets. Three candidates competed at the panel and tied on score, so the profile decided.

## Decision

**The canvas adopts `@xyflow/react` 12.11.2 in full, pinned exactly.** React Flow owns the viewport, pan and zoom, node drag, edge rendering, and connection drag. Nodes and cables render as custom types wrapping the shipped `node-card` and `dot-grid` vocabulary, so the design system keeps owning every pixel and the library ships none of its default skin. The slice keeps its own draft machinery, read models, picker, and inspector wiring. Each locked interaction maps to a documented library surface. Add Node On Edge Drop powers the drop-picker, and Button Handle hosts the plus affordance. `onReconnect` rebinds, `deleteKeyCode` unbinds, `isValidConnection` enforces the one-target rule, and `A11yDescriptions` publishes the live region.

**The attribution badge stays, because it's a request rather than a term.** The package declares the `MIT` license, and its documentation states plainly that the badge isn't a license condition. recompose honors the request and keeps the badge, rendered inside the window's guarded external-link path, so pressing it opens the browser and never navigates the renderer. Hiding it through `proOptions` stays available if the maintainer later trades it for a subscription stance.

**Amended 2026-08-09.** The maintainer made that trade during the first design review: the badge leaves through `proOptions.hideAttribution`, which the `MIT` license permits and the paragraph above anticipated. In the same review the plus affordance left every port, so Button Handle no longer hosts an icon. Each source port carries a keyboard-only ask that paints under keyboard focus, and the cable drag is the one pointer path.

**The transitive set clears the license gate before any component builds on it.** The manifest pulls `zustand`, `classcat`, and `@xyflow/system`, which carries the `d3` drag, selection, and zoom modules. The repository's license sweep runs over that whole set as the first implementation task, and a refusal escalates to the maintainer instead of landing unseen.

**The packaged build proves the strict style policy.** The packaged renderer runs under a Content Security Policy (CSP) of `style-src 'self'`, while the dev server carries `'unsafe-inline'`. Release 12.11.2 applies viewport transforms through imperative style writes, so a packaged smoke check opens a wired gateway and asserts nodes and cables painted. A healthy dev run proves nothing here, and the check gates the merge.

## Consequences

**Good**: the gesture quality, snap radius, automatic edge panning, minimap, zoom controls, and focusable nodes and edges arrive tuned instead of hand-built. The accessibility surface starts from a documented baseline, and the testing story matches the repository's real-Chromium browser suite with no shims.

**Bad**: the library's internal store stands beside derived engine state as a second place a graph could live. The design holds the line with a single-writer rule: the flow runs controlled, `node-graph.ts` derives all topology, and only position changes apply from the store. A future contributor who writes topology into the store reintroduces the risk this record names. The dependency also updates on the package's cadence through Renovate, and its `@xyflow/system` layer versions at 0.0.x, so bumps need the packaged proof rerun.

## Alternatives

**A hand-rolled stage, zero new dependencies.** Rejected: feel rests entirely on first-party tuning, zoom falls out of the first release, and every accessibility affordance lands as new code. The panel scored its intuitiveness ceiling lowest of the three.

**The `@xyflow/system` primitives under a first-party React layer.** Rejected: the package versions React Flow's internal layer at 0.0.x with no dedicated documentation, so any bump can break without notice. The accessibility surface also stays first-party.

**Heavier canvas engines.** An infinite-whiteboard engine carries a heavier license question, and a raster engine gives up the DOM semantics the accessibility and Playwright story depends on. The discovery brief names both kinds and set them aside before the panel.
