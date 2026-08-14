---
title: Connecting a client
description: Point Claude Code, Codex, Cursor, or any other tool at a running gateway.
---

A client reaches a gateway through one environment variable. Which variable depends on the
dialect the client speaks, and both point at the same address.

## Find the address

A running gateway shows its base URL on the canvas. It reads like this, where the last segment
is the name you gave the gateway:

```
http://localhost:8397/my-gateway
```

## Point an Anthropic-dialect client at it

Claude Code and anything else speaking the Anthropic dialect read `ANTHROPIC_BASE_URL`:

```sh
export ANTHROPIC_BASE_URL=http://localhost:8397/my-gateway
```

## Point an OpenAI-dialect client at it

Codex, Cursor, and the rest of the OpenAI-dialect tools read `OPENAI_BASE_URL`. The address
doesn't change:

```sh
export OPENAI_BASE_URL=http://localhost:8397/my-gateway
```

## Ask for a virtual model

Set the client's model to a virtual model name rather than a provider's own. The gateway
resolves the alias, so the client never learns which provider answered.

## Serving beyond this machine

A gateway answers on the loopback address until you opt in to serving it on your local network.
Turn on the local API token when you do. Without it, every machine that can reach the address
can spend your providers.
