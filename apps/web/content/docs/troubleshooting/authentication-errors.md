---
title: 'Authentication errors'
description: "Two different 401s: the gateway's own key, and the provider's credential."
---

## What you'll see

A 401 in the client. Two unrelated things produce it, and they need opposite fixes.

## Telling the two apart

The gateway's own 401 names the gateway and arrives with a `WWW-Authenticate: Bearer` header:

```json
{
  "type": "error",
  "error": {
    "type": "authentication_error",
    "message": "The gateway \"My gateway\" requires an API key."
  }
}
```

A provider's 401 passes through in the provider's own words, so it reads like the provider wrote it, because the provider did. If the message names your gateway, fix the client's key. If it names an API key, a token, or an organization, fix the account.

## The gateway rejected your client's key [#gateway-key]

The gateway [requires a key](/docs/operate/securing-a-gateway) and the client sent none, or the wrong one: the two draw the same answer on purpose. Copy the key fresh from the gateway inspector's Access section and put it back where the connect block placed it. A regenerated key invalidates every client that held the old one, which is the point of regenerating.

This 401 never shows in the request log: it refuses before routing, so the client's output is the only trace.

## The provider rejected the account [#provider-credential]

The request reached the provider and the provider turned the credential away. On the canvas, the failed cable's **Last error** chip quotes the provider's message, or falls back to `The target refused the credential.` when the answer carried nothing quotable.

For an **API key** account: run **Verify** on the row. `The provider rejected this key at the last check.` confirms the key itself is dead: revoked, rotated, or out of credit. Remove the row and connect the new key. The GLM, Qwen, and MiniMax coding-plan tokens live here too and fix the same way.

For a **subscription**: recompose refreshes its own sign-ins before spending them and retries once after a 401, so a transient expiry usually heals without you. An adopted account renews through the provider's own tool. When renewal can't run, recompose serves the credential as it stands and lets the provider be the one to refuse. A hard 401 on a subscription usually means the sign-in truly ended: see [Lapsed accounts](/docs/troubleshooting/lapsed-accounts).

## Still stuck

Note which of the two 401s you got, and its exact body, then follow [Collect logs](/docs/troubleshooting/collect-logs).
