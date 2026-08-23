# 0166: A Gemini answer crosses as runs, not as chunks

**Status**: Accepted
**Date**: 2026-08-23

## Context

Gemini streams an answer as many small parts, one per wire chunk. The decoder opened a hub block for
every part it read, filled that block with the part's deltas, closed it again, and counted the block
index up. A four-sentence answer arrived as six blocks holding one delta each.

The hub means something narrower. A block is one run of content, and every dialect downstream draws
it as one. Claude Code puts each content block of an assistant message on its own line. An answer
split at wire boundaries came out as a bullet list, each bullet broken mid-word where the previous
chunk ended. The stream lost nothing, and the reader could read none of it.

The upstream this engine pins to holds the shape the hub wants. `ConvertGeminiResponseToClaude` in
`internal/translator/gemini/claude/gemini_claude_response.go` keeps a `ResponseType` across chunks,
`0=none, 1=content, 2=thinking, 3=function`. It closes a block only when that type changes, and
consecutive text parts append to the block already open. The `antigravity/claude` translator carries
the same state machine.

## Decision

**The decoder keeps the open run and appends to it while the kind holds.** A part matching the open
run contributes deltas at that index. A part of another kind closes the run, counts the index up,
and opens the next one. The terminal closes whatever run is still open.

**Two parts break a run even when their kind matches.** A part carrying a thought signature opens
its own block. This engine keeps Gemini's signatures where the upstream drops them, and one run
holding two signatures could carry only one of them back. A function call naming a tool also opens
its own block, while a call naming no tool continues the open one. That second rule is the
upstream's own `ResponseType == 3 && upstreamToolName == ""` reading.

**Nothing keeps the block-per-part shape.** No caller wanted it. The tests pinning it described the
defect rather than a requirement, so they change with it.

## Consequences

An answer arrives as one text block with its deltas, and reads as prose. A signed part still stands
alone, so the carriers that ride Gemini signatures across the Anthropic dialect land where they did.

A tool call split across chunks now folds into one block. Before this, each fragment opened a block
of its own, so this record closes a second upstream behavior the engine didn't carry.

The run state lives in `gemini-stream-runs.ts` rather than in the decoder, which already sat at the
line ceiling for one file. That module holds no input or output, and its tests kill every mutant.
