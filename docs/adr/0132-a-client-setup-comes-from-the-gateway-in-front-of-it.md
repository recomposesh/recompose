# 0132: A client setup comes from the gateway in front of it

**Status**: Accepted
**Date**: 2026-08-16

## Context

The toolbar control beside start and stop carried a book glyph and the title "Waits on the guide."
Nothing stood behind it. That guide answers the last get-started step, "Send the first request," and
that step had no answer anywhere in the app.

The facts a person needs already live here. A gateway answers a bare origin on its own loopback
port. It serves the Anthropic Messages, Chat Completions, Responses and Gemini dialects at once. It
reads a key from four header spellings, and it lists its virtual models at `/v1/models`. What a
person lacks is the shape their own tool wants.

Research across the tools people point at a gateway settled two facts. Those facts decide this
record.

The version segment belongs to the client rather than to the gateway. Claude Code and Gemini CLI
want the bare origin. Codex, opencode and the compatible editor extensions want the origin plus
`/v1`.

The key field also differs per tool, down to tools that hold no key field at all. Claude Code reads
`ANTHROPIC_AUTH_TOKEN` as a bearer token. Codex reads whichever variable `env_key` names. The Claude
Desktop form takes an address and no credential whatsoever.

## Decision

**The sheet writes each client setup from the stored gateway rather than from a template.** The
address, the enforced key and the first virtual model id come from the gateway document a person is
reading. A moved port, a replaced key or a renamed model reaches every block with nothing to update
by hand.

**Every client states how it joins paths, and the sheet spells the address that way.** A `reach` of
`origin`, `v1` or `whole` sits on the client rather than on its dialect, because the two don't
track. opencode and Cline both speak Chat Completions. A Kimi Code provider block speaks Anthropic
Messages at the bare origin. The pane prints that spelling in a row of its own, so the address a
person copies is the address that client wants.

**A gateway that enforces no key still hands over a value.** Clients refuse to start on an empty key
field, so the blocks carry `unused` and the pane says the gateway checks nothing. An empty field
would read as a working setup and fail at the first request.

**A client with nowhere to put a key says so instead.** Claude Desktop takes an address alone. Its
steps name the consequence: a gateway enforcing a key stays out of reach until that requirement
comes off, or until the person turns to the command line.

**A client leads with its own mark, or with the house terminal glyph.** The marks come from the icon
package the provider catalog already draws from, so recompose invents no logos. A tool that
publishes none leads with a glyph rather than with a drawing that pretends to be a logo.

**The catalog lives in the gateway page's model segment**, beside the provider catalog precedent in
the providers page. The sheet stands on the page rather than in the toolbar widget. The control
lives in the window chrome above the page, and the sheet covers the page. So the toolbar turns a
shared visibility store over, and the page renders whatever that store answers.

**The sheet grows a third width.** `broad` stands at 940 pixels and drops the body inset. A rail
that meets the sheet edge can't do it from inside a padded box. The existing `wide` boolean becomes
that same `width` union, so one prop names the surface rather than two booleans.

**The standing line reads the request log.** Someone who pastes a block can't tell whether it worked
without leaving for their own terminal. The gateway already knows, so the pane says it. The count
belongs to the gateway rather than to the client named beside it, because a request carries no
client name recompose can trust.

## Alternatives

- **A link to a documentation site.** Rejected. That page couldn't know this gateway's port, key or
  model ids, which is the part a person has to get right.
- **One OpenAI-compatible instruction for every client.** Rejected. It fails outright for Claude
  Code, Codex and Gemini CLI. For the rest it pastes `/v1/v1`, and the refusal names a path rather
  than the mistake.
- **Deriving the version segment from the dialect.** Rejected on the evidence above. Two clients
  speaking one dialect disagree about the segment.
- **Copying every block at once.** Rejected. The blocks of one client land in different places, a
  shell and a configuration file among them. One clipboard write would be wrong wherever it went.
- **Drawing the missing marks by hand.** Rejected. An approximation of somebody else's logo reads
  worse than an honest glyph.
- **A second mark component for tools.** Rejected. One inventory keeps one drawing per name, and the
  uniqueness reading already in place covers the tools the moment they join it.
- **Holding the sheet in the toolbar widget.** Rejected. A widget can't reach a page, and the sheet
  needs the page's queries.

## Consequences

**Good**: the last get-started step has an answer, and a person copies it rather than transcribing
it. Fifteen tools arrive with instructions written from the gateway in front of them, each with its
own mark. Adding a sixteenth takes one catalog entry and no new surface. The reading that walks
every client holds each one to the same rules. The address takes the client's spelling, the key
reaches every field that exists, and the model id gets named.

**Bad, and accepted**: the catalog restates what those tools document. A tool that changes its
configuration shape leaves recompose stating a shape that no longer holds. Each entry names that
tool's own guide for exactly that reason, and the reading pins the rules rather than the prose. The
standing line counts what the log holds rather than what the gateway ever answered. A rotated log
holds fewer rows than the gateway answered, so the line says the log holds that number rather than
claiming a total.
