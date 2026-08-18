---
title: 'Lapsed accounts'
description: "What lapsed means, what it doesn't, and the way back in."
---

## What you'll see

A subscription row on the Providers screen reads lapsed and offers a way back: **Sign in again** on an account recompose signed in, or `Open Claude to sign in again` on an adopted one. A second renewer would sign you out of your own tool, so the adopted row sends you there instead.

The canvas shows nothing: a lapsed account's target card looks exactly like a healthy one. The row is the only surface, so when requests fail, come look here.

## Lapsed doesn't mean failing

The row's standing reads the evidence on disk, not the future of your requests, and the two decouple in both directions:

- A **connected** row can hold an expired token. That's fine: recompose refreshes its own sign-ins right before spending them.
- A **lapsed adopted** row can still serve. Near expiry, recompose runs the owning tool's own renewal, so a request may heal the account before you do.

So confirm the failure before fixing the row: send a request through the gateway and read the answer.

## What a truly lapsed account produces

When the sign-in vanished rather than went stale, the account's grant fails and the virtual model answers 502:

```json
{
  "type": "error",
  "error": {
    "type": "api_error",
    "message": "The virtual model \"claude-fast\" in the gateway \"My gateway\" has no account behind it. Reconnect the account it spends, or point it at another."
  }
}
```

When the credential still exists but the provider rejects it, the provider's own 401 passes through instead: [Authentication errors](/docs/troubleshooting/authentication-errors) tells those apart.

## Sign in again

On the row's own act, the sign-in runs the same way it did the first time. Claude and Codex go through the provider's tool, and the rest use the device code or browser. An adopted account renews inside its own tool: open the tool, sign in there, and the row reads connected on the next look.

The GLM, Qwen, and MiniMax coding plans never lapse, because they're stored as [API keys](/docs/providers/api-keys). A dead plan token fails at spend with the provider's 401: replace the key.

## Still stuck

Note the row's standing, the exact refusal the client got, and whether Sign in again changed either, then follow [Collect logs](/docs/troubleshooting/collect-logs).
