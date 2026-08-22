# 0160: A model id reaches Claude Code's picker by name

**Status**: Accepted
**Date**: 2026-08-22

## Context

A virtual model's id derives from the name a person typed. `Fast Sonnet` reaches clients as
`fast-sonnet`. Claude Code's gateway discovery reads `GET /v1/models`. It keeps an entry only when
the id carries `claude` or `anthropic`, matching a substring anywhere and folding case. An id
outside those words serves every request that names it. In that one picker it appears for nobody.

The inspector already carried a hint about this, and the hint read the old rule. Claude Code
matched the opening of an id before v2.1.223, and matches a substring anywhere since. So the hint
called an id skipped where the picker surfaces it. The same stale reading sat in the connect
sheet's note, the Claude Code page, and the troubleshooting page.

One fix suggests itself: answer `/v1/models` with two entries per virtual model, the id a person
stored and a `claude-` prefixed twin for the picker. This record rejects it, for three reasons.

One gateway serves one model list to every client. Codex, opencode and Cursor would each grow two
rows per model to satisfy one client's filter.

The gateway matches an incoming `model` by exact id in seven places. A twin on the wire is a second
id every one of them has to resolve. Telemetry and the canvas both key their rows on the stored id.

Claude Code also drops a discovered id matching a picker row it already holds. It folds an id
resolving to a built-in model into that model's row. A synthesized `claude-sonnet-5` would vanish
into the built-in `sonnet` entry rather than reach the router a person built.

## Decision

**One id on the wire, always the stored one.** `GET /v1/models` keeps answering with exactly the
ids the gateway stores. Nothing synthesizes a second name for a virtual model.

**The rule lives in one place.** `claudeCodeKeepsModelId` in `@recompose/contracts` reads the
substring rule the gateway protocol documents. `claudeShapedModelId` answers with the id a skipped
one becomes. The inspector's hint, the offer beside it, and the connect sheet all read those two.
None of them carries its own copy of the filter.

**The inspector offers the reshaped id.** Under the **Model id** field, an id the picker skips
carries the hint and a press. The press puts `claude-<id>` in the field. The id stays the person's
to accept, so nothing rewrites it on their behalf. Taking the press marks the id as hand-edited,
which already stops the name from driving it afterward.

**The connect sheet hands over the escape.** A gateway whose first model carries an id discovery
skips gains `ANTHROPIC_CUSTOM_MODEL_OPTION` in its Claude Code block. That variable names a model
outright. It skips both the filter and the validation behind it. The line stands only where it
earns its place.

## Alternatives

- **Publishing a `claude-` twin in the model list**: rejected, for the three costs above. It
  charges every other client for one client's filter. It doubles the ids seven exact matches have
  to resolve. It can land a synthesized id inside a built-in picker row.
- **Refusing an id the picker would skip**: rejected. The id serves every other client, and every
  request naming it directly. A refusal would invent a rule the gateway doesn't have.
- **Serving the twin to Claude Code alone**: rejected. The discovery request carries no header
  naming the client. The only signals are a query string and the product line the client sends. A
  gateway guessing at its caller answers a different list to two callers on one port.

## Consequences

**Good**: one id on the wire keeps every client's list honest, and leaves the seven exact matches
alone. The stale prefix reading leaves the product in one pass. The inspector, the sheet and the
docs now say what Claude Code does. A person who wants the picker gets it in one press. A person
who wants the name they chose keeps it, and gets the variable that carries it.

**Bad, and accepted**: the reshaping stays a person's decision rather than the gateway's. A person
who ignores both offers still holds a model that one picker won't list. The shaped id takes a plain
`claude-` prefix, which could collide with a real Anthropic id when the id beneath it already reads
like one. Nothing here reads Claude Code's built-in list to rule that out. That list belongs to the
client, and a copy of it here would go stale.
