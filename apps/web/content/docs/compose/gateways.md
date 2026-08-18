---
title: 'Gateways'
description: 'Create, start, and stop a gateway.'
---

A gateway is a local server recompose runs for you. This page covers its lifecycle: creating one, naming it, moving its port, and deleting it. Securing one with a key lives under [Operate](/docs/operate/securing-a-gateway).

## Create one

Click **New gateway** in the sidebar, or press Command+N. The sheet asks for a name and offers a free port from recompose's own band, with a live preview of the address it will serve at. Click **Create gateway** and the gateway starts serving as it saves: the address pill already reads `Running`.

The slug in ids like `recompose-my-gateway` derives from the name: lowercased, with everything outside letters and digits turned into dashes.

## Rename it

Open the gateway's inspector and click **Edit** under **General info**. The name is display only, so saving it restarts nothing and warns about nothing: clients call the port, not the title.

## Move the port

The **Endpoint** section carries the port field. Type a new port and press Enter, or leave the field, and the change commits. Escape reverts a draft, and a value outside 1024 to 65535 snaps back to the stored port. While the gateway is serving, the commit asks first: `Move the gateway to port N?`, and confirming restarts it on the new port. A port another gateway holds refuses by name.

When another process grabs the port, the gateway saves but shows `Another process holds port N.` under the toolbar, with a **Move to a free port** button as the one-press remedy.

## Start, stop, restart

The toolbar's run control is the play or stop glyph beside the address pill. The Gateway menu carries the same acts with their shortcuts, plus **Copy Base URL**. A gateway you stopped stays stopped through any edit: only you start it again.

## Delete it

**Delete gateway** sits at the inspector's foot, on the Delete key with the card selected, and in the Gateway menu. The question is the same everywhere: the gateway stops serving, and its whole composition leaves the app.
