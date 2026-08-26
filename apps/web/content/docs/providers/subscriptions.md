---
title: 'Subscriptions'
description: 'Use the coding plans you already pay for.'
---

A subscription account is a plan you already pay for, connected so a gateway can spend it. The catalog holds eight plans, and they connect three different ways.

| Plan                 | How it connects                                                  |
| -------------------- | ---------------------------------------------------------------- |
| Claude               | The `claude` tool signs in                                       |
| Codex                | The `codex` tool signs in                                        |
| GitHub Copilot       | A device code recompose runs                                     |
| Kimi Code            | A device code recompose runs                                     |
| Gemini (Antigravity) | A browser sign-in recompose runs                                 |
| GLM Coding Plan      | A pasted token, stored as an [API key](/docs/providers/api-keys) |
| Qwen Coding Plan     | A pasted token, stored as an API key                             |
| MiniMax Coding Plan  | A pasted token, stored as an API key                             |

## When the provider's own tool signs in

Claude and Codex sign in through their own tools, under the provider's own terms. recompose opens a terminal pointed at the account's directory and steps back: you watch the tool do its usual dance, browser included. Without the tool installed, the sheet says so and the sign-in button stays unavailable.

A machine that already runs Claude Code or Codex offers a faster way in: the sheet finds the account the tool holds and connects it in one press. An adopted account stays the tool's own, and recompose never renews it.

## When recompose runs the sign-in

GitHub Copilot and Kimi Code use a device code: the sheet shows a code and the address to enter it at, and the code expires if it waits too long. Gemini (Antigravity) opens a browser sign-in and listens for the return. The account needs a Google account that Antigravity recognizes.

## What recompose does with the credential

Nothing beyond holding it. recompose never refreshes a credential, never spends one outside the requests you route, and never edits what the provider's tool wrote. A subscription request leaves in the provider tool's own shape, which the [FAQ's terms answer](/docs/get-started/faq#tos) covers.

## Which account your terminal reaches

Signing in points your terminal's config home at the account you just signed in. That row then shows `Your terminal reaches this account.` with a copyable export line. This changes what your own terminal spends, never what a gateway spends, because the canvas alone decides that. Removing the account your terminal reaches hands the pointer to another connected account on the same plan.

One macOS caveat, out loud: the login keychain holds one Claude Code login per OS user. The machine-wide Claude Code login therefore follows whichever Claude account you signed in last.

## When a row lapses

A lapsed row says how to come back. An account recompose signed in offers **Sign in again** on the row. An adopted account says `Open Claude to sign in again` instead, because a second renewer would sign you out of your own tool.
