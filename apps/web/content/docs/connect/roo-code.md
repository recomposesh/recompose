---
title: 'Roo Code'
description: 'Point Roo Code at a gateway through its provider settings.'
---

Roo Code takes its OpenAI compatible provider, pointed at the gateway's address by hand.

- Dialect: OpenAI Chat Completions
- Address shape: the origin plus `/v1`
- Credential: the key field: the gateway's key, or the stand-in `unused` when it checks none

## Get the values

In the gateway's toolbar, click **Connect a client** and pick Roo Code. The values below are examples, and yours carry your gateway's own address, key, and model id.

## Fill the provider form

Open the settings panel, set **API Provider** to **OpenAI Compatible**, and fill the three fields in order:

```text
http://127.0.0.1:8397/v1
unused
claude-fast
```

Base URL, then the key, then the model id. Paste the id exactly: the form passes it through untouched, so it has to match what the gateway serves.

## Verify

Send a task: the gateway's [request log](/docs/operate/request-log) takes the row, and the connect sheet's status line turns green.

## Notes

- Roo Code's own reference: [the Roo Code provider docs](https://docs.roocode.com/providers/openai-compatible).
