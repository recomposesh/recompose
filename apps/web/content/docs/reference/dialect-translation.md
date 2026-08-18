---
title: 'Dialect translation'
description: 'What survives the crossing between wire formats, and what drops.'
---

A client speaks one dialect and the target may speak another. The gateway translates between five: Anthropic Messages, OpenAI Chat Completions, OpenAI Responses, Gemini, and Interactions. Every pairing works, in both directions, and a request whose two ends speak the same dialect passes through untranslated.

## How translation works

Translation crosses a neutral internal form: the source dialect decodes into it, the target dialect encodes out of it. Every field in the source request meets one of three fates. It carries over, it maps to the target's equivalent, or it drops because the target has no place for it. Dropped means omitted upstream: recompose never substitutes a value the client didn't send.

## What carries

The conversation itself survives every crossing: system texts, user and assistant messages, and text, image, audio, video, document, and thinking blocks. So does the machinery around it. Tool definitions, tool calls and results, tool choice, response format, reasoning effort, and streaming all carry, along with the sampling knobs: max output tokens, temperature, top-p, and stop sequences. Stop reasons map onto a shared set, and token usage translates through a five-way split of input, output, cache reads, cache writes, and reasoning tokens.

## What drops, by target

Fields the target dialect can't carry drop from the outbound request:

- **Toward Anthropic Messages**: `top_k`, `metadata`, `inference_geo`, `container`, `output_config`, and foreign-shaped `cache_control`.
- **Toward Chat Completions**: `logprobs`, `top_logprobs`, `metadata`, `prediction`, `presence_penalty`, `frequency_penalty`, `seed`, `logit_bias`, `store`, `user`, and `audio`.
- **Toward Responses**: `store`, `metadata`, `top_logprobs`, `truncation`, `user`, and `prompt_cache_key`.

A few of these can move your bill rather than your output: dropping `cache_control` or `prompt_cache_key` costs cache hits. The drop lists mark those, and the translation still proceeds.

## What refuses instead of dropping

Some crossings have no honest mapping, and those come back as typed refusals rather than silent edits:

| Refusal                                                          | Status |
| ---------------------------------------------------------------- | ------ |
| `This dialect cannot carry the field "<field>".`                 | 400    |
| `The stop reason "<reason>" has no counterpart in this dialect.` | 422    |
| A tool call too broken to repair                                 | 422    |
| `The request carries no message to translate.`                   | 400    |
| Two tools colliding on one id                                    | 400    |

## Model names

The `model` a client sends is always the virtual model's id. Each target carries its own provider model, and the gateway rewrites the outbound `model` per attempt. Answers come back attributed to the id the client asked for.

## Errors across the crossing

A refusal recompose raises renders in the caller's dialect. An error the provider wrote reaches the caller as written, translated in shape when the two ends differ but never reworded. `Retry-After` survives as delay seconds.

## Streaming events

Each dialect keeps its own event grammar on the way back: named `event:` frames for Anthropic and Responses, bare `data:` chunks ending in `data: [DONE]` for Chat Completions, JSON objects for Gemini. The gateway maps content deltas, tool-call arguments, and reasoning summaries between them, so a client sees its own dialect's stream whatever the target spoke.
