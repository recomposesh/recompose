# 0169: A refusal that names its own remedy earns one more turn

**Status**: Accepted
**Date**: 2026-08-23

## Context

Two vendors refuse a turn they would have served, and both say so in the refusal.

OpenRouter prices a turn against the credit an account holds rather than against the model. A client
asking for the ceiling it always asks for gets a refusal: `You requested up to 32000 tokens, but can
only afford 6588`, under `metadata.limit_source: openrouter_credits`. Nothing ever attempted the
smaller answer the account could pay for.

Groq serves models that answer no tool call. `groq/compound` refuses the whole turn with
`` `tool calling` is not supported with this model `` and `param: "tool calling"`. The same turn
without tools goes through. The adjacent `openai/gpt-oss-20b` on that same account takes tools and
answers with a tool call, so this limits one model rather than a vendor.

Neither refusal answers to a table written here. The affordable number moves with the balance. Which
models take tools moves with the vendor's catalog, and that catalog states nothing about it.

## Decision

**A refusal naming its own remedy earns one more turn, reworded that way.** The rule reads the
refusal rather than the provider name. The `openrouter_credits` source under the error's metadata
caps the ask at the number the message states. A `param` of `tool calling` leaves the tools off.

**One more turn, and no further.** A second refusal of the same kind would say the same thing again.

**Only a status with a known remedy earns a body read.** A refused body tells the gateway the
remedy. A body still streaming would otherwise hold the turn open waiting for a remedy that was
never in it.

**Nothing comes off ahead of a refusal.** A model that takes tools never gets asked without them,
because it never refuses.

## Consequences

A free OpenRouter account answers instead of failing, with a shorter answer than the caller asked
for. That follows the ceiling this codebase already applies for a vendor-stated output limit.

A Groq model that answers no tool call replies in prose rather than refusing. A caller needing a
tool call gets an answer that makes none, and that's the only answer that model was going to give.
Every other model on the same account keeps its tools, which this record proves on the account where
the refusal turned up.

A vendor refusing for any other reason reaches the caller as it wrote it. The gateway reads no
unknown status, so no refusal path grows a wait on a body.
