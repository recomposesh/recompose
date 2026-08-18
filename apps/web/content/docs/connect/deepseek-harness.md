---
title: 'DeepSeek Harness'
description: 'Point DeepSeek Harness at a gateway from its browser interface.'
---

DeepSeek Harness takes a custom provider added in its browser interface, or the same block in `settings.yaml`.

- Dialect: OpenAI Chat Completions
- Address shape: the origin plus `/v1`
- Credential: a named environment variable, with `unused` when the gateway checks no key

## Get the block

In the gateway's toolbar, click **Connect a client** and pick DeepSeek Harness. The blocks below show the shape with example values, and yours carries your gateway's own address, key, and model list.

## Start the web interface

```sh
npx @deepseek-ai/dsh web
```

The harness opens in a browser rather than a terminal, at `http://127.0.0.1:3080` by default.

## Add the provider in the interface

Under **Settings**, open **Models** and add a custom provider with the gateway's address and key:

```text
http://127.0.0.1:8397/v1
unused
```

The version segment belongs in the base URL there, because the harness appends the operation path itself. **Fetch available models** then reads the list the gateway serves.

## Or write the settings file

Write the same provider into `$DSH_HOME/settings.yaml`:

```yaml
llm-pi-ai:
  providers:
    recompose-my-gateway:
      api: openai-completions
      baseURL: http://127.0.0.1:8397/v1
      apiKeyEnv: RECOMPOSE_MY_GATEWAY_API_KEY
      models:
        - id: claude-fast
```

A model entered by hand counts as text-only until it says otherwise, so add `input: [text, image]` to any model whose targets take images.

## Hand it the key the file names

```sh
export RECOMPOSE_MY_GATEWAY_API_KEY="unused"
```

The settings file names the variable rather than holding the key, and the harness answers `MISSING_CREDENTIAL` while nothing sets it. A key entered through the Models page needs no variable at all.

## Verify

Send a prompt: the gateway's [request log](/docs/operate/request-log) takes the row, and the connect sheet's status line turns green.

## Notes

- DeepSeek Harness's own reference: [the DeepSeek Harness provider guide](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/guide/providers.md).
