---
title: 'Serving other devices'
description: 'Loopback by default, your whole network by choice.'
---

Gateways answer this machine only, by default. Every listener binds `127.0.0.1`, and a request that arrives under any other host name gets HTTP 403 with `This gateway answers loopback clients only.` Serving other devices is one deliberate, app-wide choice.

## Before you widen

Enforce a key on every gateway first, through [Securing a gateway](/docs/operate/securing-a-gateway). Once the bind address widens, any device that can reach the port gets served. The per-gateway key becomes the only thing standing between your accounts and whoever that is. Do it in this order: key first, bind second.

## Widen the bind address

Open **Settings → Server → Bind address**. The field defaults to `127.0.0.1` and its own description says the rest: `Defaults to this machine. Use 0.0.0.0 or another host to serve other devices.` Enter commits the value, Escape reverts it.

Changing the address while gateways run raises a dialog, `Restart running gateways?`, because every serving gateway restarts on its new address. Confirm with **Restart gateways**.

One address serves all gateways: no per-gateway bind exists, and recompose ships no tunnel of its own. If you'd rather not open a port at all, a private overlay network such as Tailscale reaches a loopback-only gateway without touching this setting.

## Connecting from another device

The toolbar and the connect snippets print the base URL as `http://<bind address>:<port>`. With `0.0.0.0` as the bind address that printed origin isn't dialable: `0.0.0.0` means "every interface" to the listener and nothing useful to a client. On the other device, replace the host with this machine's actual address, such as `http://192.168.1.20:8389`.

## What stays guarded either way

Two refusals hold on every bind address. A request carrying an `Origin` header gets 403 with `This gateway refuses any request that carries an Origin header, so no web page can reach it.`, so a browser tab can't ride your gateway even from this machine. And an enforced key keeps guarding every path except `/health` and `/healthz`.

recompose doesn't manage your firewall. Whether a device can reach the port at all stays between your OS and your network.

## Turn it off

Set the bind address back to `127.0.0.1`. The same restart dialog applies, and gateways return to answering this machine only.
