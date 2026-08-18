---
title: 'Claude Desktop'
description: 'Point Claude Desktop at a gateway from developer mode.'
---

Claude Desktop takes a form inside the app, not an environment variable. Sessions then run on this machine only.

- Dialect: Anthropic Messages
- Address shape: the bare origin, no `/v1`
- Credential: none. The form takes an address and no key.

## Open the third-party inference form

Go to **Help**, open **Troubleshooting**, and turn on **Enable Developer Mode**. The app restarts carrying a **Developer** menu. It reads neither `ANTHROPIC_BASE_URL` nor a settings file, so this form is the only way in.

## Paste the address

Open **Developer** and choose **Configure Third-Party Inference**, then paste the gateway's address:

```text
http://127.0.0.1:8397
```

The form takes an address and no credential, so a gateway that [requires a key](/docs/operate/securing-a-gateway) stays out of reach of the desktop app. Turn that requirement off, or reach the gateway from [Claude Code](/docs/connect/claude-code) instead.

## Pick the model in the session

Type the virtual model's id where the session picks its model, for example `claude-fast`. With a gateway configured, the environment picker offers local sessions alone.

## Verify

Send a prompt: the gateway's [request log](/docs/operate/request-log) takes the row, and the connect sheet's status line turns green.

## Notes

- Claude Desktop's own reference: [the desktop gateway guide](https://code.claude.com/docs/en/llm-gateway-connect).
