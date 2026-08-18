---
title: 'omp'
description: 'Point omp at a gateway through its provider file.'
---

omp takes a provider entry in `models.yml`, with the key carried as a bearer token. It can list models by hand or read the gateway's own list.

- Dialect: any of the four, named per provider
- Address shape: the origin plus `/v1` for the OpenAI dialects
- Credential: `apiKey` in the file: the gateway's key, or the stand-in `unused` when it checks none

## Get the block

In the gateway's toolbar, click **Connect a client** and pick omp. The block below shows the shape with example values, and yours carries your gateway's own address, key, and model list.

## Write the provider file

Write `~/.omp/agent/models.yml`:

```yaml
providers:
  recompose-my-gateway:
    baseUrl: http://127.0.0.1:8397/v1
    api: openai-completions
    apiKey: unused
    authHeader: true
    models:
      - id: claude-fast
```

`apiKey` takes an environment variable name or a literal value, and `authHeader` puts whichever it resolves into `Authorization: Bearer`.

## Or let it read the gateway model list

Swap the `models` list for discovery, at the same depth under the provider:

```yaml
providers:
  recompose-my-gateway:
    discovery:
      type: openai-models-list
```

Discovery calls the OpenAI-shaped model list the gateway already serves, so every virtual model arrives and none needs naming twice.

## Start it on that model

```sh
omp --model recompose-my-gateway/claude-fast
```

Naming the model at launch skips the picker. Plain `omp` opens on whichever model it last used.

## Verify

Send a prompt: the gateway's [request log](/docs/operate/request-log) takes the row, and the connect sheet's status line turns green.

## Notes

- omp's own reference: [the omp provider docs](https://github.com/can1357/oh-my-pi/blob/main/docs/providers.md).
