---
title: 'Virtual models'
description: 'Name a model, wire its targets, and let clients list it.'
---

A virtual model is the name a client sends as the model. What stands behind the name is yours to rewire at any time, and the client never notices. This page covers the model's own lifecycle: the wiring gestures live on [the canvas page](/docs/compose/canvas).

## Compose one

Drag a cable from the gateway's port onto empty canvas. A draft card lands there and the inspector opens on it.

Type a display name, and the **Model id** follows on its own: the name's lowercase alias, carrying `claude-` unless the name already reads as `claude` or `anthropic`. Claude Code's `/model` picker lists only ids carrying one of those words, so the derived id is one it lists. Edit the id by hand and it stops following, the bare alias included. Ids use lowercase letters, digits, dots, and dashes, and clients send the id exactly as it stands.

Then bind the draft: **Provider** picks one account and one model, and **Router** puts [routing](/docs/compose/failover) behind the name instead. The preview line reads the whole answer back, for example `serves as claude-fast → Anthropic · claude-sonnet-4-5`. Click **Add virtual model** and the definition lands.

## Rename it or change the id

Select the card and click **Edit** under **General info**. The name is free text. A changed id lands with a notice: `Saved. Restart the app that points at this gateway to pick up the change.` Clients read the endpoint once at startup, and a client still sending the old id gets a `404` naming an undefined model.

## Rebind the target

Drag the cable's endpoint off its current target and drop it on another target card. The rebind lands in place, announced on the spot. A bound model's port offers no second cable: one name serves through one binding, and a router is how one name reaches many providers.

## Unbind or delete

Select the cable and press Delete: the binding releases with no question, and the definition returns to the canvas as a draft keeping its name and id. Deleting the card itself asks first: the definition leaves the gateway, and its id stops serving clients.

## Clients list it

Every virtual model comes back from the gateway's model list in both the Anthropic and OpenAI shapes, under the id a client sends. The [curl page](/docs/connect/curl) shows the call.
