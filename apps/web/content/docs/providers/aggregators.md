---
title: 'Aggregators'
description: 'One key that reaches many models.'
---

An aggregator account is one key that reaches a whole catalog of models through a single vendor. Where an [API key](/docs/providers/api-keys) pins one provider, an aggregator key answers for whichever model each request names.

| Card              | What the catalog says about it         |
| ----------------- | -------------------------------------- |
| OpenRouter        | One key, 300+ models                   |
| Together AI       | Open-weights catalog                   |
| Fireworks AI      | Fast open-model inference              |
| Groq              | Lowest latency on its own silicon      |
| DeepInfra         | Low-cost open-model catalog            |
| Cerebras          | Wafer-scale, fastest tokens per second |
| OpenCode Zen      | Benchmarked models for coding agents   |
| Custom aggregator | A base URL and a dialect you choose    |

## Connecting

Pick a card, name the account, and paste the key. The sheet names no host for an aggregator: one key reaches many hosts, and naming one would name the wrong one. Which model the key spends is a routing decision, made per [target](/docs/compose/canvas) on the canvas rather than on this screen.

## Why the row offers no Verify

An aggregator row's overflow menu holds only **Remove**. That's deliberate. The models list an aggregator serves is a public catalog, the same for a good key and a dead one. A check against it can't prove your key authenticates. A green mark the check can't back would be the one lie this screen must never tell, so the screen shows nothing instead.

A dead aggregator key still surfaces, just later. The first request that spends it comes back as a typed refusal naming the account, and [routing](/docs/compose/failover) treats it like any other refusal.

## Custom aggregator

The **Custom aggregator** card takes the same form as a custom endpoint: a name, a base URL, a dialect, and the key. The row stores as an aggregator, so it names no host and offers no Verify, for the same reasons as the documented cards.

## Removing

**Remove** deletes the row and releases the key from the vault, with no confirmation step.
