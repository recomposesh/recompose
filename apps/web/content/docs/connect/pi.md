---
title: 'pi'
description: 'Point pi at a gateway through its models file.'
---

pi takes one JSON file, reread every time the model picker opens. No restart.

- Dialect: any of the four, named per provider
- Address shape: the origin plus `/v1` for the OpenAI dialects, the bare origin for Messages
- Credential: `apiKey` in the file, with `unused` when the gateway checks no key

## Get the block

In the gateway's toolbar, click **Connect a client** and pick pi. The block below shows the shape with example values, and yours carries your gateway's own address, key, and model list.

## Write the models file

Write `~/.pi/agent/models.json`:

```json
{
  "providers": {
    "recompose-my-gateway": {
      "baseUrl": "http://127.0.0.1:8397/v1",
      "api": "openai-completions",
      "apiKey": "unused",
      "models": [{ "id": "claude-fast" }]
    }
  }
}
```

The `api` field also takes `anthropic-messages`, `openai-responses`, and `google-generative-ai`: one name for each dialect a gateway serves. The Messages dialect wants the bare origin rather than `/v1`.

## Start it and pick the model

```sh
pi
/model recompose-my-gateway/claude-fast
```

pi reads the file again each time `/model` opens, so an edit lands without leaving the session. `Ctrl+L` opens the same picker.

## Verify

Send a prompt: the gateway's [request log](/docs/operate/request-log) takes the row, and the connect sheet's status line turns green.

## Notes

- pi's own reference: [the pi models reference](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/models.md).
