---
title: 'Kilo Code'
description: 'Point Kilo Code at a gateway with a custom provider.'
---

Kilo Code takes a custom provider of its own, and it reads the model list off the address you hand it.

- Dialect: OpenAI Chat Completions
- Address shape: the origin plus `/v1`
- Credential: the key field, with `unused` when the gateway checks no key

## Get the values

In the gateway's toolbar, click **Connect a client** and pick Kilo Code. The values below are examples, and yours carry your gateway's own address and key.

## Name the provider

Open **Settings**, go to **Providers**, and add a custom provider. The form takes a provider id and a display name of your choosing first, then the API it speaks:

```text
recompose-my-gateway
OpenAI Compatible
```

## Give it the address and the key

```text
http://127.0.0.1:8397/v1
unused
```

Kilo Code then reads the gateway's model list itself and offers every virtual model in a picker, so no id needs typing.

## Verify

Send a task: the gateway's [request log](/docs/operate/request-log) takes the row, and the connect sheet's status line turns green.

## Notes

- Kilo Code's own reference: [the Kilo Code provider docs](https://kilo.ai/docs/ai-providers/openai-compatible).
