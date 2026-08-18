---
title: 'Claude Code'
description: 'Point Claude Code at a gateway with environment variables.'
---

Claude Code reads its endpoint once, at startup, and a running session keeps the endpoint it began with. Set the variables first and start it after.

- Dialect: Anthropic Messages
- Address shape: the bare origin, no `/v1`
- Credential: `ANTHROPIC_AUTH_TOKEN`, with the stand-in `unused` when the gateway checks no key

## Get the block

In the gateway's toolbar, click **Connect a client**. The sheet opens on Claude Code: copy the first block. The blocks below show the shape with example values, and yours carries your gateway's own port, key, and model id.

## Point it at the gateway

```sh
export ANTHROPIC_BASE_URL="http://127.0.0.1:8397"
export ANTHROPIC_AUTH_TOKEN="unused"
export ANTHROPIC_MODEL="claude-fast"
export CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY="1"
claude
```

The token rides in `Authorization: Bearer`. `ANTHROPIC_API_KEY` sends the same value as `x-api-key` instead, and a gateway reads either one. The last variable puts every model the gateway serves into the `/model` picker, labelled `From gateway`.

## Or use the settings file

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "http://127.0.0.1:8397",
    "ANTHROPIC_AUTH_TOKEN": "unused",
    "ANTHROPIC_MODEL": "claude-fast"
  }
}
```

`~/.claude/settings.json` reaches background agents as well, which a shell export doesn't. When both set the same variable, the settings file wins.

## Verify

Run `/status` inside a session: it reads back the base URL in use. An error naming an unknown model still proves the URL and the credential work. On the gateway side, the request shows in the [request log](/docs/operate/request-log).

## Notes

- Only ids starting with `claude` or `anthropic` appear in the `/model` picker. Any id still works when `ANTHROPIC_MODEL` names it directly.
- Claude Code's own reference: [Anthropic's gateway guide](https://code.claude.com/docs/en/llm-gateway-connect).
