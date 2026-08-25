---
title: 'Claude Code'
description: 'Point Claude Code at a gateway with environment variables.'
---

Claude Code reads its endpoint once, at startup, and a running session keeps the endpoint it began with. Set the variables first and start it after.

- Dialect: Anthropic Messages
- Address shape: the bare origin, no `/v1`
- Credential: `ANTHROPIC_AUTH_TOKEN`: the gateway's key, or the stand-in `unused` when it checks none

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

The token rides in `Authorization: Bearer`. `ANTHROPIC_API_KEY` sends the same value as `x-api-key` instead, and a gateway reads either one. The last variable puts every model whose id carries `claude` or `anthropic` into the `/model` picker, labelled `From gateway`.

## Or use the settings file

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "http://127.0.0.1:8397",
    "ANTHROPIC_AUTH_TOKEN": "unused",
    "ANTHROPIC_MODEL": "claude-fast",
    "CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY": "1"
  }
}
```

`~/.claude/settings.json` reaches background agents as well, which a shell export doesn't, so the sheet gives it the same variables rather than a shorter set. When both set the same variable, the settings file wins.

## When the picker skips your id

Discovery keeps an id only when it carries `claude` or `anthropic` anywhere in the string. An id outside those words serves every request that names it, and appears in that picker for nobody.

A name typed on the canvas derives an id that carries the word, so a model composed in recompose reaches the picker without anyone thinking about it. You meet this section when you edited the id by hand, or when the model predates that. The sheet adds one more variable to both blocks when your gateway's first model is such an id:

```sh
export ANTHROPIC_CUSTOM_MODEL_OPTION="fast-sonnet"
```

That names the model outright, so it joins the picker as a row of its own and skips the check discovery reads ids through. The other fix is to rename the id: the virtual model's inspector says which ids the picker lists and offers the reshaped one under **Model id**, one press away.

## Verify

Run `/status` inside a session: it reads back the base URL in use. An error naming an unknown model still proves the URL and the credential work. On the gateway side, the request shows in the [request log](/docs/operate/request-log).

## Notes

- Only ids carrying `claude` or `anthropic` appear in the `/model` picker. Any id still works when `ANTHROPIC_MODEL` or `ANTHROPIC_CUSTOM_MODEL_OPTION` names it directly.
- Claude Code's own reference: [Anthropic's gateway guide](https://code.claude.com/docs/en/llm-gateway-connect).
