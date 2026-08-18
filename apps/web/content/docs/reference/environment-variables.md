---
title: 'Environment variables'
description: 'What recompose reads, and what you export for clients.'
---

Two unrelated lists share this page. The first changes how recompose itself runs. The second never reaches recompose at all: they're the variables the [connect sheet](/docs/connect) and the provider rows tell you to export so a client finds your gateway.

## Variables recompose reads

| Variable                      | Default                 | Effect                                                                |
| ----------------------------- | ----------------------- | --------------------------------------------------------------------- |
| `RECOMPOSE_USER_DATA_DIR`     | `~/.recompose`          | Moves the whole [config home](/docs/reference/configuration-files)    |
| `RECOMPOSE_PLUGIN_DIR`        | `<config home>/plugins` | Where the engine loads provider plugins from                          |
| `RECOMPOSE_LOG_DIR`           | `<config home>/logs`    | Where the provider observation log writes                             |
| `RECOMPOSE_PASSWORD_STORE`    | unset                   | Passes Chromium's `--password-store` switch, for Linux keyring choice |
| `RECOMPOSE_WINDOW_STAYS_BACK` | unset                   | `1` keeps the window hidden at launch                                 |
| `RECOMPOSE_SERVING_ORIGIN`    | the vendor's origin     | Points subscription traffic at a loopback origin, for testing         |
| `RECOMPOSE_DEV_UPDATE_FEED`   | unset                   | Points the updater at a local feed, for testing updates               |

The origin overrides accept loopback hosts only. Aim one anywhere else and recompose ignores it and logs why, rather than sending traffic off the machine.

## Variables you export for clients

recompose reads none of these. Each connect block fills them with your gateway's values, and the key value is the gateway's key or the stand-in `unused` when it [checks none](/docs/operate/securing-a-gateway).

| Variable                                     | Who reads it                                                   | What the sheet fills                     |
| -------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------- |
| `RECOMPOSE_<SLUG>_API_KEY`                   | Codex and DeepSeek Harness configs name it as their key source | The gateway's key                        |
| `ANTHROPIC_BASE_URL`                         | Claude Code                                                    | The bare origin                          |
| `ANTHROPIC_AUTH_TOKEN`                       | Claude Code                                                    | The key, sent as `Authorization: Bearer` |
| `ANTHROPIC_MODEL`                            | Claude Code                                                    | A virtual model id                       |
| `CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY` | Claude Code                                                    | `1`, so it lists your virtual models     |
| `GOOGLE_GEMINI_BASE_URL`                     | Gemini CLI                                                     | The bare origin                          |
| `GEMINI_API_KEY`                             | Gemini CLI                                                     | The key                                  |

The slug placeholder follows the gateway's name: a gateway called `my gateway` yields `RECOMPOSE_MY_GATEWAY_API_KEY`.

Two more come from the Providers screen rather than the connect sheet. A Claude or Codex row's **Use this account** act prints an export of `CLAUDE_CONFIG_DIR` or `CODEX_HOME`, pointing the vendor's own tool at the account's config home. Those steer your terminal's tool, not the gateway.
