---
title: 'curl'
description: 'Send raw requests to a gateway by hand.'
---

One port, four dialects. Every path below answers on the same address, and this page doubles as the wire truth for any client the catalog doesn't name.

- Dialect: all four
- Address shape: you write every path yourself
- Credential: any of the four spellings: the gateway's key, or the stand-in `unused` when it checks none

## Ask in the Anthropic dialect

```sh
curl http://127.0.0.1:8397/v1/messages \
  -H "Authorization: Bearer unused" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-fast","max_tokens":16,"messages":[{"role":"user","content":"ping"}]}'
```

A gateway reads the key from `Authorization`, `x-api-key`, `x-goog-api-key`, or a `key` query parameter, so a client that fills one of them with a placeholder still reaches through another.

## Or in the OpenAI dialect

```sh
curl http://127.0.0.1:8397/v1/chat/completions \
  -H "Authorization: Bearer unused" \
  -H "content-type: application/json" \
  -d '{"model":"claude-fast","messages":[{"role":"user","content":"ping"}]}'
```

The same gateway answers `/v1/responses` for the Responses dialect and `/v1beta/models/claude-fast:generateContent` for the Gemini one. [Gateway endpoints](/docs/reference/endpoints) lists every path.

## Read back what the gateway serves

```sh
curl http://127.0.0.1:8397/v1/models \
  -H "Authorization: Bearer unused"
```

Every virtual model comes back with the id a client sends and the name you gave it. The health path answers without a key at all.

## Notes

- The Anthropic wire format: [the Anthropic Messages reference](https://docs.claude.com/en/api/messages).
