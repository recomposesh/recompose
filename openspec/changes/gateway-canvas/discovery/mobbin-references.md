# Mobbin references

Run in the orchestrating session, because the Mobbin tools live there rather than in `researcher`. The sweep covered node-canvas screens and the connect-gesture flows behind them.

## The connect gesture: drag a cable out of a port

- [Magnific](https://mobbin.com/flows/a678b56d-4e0f-4030-8cd5-c0634c05e58a) is the cleanest cable reference: small port chips sit on the node's edge, a drag pulls a curved line that follows the cursor, and the line lands on the other node's port. Dropping on empty canvas opens a compact picker that creates the connected node in place, so a missed drop becomes an add instead of a failure.
- [Figma FigJam](https://mobbin.com/flows/218b9254-8f6d-46b2-aa16-e786aaea55ba) selects the source first: selecting a shape reveals a plus-arrow affordance at each edge, dragging it draws the connector, and dropping on empty canvas materializes a ghost copy of the source as the next node. The affordance appears on selection rather than living on the node permanently.
- [WRITER](https://mobbin.com/screens/afef9286-7030-4b12-8b5f-bb2d52831bd7) shows the free-form graph at scale: visible ports on both sides of every card, curved wires, a minimap, and zoom controls in a bottom toolbar.

## The plus affordance instead of a bare canvas

- [Flodesk](https://mobbin.com/screens/21e793d3-db46-48bf-b3fa-6a068913f062) opens its builder with the skeleton already drawn: a trigger card, a plus beside it, and a welcome coach mark. The person never faces an empty surface.
- [Twenty](https://mobbin.com/screens/539342b6-0804-4bdb-ac10-719181d348a3) hangs a plus under the last node of the tree; the wire to the next step exists before the step does.
- [Retool](https://mobbin.com/flows/43c221b3-588a-4e88-871a-7f34931d4ce7) puts plus handles beside each block; clicking one opens an Add block menu and drops the new block already wired.
- [Relevance AI](https://mobbin.com/screens/7d5456bb-7211-4180-b9b5-f9d04a3f4077) overlays a getting-started checklist on the canvas ("Connect agents together" is a checklist item), which confirms the gesture needs teaching when the canvas starts bare.

## Cables as first-class objects

- [Relevance AI](https://mobbin.com/screens/7d5456bb-7211-4180-b9b5-f9d04a3f4077) makes the edge selectable: clicking a wire opens an Edge settings panel in the inspector, with the two endpoints named at the top. A cable that carries configuration wants selection, hover, and inspector treatment like a node.
- [Zapier Canvas](https://mobbin.com/flows/2b0b2d47-f812-454e-a74d-d775c6ba894e) exposes a dedicated connector tool in its bottom toolbar beside the cursor tool, and endpoints snap to node edge midpoints.

## What the references settle

- Every drag-to-connect reference anchors the gesture on a visible port or a selection-revealed handle, never on the node body: the body is for moving, the port is for wiring.
- Dropping a cable on empty canvas consistently offers creation (picker or ghost node) rather than cancelling, which turns the plus-affordance seed decision and the cable gesture into one mechanism.
- Inspectors live on the right and edit the current selection in place, matching the design project's inspector column.
- Canvas furniture converges on: dot grid, zoom controls plus fit, a minimap for orientation, and a bottom status strip.
