---
title: 'The gateway canvas'
description: 'Nodes, cables, and how to wire them.'
---

The canvas isn't a picture of the configuration: it's the configuration. What stands wired here is exactly what the gateway serves, and [How recompose works](/docs/get-started/how-recompose-works) explains why. This page teaches the canvas itself: the cards, the cable gestures, the keyboard path, and what the colors mean.

## The four node kinds

A **gateway** card anchors the drawing: the name you gave it over the port it serves on. It has one outgoing port and takes no incoming cable.

A **virtual model** card carries a display name over the id clients send. A wire connects it to its gateway, and one cable leaves it toward whatever answers for it.

A **router** card is the one chamfered card. It shows its name over its mode, or its mode over a child tally while it has no name of its own. An empty router stands dashed until its first child arrives.

A **target** card pairs one account with one real provider model: the vendor's mark, the account's identity, and the model id in its footnote. Two models of one account stand as two cards.

## Wire a cable

Drag from the port on a card's right edge and drop it where it should land. Dropping on a target card binds to that account. Dropping on empty canvas opens a picker at the drop point and builds what you choose there. A card the wiring already holds refuses the drop, and a router card takes no incoming cable at all.

Press Esc while a cable is in flight and the composition stands unchanged.

## The keyboard path

Every source port answers the keyboard. The port carries a button that paints only under keyboard focus, so no standing icon crowds the cards. Focus it and press Enter: the gateway's ask reads **Add a virtual model**, a virtual model's reads **Pick a target**, and a router's reads **Add a child**.

## What the cables tell you

Cables paint their last outcome. A resting cable carries no recent traffic. Green with a traveling pulse means a request is in flight right now. Plain green means the last request served, and the reading cools back to resting after a minute. Red means the last request failed, and the red stays until newer traffic answers it. A failed cable also carries a **Last error** chip: press it and a popover names the status and the reason.

One request walking a chain paints each attempted child's own cable, so a failed sibling stays red beside the one that served. With reduced motion on, the pulse stays home and the colors carry the news alone.

## Arrange and navigate

Drag cards where you want them: the arrangement is yours and survives restarts. **Tidy the canvas** in the toolbar restores the automatic layout. The zoom cluster sits in the corner with a live percentage that resets to 100% on press. The minimap pans and zooms the whole drawing, and the canvas remembers the camera per gateway. Every act also lives in the Gateway menu, and [keyboard shortcuts](/docs/reference/shortcuts) lists the bindings.
