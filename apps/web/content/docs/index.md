---
title: Introduction
description: What a gateway is, what a virtual model is, and why a client only ever needs one address.
---

recompose composes the AI providers you already pay for into local gateways. It runs on your
machine, it asks for no account, and it sends no telemetry. Your credentials stay in
`~/.recompose`.

## A gateway is one address

A gateway is a local server you name. It serves both API dialects on a single base URL, and the
request path says which one a client meant:

| Path                   | Dialect   |
| ---------------------- | --------- |
| `/v1/messages`         | Anthropic |
| `/v1/chat/completions` | OpenAI    |

Nothing needs configuring per client. A tool that speaks either dialect points at the same
address and recompose reads the path.

## A virtual model is a name you choose

Clients ask for a model by name. Left alone, that name binds them to whichever provider you
picked the day you set them up, and changing it means editing every client.

A virtual model breaks that binding. You define a name such as `fast` or `smart`, and you wire
it to a real model behind the canvas. Swapping the provider behind `fast` changes nothing in any
client, because the client only ever knew the alias.

## Routing sits between the two

Between a virtual model and a real provider you can place a router:

- A **failover** ladder sends traffic to the topmost healthy target and steps down when one
  stops answering.
- A **round-robin** pool spreads traffic evenly, or by weight.

Routers chain, so a failover ladder can hold a round-robin pool as one of its rungs.

## Where to go next

Read [connecting a client](/docs/connecting-a-client) to point your first tool at a gateway.
