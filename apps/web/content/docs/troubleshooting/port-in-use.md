---
title: 'A port is in use'
description: 'Two collisions, two answers, and the one-press fix.'
---

## What you'll see

At save, when another gateway already owns the port: `<slug> already holds this port.` The sheet refuses and waits for a different port.

At start, when another process holds it: the gateway stays stored, the toolbar reads `Another process holds port 8389.`, and a **Move to a free port** button stands beside it.

## The one-press fix

**Move to a free port** probes the recompose band, `8389` through `8436`, skips ports other gateways own, saves the first free one, and starts the gateway on it. One thing to notice: the gateway comes up running after the move, even when it stood stopped before.

## Find what holds the port

When you'd rather evict the squatter than move:

```sh
lsof -nP -iTCP:8389 | grep LISTEN
```

The line names the process. If it might be another recompose gateway, the health path answers with a name:

```sh
curl http://127.0.0.1:8389/health
```

`{ "gateway": "Old gateway" }` means the port belongs to a gateway you forgot, not a stranger.

## Update the clients

A moved gateway is a moved address. Every client that exported the old base URL now points at nothing, or at whatever took the port. Open **Connect a client** and re-copy the blocks: they carry the new port.

## Local runtime ports

A [local runtime](/docs/providers/local-runtimes) row can lose its port to a stranger too. Detection catches it as `Another server answered`, but only when you look. At request time, whatever answers on the port decides: its refusal passes through, and dead silence becomes the 502 `The gateway "<name>" could not reach the target for the virtual model "<model>".`

## Still stuck

Keep the `lsof` line and the toolbar's message, then follow [Collect logs](/docs/troubleshooting/collect-logs).
