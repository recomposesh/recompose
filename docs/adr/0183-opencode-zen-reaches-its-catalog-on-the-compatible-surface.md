# 0183: OpenCode Zen reaches its catalog on the compatible surface

**Status**: Accepted
**Date**: 2026-08-24

## Context

OpenCode Zen is a gateway: one key that reaches a curated catalog of coding models. That's the
shape Architecture Decision Record (ADR) 0073 already describes, so the aggregator machinery takes
it without a new kind. Two facts about the vendor still needed deciding.

The first is where a turn lands. The vendor's own endpoints table names a different address per
model family. The OpenAI and Grok models answer on `/zen/v1/responses`. The Claude and Qwen models
answer on `/zen/v1/messages`. Each Gemini model answers on a path carrying its own name, and the
rest answer on `/zen/v1/chat/completions`. The provider directory holds one dialect per vendor, so
a table read that way has no single answer.

The vendor publishes a second one. models.dev, the registry OpenCode maintains and its own tool
reads, registers the provider under `@ai-sdk/openai-compatible` with `https://opencode.ai/zen/v1`
as its base. That base serves every model id `/zen/v1/models` lists, under one namespace. The
compatible surface is the whole catalog, and the endpoints table names the passthrough each model
also answers on.

The second is what to call it. `opencode` already names a client in the canvas connect catalog, the
coding tool a person points at recompose. A provider stored under the same word would read as that
tool wherever a person searches the two together.

## Decision

**OpenCode Zen enters the directory as `opencode-zen`, spoken in Chat Completions at
`https://opencode.ai/zen`.** The origin stops one segment short of the version, as every other
compatible vendor's does, so the dialect appends `/v1/chat/completions` and the turn lands on the
address models.dev names. One row in the directory answers for the whole catalog.

**The hyphen in the id never reaches the screen.** The catalog entry, the row title, and the target
card all read `OpenCode Zen`, and the mark alias draws the `opencode` logo the inventory already
holds. A stored id is an identity, not a label.

**The row offers no check, by the rule ADR 0073 already set.** `/zen/v1/models` answers 200 with no
credential at all, so a probe against it would bless a garbage key.

## Consequences

**Good**: a person connects one key and routes any model in the catalog from the canvas, with
nothing about the model family surfacing at connect time. Adding a vendor stayed a single directory
row plus a single catalog entry, which is the whole point of the table.

**Bad**: a Zen model whose behavior differs between its native endpoint and the compatible one will
differ here, and recompose has no way to notice. Reasoning content on the Responses models is the
likeliest place to feel it. Zen model prices are absent from the bundled price table, so spend for
these targets reads as no cost until that table carries them.

## Alternatives

**Routing per model family, the way the endpoints table reads.** Rejected: it would put a
model-to-dialect table in the directory for one vendor, and that table goes stale every time Zen
adds a model. The vendor already publishes the mapping it wants clients to use, and it points at
one surface.

**Storing the vendor as `opencode`.** Rejected: the word already names the client, and one word for
two things is the ambiguity the naming rules exist to prevent.

**Entering it under API Keys instead.** Rejected: an API key row names the one host it spends its
key against, and this key reaches a catalog of them. Naming one would name the wrong one.
