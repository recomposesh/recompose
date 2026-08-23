---
title: 'Codex in ChatGPT'
description: 'Point the Codex surface inside ChatGPT at a gateway.'
---

The desktop app and the editor extension read the same file the command line does, so this page is the [Codex CLI setup](/docs/connect/codex-cli) plus one restart.

- Dialect: OpenAI Responses
- Address shape: the origin plus `/v1`
- Credential: an environment variable the config names: the gateway's key, or the stand-in `unused` when it checks none

## Write the same config

Follow the [Codex CLI page](/docs/connect/codex-cli): the provider block in `~/.codex/config.toml` and the exported key serve the app unchanged.

## Restart the app so it reads the file again

Quit Codex from its own menu, then open it again. The ChatGPT chat surface takes no custom endpoint of its own: only the Codex side reads `config.toml`, and it reads it once, at launch.

One caveat the command line doesn't share. The desktop model picker doesn't list a custom provider's models yet. A block that serves `codex` in a terminal can therefore leave the app still showing OpenAI's own list, and the command line is the way through until that lands.

## Verify

Ask Codex something and watch the gateway's [request log](/docs/operate/request-log) take the row.

## Notes

- Codex's own reference: [the Codex config reference](https://developers.openai.com/codex/config-reference).
