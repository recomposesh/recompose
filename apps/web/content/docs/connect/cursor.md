---
title: 'Cursor'
description: 'Point Cursor at a gateway with a base URL override.'
---

Cursor takes an OpenAI key and an overridden base URL, both under the model settings.

- Dialect: OpenAI Chat Completions
- Address shape: the origin plus `/v1`
- Credential: the OpenAI key field, with `unused` when the gateway checks no key

## Get the values

In the gateway's toolbar, click **Connect a client** and pick Cursor. The values below are examples, and yours carry your gateway's own address, key, and model id.

## Fill the key field

Open **Settings**, go to **Models**, and paste the key into **OpenAI API Key**:

```text
unused
```

Cursor keeps that field named for OpenAI whatever endpoint stands behind it, so the gateway key goes there.

## Override the base URL

Turn on **Override OpenAI Base URL** and paste the address:

```text
http://127.0.0.1:8397/v1
```

Press **Verify** beside it once the address is in, which is how Cursor takes the key and the endpoint together.

## Add the model

Add the virtual model's id to the model list by hand, for example `claude-fast`.

The override reaches whatever runs on chat completions. Tab completion keeps running on the models Cursor hosts, so a gateway on this machine serves the editor rather than that.

## Verify

Send a chat message: the gateway's [request log](/docs/operate/request-log) takes the row, and the connect sheet's status line turns green.

## Notes

- Cursor's own reference: [the Cursor docs](https://cursor.com/docs).
