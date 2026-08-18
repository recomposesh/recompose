---
title: 'Cline'
description: 'Point Cline at a gateway through its provider settings.'
---

Cline takes its OpenAI compatible provider, pointed at the gateway's address by hand.

- Dialect: OpenAI Chat Completions
- Address shape: the origin plus `/v1`
- Credential: the key field: the gateway's key, or the stand-in `unused` when it checks none

## Get the values

In the gateway's toolbar, click **Connect a client** and pick Cline. The values below are examples, and yours carry your gateway's own address, key, and model id.

## Fill the provider form

Open the gear icon, set **API Provider** to **OpenAI Compatible**, and fill the three fields in order:

```text
http://127.0.0.1:8397/v1
unused
claude-fast
```

Base URL, then the key, then the model id. Paste the id exactly: the form passes it through untouched, so it has to match what the gateway serves.

## Verify

Send a task: the gateway's [request log](/docs/operate/request-log) takes the row, and the connect sheet's status line turns green.

## Notes

- Cline's own reference: [the Cline provider docs](https://docs.cline.bot/provider-config/openai-compatible).
