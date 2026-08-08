# Gateway canvas proposal

## Why

The first composition slice wired a virtual model to one stored target through forms and drawers. The topology those forms create stays invisible: a person reads lists and infers the wiring in their head. The gateway detail screen becomes a canvas so the wiring itself is the interface. Seeing the gateway, its virtual models, and their targets as connected nodes makes the composition legible at a glance. Dragging a cable between ports makes the connection a direct manipulation instead of a form submission.

The maintainer set one bar for this slice: the canvas must feel immediately intuitive, with cable drawing as fluid as pulling an arrow in Excalidraw.

## What changes

- The gateway detail screen renders a node canvas: the gateway as a node, its virtual models and targets as nodes beside it.
- Cable management arrives: a person drags a cable out of a node port to create a connection, and the canvas renders existing connections as cables.
- A gateway node never starts bare: it draws an automatic wire ending in a plus affordance that serves as the "add here" entry point.
- The visual design follows the Claude Design project reference at `templates/gateway/index.html`.

## Capabilities

### New capabilities

- `gateway-canvas`: render the gateway composition as nodes and cables, and edit it through direct manipulation.

### Modified capabilities

- None identified yet. Discovery and the brainstorm refine this list before the specs freeze.

## Impact

- Renderer only as currently scoped: the canvas page, its interaction layer, and shared design-system components. The engine already exposes the gateway, virtual model, and target read models the canvas draws from, and the existing mutations the cable gestures invoke.
- The interaction design lands through the brainstorm and freezes at the design gate; this proposal records the entry ask, not the locked decisions.
