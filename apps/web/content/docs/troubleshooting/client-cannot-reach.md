---
title: "A client can't reach the gateway"
description: 'Connection refused, unexpected 404s, and the two policy 403s.'
---

## What you'll see

A connection error in the client when nothing listens on the port. Or one of three answers from the gateway itself:

```json
{
  "type": "error",
  "error": {
    "type": "not_found_error",
    "message": "The gateway \"My gateway\" serves no path \"/v2/chat\"."
  }
}
```

```json
{
  "type": "error",
  "error": { "type": "permission_error", "message": "This gateway answers loopback clients only." }
}
```

```json
{
  "type": "error",
  "error": {
    "type": "permission_error",
    "message": "This gateway refuses any request that carries an Origin header, so no web page can reach it."
  }
}
```

One thing to know before you dig: none of these appear in the [request log](/docs/operate/request-log). The drawer shows requests that reached routing, and these refuse earlier. The client's own output is your evidence.

## Check the gateway is running

The toolbar's address pill says it plainly: `http://127.0.0.1:8389 · Running` or `· Stopped`. A stopped gateway serves nothing, and the client sees a plain connection error. Press **Start**.

From a terminal, the health path settles it and names its owner:

```sh
curl http://127.0.0.1:8389/health
```

A healthy gateway answers `{ "gateway": "My gateway" }`. A different name means another gateway holds that port.

## Check the address the client uses

The base URL is the bare origin, no path and no trailing slash. Most wrong-address mistakes land on the `serves no path` 404: a doubled `/v1`, a stray gateway name in the path, or a client that appends its own prefix. The **Connect a client** sheet prints the exact block per client, and [Gateway endpoints](/docs/reference/endpoints) lists every path that answers.

## Check who's asking [#policy]

The two 403s are policy, not breakage:

- `This gateway answers loopback clients only.` means the request's `Host` header wasn't a loopback name. It happens to remote devices while the gateway serves this machine only, and to local clients that send a network address as the host. Serving other devices is a setting, not a workaround: see [Serving other devices](/docs/operate/serving-other-devices).
- The `Origin` refusal fires for any request carrying an `Origin` header, which means every browser page, even one served from this machine, and even on a widened bind address. That's deliberate: no web page can spend your accounts. Browser-based clients don't work with recompose, full stop.

## Still stuck

Gather the client's exact output and the gateway's state, then follow [Collect logs](/docs/troubleshooting/collect-logs).
