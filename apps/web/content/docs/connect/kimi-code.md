---
title: 'Kimi Code'
description: 'Point Kimi Code at a gateway through its config file.'
---

Kimi Code takes a provider block and a model block that names the provider back.

- Dialect: Anthropic Messages, at the bare origin
- Address shape: the bare origin, no `/v1`
- Credential: `api_key` in the file, with `unused` when the gateway checks no key

## Get the block

In the gateway's toolbar, click **Connect a client** and pick Kimi Code. The block below shows the shape with example values, and yours carries your gateway's own address, key, and one block per model.

## Write the config file

Write `~/.kimi/config.toml`:

```toml
[providers.recompose-my-gateway]
type = "anthropic"
base_url = "http://127.0.0.1:8397"
api_key = "unused"

[models.claude-fast]
provider = "recompose-my-gateway"
model = "claude-fast"
max_context_size = 262144
```

The `type` field also takes `openai_legacy`, `openai_responses`, and `gemini`, so one gateway can stand behind whichever dialect you want Kimi Code to speak.

## Start it

```sh
kimi
```

The model blocks are what `/model` offers, each under the provider it names.

## Verify

Send a prompt: the gateway's [request log](/docs/operate/request-log) takes the row, and the connect sheet's status line turns green.

## Notes

- Kimi Code's own reference: [the Kimi CLI provider docs](https://moonshotai.github.io/kimi-cli/en/configuration/providers.html).
