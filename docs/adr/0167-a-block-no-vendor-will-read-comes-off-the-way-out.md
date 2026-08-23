# 0167: A block no vendor will read comes off on the way out

**Status**: Accepted
**Date**: 2026-08-23

## Context

A conditional router that re-judges every request moves one conversation between providers, turn by
turn. Whatever the last provider wrote comes back in the next request, and the next provider has to
take it. Two kinds of block reach a provider that then refuses the whole turn.

A Gemini signature carrier is the first. Gemini answers carry thought signatures, and the Anthropic
dialect has nowhere to put one. So a signature rides as a thinking block that holds no reasoning and
a `cpa-gemini-carrier-v1:` signature. Only `orderClaudeContentForGemini` knows how to spend one, and
that runs on the Gemini request path alone.

An empty text block is the second. Kimi answers `text content is empty` and refuses the turn. Every
upstream translator already skips one, among them
`TestConvertClaudeRequestToGemini_SkipsEmptyTextParts`. A turn reaching its target untranslated
meets no translator at all.

That last point makes this a gateway problem rather than a dialect one. `translateRequest` answers
`{ outcome: 'passthrough' }` when the caller and the target speak one dialect, and the raw body goes
upstream as the caller wrote it. Claude Code speaks Anthropic and Kimi answers Anthropic, so nothing
between them ever looked at the blocks.

## Decision

**Both blocks come off at `outboundBodyFor`.** That's the one place a translated body and a
passthrough body both pass. The scrub reads the Anthropic shape, the only shape either block
appears in.

**An empty text block comes off whichever way the turn goes.** No vendor reads one, and the Gemini
translator drops it anyway.

**A carrier comes off only where the target isn't Gemini.** The signature it holds speaks to Gemini,
so a turn going there keeps it.

**A turn left holding no blocks goes out that way.** Kimi takes an assistant message with empty
content. It refuses an assistant message holding an empty text block.

## Consequences

A conversation crosses between providers without the last provider's bookkeeping refusing it at the
next one. Nothing a caller wrote goes missing, because a carrier holds no reasoning and an empty
text block holds no text.

The scrub reads bodies rather than hub blocks, since nothing ever decoded a passthrough body. It
runs only for an Anthropic caller, so the Responses and Gemini shapes pass through untouched.

Two mutants survive on the module. Both sit on `isJsonObject` guards that narrow a type without
changing what any input produces. This record keeps them rather than answering them with a
contrived test.
