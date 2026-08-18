---
title: 'opencode'
description: 'Point opencode at a gateway through its provider config.'
---

opencode takes one provider in `opencode.json`, drawn by the `openai-compatible` package. The config lists every model the gateway serves, each under the id a client sends.

- Dialect: OpenAI Chat Completions
- Address shape: the origin plus `/v1`
- Credential: `apiKey` in the config: the gateway's key, or the stand-in `unused` when it checks none

## Get the block

In the gateway's toolbar, click **Connect a client** and pick opencode. The block below shows the shape with example values, and yours carries your gateway's own address, key, and full model list.

## Add the provider

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "recompose-my-gateway": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "My Gateway",
      "options": {
        "baseURL": "http://127.0.0.1:8397/v1",
        "apiKey": "unused"
      },
      "models": {
        "claude-fast": { "name": "Claude Fast" }
      }
    }
  }
}
```

The `openai-compatible` package reaches `/v1/chat/completions`. Swap it for `@ai-sdk/anthropic` to reach the Messages dialect, or `@ai-sdk/openai` for Responses.

## Start it and pick the model

```sh
opencode
/models recompose-my-gateway/claude-fast
```

A model key has to match what the gateway accepts in the `model` field, which is the virtual model id exactly as it stands on the canvas.

## Verify

Pick the model and send a prompt: the gateway's [request log](/docs/operate/request-log) takes the row, and the connect sheet's status line turns green.

## Notes

- opencode's own reference: [the opencode provider docs](https://opencode.ai/docs/providers/).
