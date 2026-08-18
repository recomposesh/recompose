---
title: 'API keys'
description: 'Paste a key, verify it on demand, replace it when it rotates.'
---

An API key account is one pasted secret spent against one documented host. Connecting asks for a name and the key, and nothing else: recompose already knows the address and the wire format for every card in the catalog.

| Card            | The key reaches                     |
| --------------- | ----------------------------------- |
| Anthropic API   | `api.anthropic.com`                 |
| OpenAI API      | `api.openai.com`                    |
| Gemini API      | `generativelanguage.googleapis.com` |
| Mistral         | `api.mistral.ai`                    |
| xAI Grok        | `api.x.ai`                          |
| DeepSeek        | `api.deepseek.com`                  |
| Moonshot AI     | `api.moonshot.ai`                   |
| Qwen            | `dashscope.aliyuncs.com`            |
| Custom endpoint | A base URL you type                 |

The connect sheet says which host will hold the key before you paste it, as `This key reaches api.anthropic.com`.

## Shape hints, never rules

Some vendors document how their keys open: `sk-ant-` for Anthropic, `sk-proj-` for OpenAI, `AIza` for Gemini. The paste field shows the opening as a hint, and a paste that looks like another vendor's key draws a warning: `The key's shape suggests OpenAI rather than Anthropic. Connect it anyway if it belongs here.` The warning never blocks. Vendors change key formats without notice, so recompose treats a shape as a recognition aid and stores whatever you confirm.

## What the row shows

A stored key row reads as the product, the name you gave it, and a mask ending in the key's last four characters. The secret itself lives in an encrypted vault and never reaches the screen again. A key is never edited: when one rotates, remove the row and connect the new key.

## Verify

The row's overflow menu offers **Verify**, which asks the vendor whether the key authenticates, right now. Three answers come back:

- `This key worked at the last check.`
- `The provider rejected this key at the last check.`
- `Couldn't reach the provider, so this key is unverified.`

The verdict describes the moment you pressed the button, and recompose stores no standing from it. Verify appears only where the vendor documents the endpoint: a custom endpoint offers none, because nobody documented what lives at an address you typed.

## The coding-plan tokens that live here

The GLM, Qwen, and MiniMax coding plans connect from the [Subscriptions catalog](/docs/providers/subscriptions) but store as API keys. Their rows stand on this screen and carry Verify like any other key.

## Custom endpoint

The **Custom endpoint** card connects any host that speaks one of three dialects: OpenAI Chat Completions, Anthropic Messages, or OpenAI Responses. The form asks for a name, a base URL, the dialect, and the key, because you're the only source of all four. A partial address draws `Enter a full address, starting with https://.` and the sheet waits.

## Removing

**Remove** on the overflow menu deletes the row and releases the key from the vault. No confirmation step stands between the click and the deletion, so treat the menu item as the act itself.
