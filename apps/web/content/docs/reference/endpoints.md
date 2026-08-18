---
title: 'Gateway endpoints'
description: 'Every path a gateway serves, dialect by dialect.'
---

## Conventions

A gateway serves at the root of `http://<bind address>:<port>`, with no path prefix. When the gateway [requires a key](/docs/operate/securing-a-gateway), every path except the health paths sits behind it, and the key rides in `Authorization` (with or without `Bearer`), `x-api-key`, `x-goog-api-key`, or a `?key=` query parameter.

Model routes stream when the request body carries `stream: true`, as `text/event-stream`. Streamed answers add two headers naming what served them: `x-recompose-virtual-model` and `x-recompose-target`.

Every error recompose itself raises is a typed refusal in the caller's dialect. An error the provider wrote passes through as the provider wrote it. Two corners answer in a fixed Anthropic-style shape whatever the caller speaks: the unknown-path 404 and the token-count route's own refusals.

## Health

| Method        | Path       | Answer                                |
| ------------- | ---------- | ------------------------------------- |
| `GET`         | `/health`  | `{ "gateway": "<display name>" }`     |
| `GET`, `HEAD` | `/healthz` | `{ "status": "ok" }`, empty on `HEAD` |

Both answer without a key, always.

## Discovery

`GET /v1/models` lists the gateway's virtual models: the `id` a client sends and the `display_name` you gave it. One merged shape serves every client, carrying the OpenAI markers (`object: "list"`, `object: "model"`) and the Anthropic markers (`type`, `first_id`, `last_id`, `has_more`) side by side.

## Model routes

Each dialect owns a path, and each path also answers without the `/v1` prefix:

| Path                                       | Dialect                 |
| ------------------------------------------ | ----------------------- |
| `/v1/messages`                             | Anthropic Messages      |
| `/v1/chat/completions`                     | OpenAI Chat Completions |
| `/v1/responses`                            | OpenAI Responses        |
| `/v1/interactions`, `/v1beta/interactions` | Interactions            |
| `/v1beta/models/<model>:generateContent`   | Gemini                  |

The Gemini route reads the model from the path rather than the body, and `:streamGenerateContent` is its streaming form. Requests route by the `model` field through [routing semantics](/docs/reference/routing-semantics), and a model no virtual model owns gets the 404 refusal that page shows.

## Side routes

A handful of paths serve one job each and skip the router walk: they answer from the virtual model's first declared target.

| Path                                                       | Purpose                         |
| ---------------------------------------------------------- | ------------------------------- |
| `/v1/messages/count_tokens`                                | Token counting, Anthropic style |
| `/v1/responses/compact`                                    | Codex conversation compaction   |
| `/v1/alpha/search`                                         | Codex alpha search              |
| `/v1/images/generations`, `/v1/images/edits`               | Image generation and editing    |
| `/v1/videos`, plus `/generations`, `/edits`, `/extensions` | Video generation                |

## Management

Two key-guarded paths expose the gateway's own records:

- `GET /v0/management/logs?limit&after` reads the provider observation log, and `DELETE` on the same path clears it.
- `GET /v0/management/usage-queue?count=N` pops the N oldest usage observations. Reading is consuming: a popped record never comes back.

## Sockets

`GET /v1/ws` upgrades to the browser-relay channel the AI Studio provider uses. A GET upgrade on `/v1/responses` opens the xAI realtime proxy, while POST on the same path stays the Responses model route.

## Anything else

An unserved path gets 404 with `The gateway "<name>" serves no path "<path>".`
