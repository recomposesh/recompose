---
title: 'Codex CLI'
description: 'Point Codex at a gateway through its configuration file.'
---

Codex takes one provider block at user level. Responses is the only wire the current Codex speaks, and a gateway serves it out of the box.

- Dialect: OpenAI Responses
- Address shape: the origin plus `/v1`
- Credential: an environment variable the config names: the gateway's key, or the stand-in `unused` when it checks none

## Get the block

In the gateway's toolbar, click **Connect a client** and pick Codex CLI. The blocks below show the shape with example values, and yours carries your gateway's own port, key, and model id.

## Write the provider into the config file

Add the block to `~/.codex/config.toml`:

```toml
model = "claude-fast"
model_provider = "recompose-my-gateway"

[model_providers.recompose-my-gateway]
name = "My Gateway"
base_url = "http://127.0.0.1:8397/v1"
env_key = "RECOMPOSE_MY_GATEWAY_API_KEY"
wire_api = "responses"
```

Codex ignores `model_provider` and `model_providers` in a project-local `.codex/config.toml`, so the block belongs in the user-level file. Anywhere else, Codex warns at startup and keeps talking to OpenAI. The provider id can be anything except `openai`, `ollama`, and `lmstudio`, which Codex reserves.

## Hand it the key and start it

```sh
export RECOMPOSE_MY_GATEWAY_API_KEY="unused"
codex
```

Codex reads the variable named by `env_key` and presents it as a bearer token, one of the four spellings a gateway accepts. The file names one model as the default: reach any other with `codex --model` and the id, or its `-m` alias.

## Verify

Ask Codex something and watch the gateway's [request log](/docs/operate/request-log) take the row. The status line at the foot of the connect sheet turns green on the first request.

## Notes

- The command line, the editor extension, and the desktop app all read the same user-level file, so one block serves all three.
- Codex's own reference: [the Codex config reference](https://developers.openai.com/codex/config-reference).
