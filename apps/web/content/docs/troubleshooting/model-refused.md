---
title: 'No model by that name'
description: 'What a 404 on the model name means, and where the name lives.'
---

## What you'll see [#model-not-found]

```json
{
  "type": "error",
  "error": { "type": "not_found_error", "message": "No model named \"gpt-fast\" is defined." }
}
```

This is the gateway speaking: the `model` the client sent isn't a [virtual model](/docs/compose/virtual-models) on this gateway. Like the other pre-routing refusals, it leaves no row in the request log.

## The name isn't on this gateway

Read back what the gateway actually serves:

```sh
curl http://127.0.0.1:8389/v1/models -H "Authorization: Bearer unused"
```

Every id in the answer works as a `model`, and nothing else does. Typos matter: ids are exact strings, lowercase letters, digits, dots, and dashes, starting and ending with a letter or digit.

## The client points at the wrong gateway

Each gateway owns its own virtual models. A client wired to port `8390` never sees the models of the gateway on `8389`. Check the port in the client's base URL against the toolbar's address pill.

## The client filters what it lists

Claude Code lists only model ids carrying `claude` or `anthropic`. A name typed on the canvas derives an id that carries one. So this reaches you on an id you edited by hand, or one stored before that. The model still works when sent explicitly, but it won't appear in that client's picker. The inspector says so under the model's facts and offers the reshaped id under **Model id**. The connect sheet hands you `ANTHROPIC_CUSTOM_MODEL_OPTION` when you'd rather keep the name you gave it.

## The provider refused its own model

A 404 in the provider's own words means the request routed fine and the target's **provider model** is wrong: renamed, retired, or never valid for that account. The failed cable's chip quotes the provider, or falls back to `The target serves no such model.` recompose validates the provider model against the account's live list only while you pick it, never after. A saved binding can go stale when a provider retires a model: select the target and pick again.

## Still stuck

Keep the exact refusal body and the output of the `/v1/models` read, then follow [Collect logs](/docs/troubleshooting/collect-logs).
