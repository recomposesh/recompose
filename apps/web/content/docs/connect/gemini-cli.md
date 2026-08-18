---
title: 'Gemini CLI'
description: 'Point Gemini CLI at a gateway with two variables.'
---

Two variables and a launch flag. Plain `http` passes here because the address is loopback.

- Dialect: Gemini
- Address shape: the bare origin, no `/v1`
- Credential: `GEMINI_API_KEY`, with `unused` when the gateway checks no key

## Get the block

In the gateway's toolbar, click **Connect a client** and pick Gemini CLI. The block below shows the shape with example values, and yours carries your gateway's own address, key, and model id.

## Point it at the gateway and start it

```sh
export GOOGLE_GEMINI_BASE_URL="http://127.0.0.1:8397"
export GEMINI_API_KEY="unused"
gemini --model claude-fast
```

The base URL must be `https` unless it names `localhost`, `127.0.0.1`, or `[::1]`, which is exactly what a gateway on this machine is. The key travels as `x-goog-api-key`, one of the four spellings a gateway reads.

## Verify

Send a prompt: the gateway's [request log](/docs/operate/request-log) takes the row, and the connect sheet's status line turns green.

## Notes

- Gemini CLI's own reference: [the Gemini CLI configuration reference](https://github.com/google-gemini/gemini-cli/blob/main/docs/reference/configuration.md).
