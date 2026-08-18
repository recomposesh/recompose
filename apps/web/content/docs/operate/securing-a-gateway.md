---
title: 'Securing a gateway'
description: 'Require a key, hand it to clients, regenerate it when it leaks.'
---

Every gateway can require its own key. The setting is per gateway, lives in the gateway's inspector, and changes what every connect snippet prints.

## Require a key

Select the gateway and find the **Access** section in the inspector, between General info and Endpoint. It holds one switch: **Require an API key**. While it's off, the section says `Clients reach this gateway without a key.`

Flip it on and recompose mints the key itself: 32 random bytes behind the prefix `rc-local-`. You never type or choose a key. The inspector shows it masked and offers **Copy API key**, and copying is the only way to read it: no control ever reveals the full key on screen. The switch applies the moment you flip it, with no save step.

Turning the switch off keeps the stored key, so flipping it back on restores the same one. Only **Regenerate** replaces it, behind a dialog that says what breaks: `Clients using the current key stop reaching this gateway until you paste the new one.`

## How clients send it

A caption under the key spells the accepted forms: `Clients send it as Authorization, x-api-key, x-goog-api-key, or ?key=`. The `Authorization` header works with or without `Bearer`, and any one match passes. That's why one snippet per client is enough: whatever header the client fills, the gateway reads it.

The [connect sheet](/docs/connect) reacts to the switch. With a key enforced, every snippet carries the real key. Without one, snippets carry the stand-in `unused`, and the sheet says so: `This gateway enforces no key, so the value in these blocks is a stand-in that satisfies the client and nothing else.`

One client can't comply: Claude Desktop's form takes an address and no credential, so a guarded gateway stays out of its reach. The sheet says to turn the requirement off or use the command line instead.

## What a wrong key gets

A request without the key, or with a wrong one, gets HTTP 401 with a `WWW-Authenticate: Bearer` header. The typed body names the gateway: `The gateway "My gateway" requires an API key.` Absent and wrong keys read the same on purpose, so probing reveals nothing. Only the health paths `/health` and `/healthz` answer without a key. Everything else stands behind it, `/v1/models` included.

## Where the key lives

The key sits in plain text inside the gateway's own file, `~/.recompose/gateways/<slug>.json`. It doesn't enter the encrypted vault, which holds provider credentials instead. This key guards a port on your machine, and anyone who can read your home directory already stands past it. [Data on disk](/docs/operate/data-on-disk) maps every file.

## When a key isn't enough

The key guards requests, not reachability. Before you point the gateway at other devices, read [Serving other devices](/docs/operate/serving-other-devices): widening the bind address changes who can knock at all.
