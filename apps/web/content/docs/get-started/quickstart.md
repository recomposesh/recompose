---
title: 'Quickstart'
icon: Rocket
description: 'Create a gateway, wire one provider, and send the first request.'
---

By the end of this page, Claude Code answers through a gateway running on your machine, and the request lands in the gateway's log. Budget five minutes.

> Claude Code is the example here, not a requirement. Every client that speaks the Anthropic, OpenAI, or Gemini dialect points at a gateway the same way: see [Connect a client](/docs/connect).

Before you start: [install recompose](/docs/get-started/install) and open it, keep an Anthropic API key at hand, and have Claude Code on your PATH. On a Claude plan instead of a key? Connect your [subscription](/docs/providers/subscriptions) in step 2, and the rest reads the same.

## Create a gateway

recompose opens on **Create your first gateway**. Click **Create gateway**. In the sheet, type a name into **Name**, leave **Port** as offered, and click **Create gateway** again. (**New gateway** in the sidebar and Command+N do the same.)

The canvas opens with the gateway's card, and the address pill in the toolbar already reads `http://127.0.0.1:8397 · Running`, with your own port: a gateway starts serving as it saves.

## Connect a provider

In the sidebar under **Providers**, click **API keys**. In the toolbar, click **Add provider** and pick **Anthropic API**. Give the key a name, paste it into **Key**, and click **Connect**.

The key appears as a row with the name you gave it and the key's masked tail.

## Compose a virtual model

Head back to your gateway in the sidebar. Drag a cable out of the port on the gateway card's right edge and drop it on empty canvas. A draft card lands there and the inspector opens.

In **Name**, type `Claude fast`. The **Model id** follows on its own and becomes `claude-fast`: the exact string clients send as the model. Under **Bind this model to**, choose **Provider**, pick your Anthropic key, and pick `claude-sonnet-4-5` from the model list.

The preview reads `serves as claude-fast → Anthropic · claude-sonnet-4-5`. Click **Add virtual model**. Three cards now stand wired on the canvas, and the footer counts `3 nodes · 2 wires`.

## Point Claude Code at the gateway

In the toolbar, click **Connect a client** (the book glyph). The sheet opens on Claude Code. Copy the block under **1. Point it at the gateway and start it** and paste it into a terminal:

```sh
export ANTHROPIC_BASE_URL="http://127.0.0.1:8397"
export ANTHROPIC_AUTH_TOKEN="unused"
export ANTHROPIC_MODEL="claude-fast"
export CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY="1"
claude
```

The block above is an example: yours carries your gateway's own port and model id, so copy it from the sheet. `unused` is a stand-in that satisfies the client, because this gateway checks no key.

Claude Code starts without asking you to sign in to the gateway. If it refuses with an authentication error, the variables came from another gateway's sheet: copy the block again from this one, or see [authentication errors](/docs/troubleshooting/authentication-errors).

## Send the first request

Ask Claude Code something:

```text
explain what a local gateway does, in one sentence
```

The status line at the foot of the connect sheet turns green as the log takes its first request. For the detail, click **Request log** in the toolbar: a row shows the journey `claude-fast → claude-sonnet-4-5`, the provider, your key's name, a green `200`, and the duration.

In the sidebar, the Get started checklist marks its last step and bows out with confetti.

## What you built

A gateway on your machine now answers Claude Code, and every request through it lands in the log. From here:

- [How recompose works](/docs/get-started/how-recompose-works)
- [Connect another client](/docs/connect)
- [Put failover behind one model](/docs/compose/failover)
- [Require a key from callers](/docs/operate/securing-a-gateway)
- [Watch usage and spend](/docs/operate/usage-and-spend)
