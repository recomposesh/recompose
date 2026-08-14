# Mobbin references

Session-run discovery arm for the gateway-routers change. Three searches on the web platform: a branching node on a wired canvas, a node inspector that switches a mode, and an ordered priority list.

## The router node on the canvas

- [WRITER, light-bee Blueprints](https://mobbin.com/screens/afef9286-7030-4b12-8b5f-bb2d52831bd7): a classification node lists its categories inside the card, and every category owns an output port on the right edge with its own cable leaving toward a downstream node. The card stays small and the fan-out reads from the ports rather than from a legend. Closest reference to a router carrying an ordered child list.
- [OpenAI Platform, agent builder](https://mobbin.com/screens/36df35a8-eb28-4c80-98aa-bc38b3c8504b): an `If / else` node holds two output dots, one per branch, and stays almost empty on the canvas. The branch configuration lives in the right panel, not in the node. The node names its kind under a glyph, which matches the shipped node-card kicker.
- [StackAI](https://mobbin.com/screens/670596bd-6812-46f4-8336-aeeba79e2a69) and [Runway](https://mobbin.com/screens/16aa61e3-22ee-4ce3-be85-054705981f11): node cards carry a kind label over a body, and the canvas keeps its controls in a bottom-center cluster. Corroborates the shipped canvas furniture rather than adding to it.

## The mode control in the inspector

- [OpenAI Platform](https://mobbin.com/screens/36df35a8-eb28-4c80-98aa-bc38b3c8504b): selecting the branch node opens a right panel headed by the node's kind, with the branch cases stacked under it and an add control at the foot. The pattern to follow for a router: the mode control sits at the top of the panel, the children stack below it.
- [Airtable](https://mobbin.com/screens/7da45d04-bcc5-4060-a372-c5880090bcae): a two-option segmented control sits inline in a labeled property row, the same shape a two-mode routing control needs.
- [Rive](https://mobbin.com/screens/9c3e7982-3e73-4844-a78b-d2a30f8efb9f) and [Webflow](https://mobbin.com/screens/69712cc9-c970-449b-8c21-1538de1d4e37): dense inspectors group properties under quiet section headings, each row a label on the left and its control on the right.

## The ordered child list

- [WorkOS, edit priority](https://mobbin.com/screens/d9f96ee3-37ca-4fa3-9cce-f0117e4f1935): a drag-handled list under the sentence "Drag roles to change the priority, from highest to lowest", with the default row marked by a badge. This is the failover ordering control almost exactly, including the need to say out loud which end of the list wins.
- [Monarch](https://mobbin.com/screens/56cf5630-edd3-49da-a3d0-3cbf4fadcde1): each row carries its rank as a printed `#1` through `#5` beside the drag handle, so the order reads without counting rows.
- [Juicebox](https://mobbin.com/screens/01028d24-0e2e-4ae8-81b3-c5f8c09117a0) and [Circle](https://mobbin.com/screens/a0684ada-0fe1-410b-a8e6-f4109d3c33a7): reorder lives in a dedicated dialog with explicit confirm and cancel, and each row carries a remove control at its right edge.

## What the arm suggests for the brainstorm

1. A router node stays small on the canvas and carries one output port per child, the way the WRITER classification node does. The mode reads as a pill on the card and the ordering lives in the inspector.
2. Order is only meaningful under failover. Under round-robin the same list stands unordered, so the inspector needs a sentence that says which end wins, and it must change with the mode rather than sit as fixed helper text.
3. The rank belongs on the row as a printed number, not implied by position alone, because a cable can be read faster than a list can be counted.
4. Nothing in the references puts reordering inline on the canvas. Every reference reorders in a panel or a dialog. That supports keeping the canvas gesture for binding and the inspector for ordering.
