# 0168: Copilot answers on the wire its own catalog names

**Status**: Accepted
**Date**: 2026-08-23

## Context

Every Copilot turn went to `/chat/completions`, from a fixed table, in the OpenAI-compatible
dialect. Copilot answered `model_not_supported` for a model a person picked from the app's own list.
The app offered that model because the model-list look takes every id the vendor publishes.

The account's live catalog settled what was happening. Of 54 models, 24 name `/chat/completions`,
12 name `/responses` alone, 6 name `/v1/messages` beside completions, and 18 name no endpoint. The
whole `mai-code` family and every `gpt-5` generation answer on Responses alone, so this gateway
couldn't reach any of them. Calling one on completions fails. Calling a completions model on
Responses fails differently, with `unsupported_api_for_model`, which states the rule outright.

Two attempts to filter the offered list from that catalog were wrong, and both came back out. CC
Switch keeps only entries carrying `model_picker_enabled`, and that's the flag this project would
have ported. On this account all 54 entries carry it as `false`, so the filter emptied the list.
Nothing else in the catalog predicts what an account may call. `gpt-4.1` answers and `gpt-5-mini`
refuses, yet the two entries match in policy state, picker flag and plan restriction. GitHub gates
that on its own side and publishes nothing about it.

## Decision

**The wire follows the model, read from that account's own catalog.** Completions leads the order,
then messages, then Responses. A model naming no endpoint keeps the completions reach this gateway
always took, and so does a turn whose catalog nobody could read.

**One read per account covers ten minutes.** A catalog answers the same for every turn inside that
window. A read that fails leaves the old reach standing rather than moving a turn on a guess.

**The offered list drops only what the catalog calls no chat model**, which is three embedding
models and one completion model. Copilot refused all four before this rule shipped. No other filter
applies, because no other catalog field predicts anything.

**Nothing predicts what an account may call.** The app offers a model the account may not call, the vendor
refuses it, and the vendor's own words reach the person.

## Consequences

Copilot's Responses-only models become reachable, which covers the whole `mai-code` family and every
`gpt-5` generation. One decision settles the dialect and the path together, so the two can never
disagree.

Each account pays one extra catalog read per ten minutes. A turn whose catalog won't load behaves
exactly as it did before this record.

The docstring on `subscriptionDialect` claimed Copilot serves the OpenAI-compatible dialect and only
that. This record corrects it: completions is what a turn falls back to, not what Copilot is.

Both rejected filters stay written down here, because each one looked right from the ported source
and each one broke the app. A Copilot rule now meets a live catalog before it ships.
