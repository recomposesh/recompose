# 0191: A name derives an id that picker keeps

**Status**: Accepted
**Date**: 2026-08-25

## Context

Record 0160 settled how a virtual model reaches Claude Code's `/model` picker. The picker keeps an
entry off `GET /v1/models` only when the id carries `claude` or `anthropic`. It folds case and
matches anywhere in the string. That record put the reshaping in front of a person as an offer. The
**Model id** field derived the bare alias from the name, and a skipped id then carried a hint and a
press that would prefix it.

Its own consequences named the cost it took on: "A person who ignores both offers still holds a
model that one picker won't list." That's what happened. Four surfaces carry the rule today: the
inspector, the connect sheet's note, the Claude Code page, and the troubleshooting page. People
still define `fast` and then ask why their picker stands empty. A fifth telling won't answer it.
The hint also sat at the smallest type on the panel, on the end of an unrelated sentence, joined by
a middot.

Setup already disagreed with the inspector here. The wizard names its first model `claude-my-model`
whenever Claude Code sits among the harnesses a person picked. One product, one path that shapes by
default and one that offers.

The two costs don't match in size. An id carrying a word a person didn't ask for is cosmetic, and
one keystroke removes it. An id missing that word never reaches the picker of the client this
gateway mainly serves, and nothing on the canvas says why.

The connect sheet also handed its two paths different variables. The shell block carried
`CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY`, plus `ANTHROPIC_CUSTOM_MODEL_OPTION` for a skipped
id. The `~/.claude/settings.json` block carried neither, and that's the path background agents
read.

## Decision

**A name derives an id that picker keeps.** `modelIdFromName` in `@recompose/contracts` composes
`modelAliasFromName` with `claudeShapedModelId`, and the canvas draft derives through it. "Fast
Sonnet" becomes `claude-fast-sonnet` before anyone edits anything. `modelAliasFromName` stays the
bare normalizer, for every caller that must add no word to a string a person or a provider already
settled.

**Stripping the prefix counts as a hand edit.** The id follows the name while it still reads as the
id that name derives. An id saying anything else belongs to the person, and that now covers the
bare alias. Someone who wants `fast` types it once and keeps it through every later keystroke in
the name field.

**The offer stands where a person typed past the derivation.** The hint and its press stay. They
take a line of their own under the field's help rather than riding the end of it. Reaching them at
all now means someone edited the id by hand, so what they say has to read clearly.

**A stored id that picker skips says so at rest.** A saved definition whose id carries neither word
reads a notice under its facts in the inspector, naming the id the picker would list. Editing the
id offers the same one-press reshaping the draft offers. Nothing reshapes a stored id on its own.
The id rides the wire, and every client already sending it would then name an id nothing serves.

**The two connect paths carry the same variables.** The settings file block takes the discovery
switch, plus the escape where the id needs one, exactly as the shell block does.

## Alternatives

- **Louder copy in the same places**: rejected. Four surfaces already carry the rule. The failure
  is a default that asks a person to know something, not a sentence too far under the eye.
- **Refusing an id the picker would skip**: rejected again, for record 0160's reason. The id serves
  every other client and every request naming it directly. A refusal would invent a rule the
  gateway doesn't have.
- **Deriving the prefix only for people who use Claude Code**: rejected. The wizard reads the
  harnesses a person picked because it just asked. Nothing keeps that answer, and the canvas
  outlives the wizard. The canvas would have to guess, or the product would have to store an answer
  to a question it asks once. A cosmetic prefix one keystroke removes is the cheaper miss.
- **Reshaping a stored id on one press**: rejected. A rename rewrites the id clients send, and the
  panel already says a saved change waits on the harness restarting. Reshaping without an explicit
  save would break a pointed client on a press meant to help.
- **A badge on the virtual model card**: rejected. `NodeCard` gives its badge the kicker's row and
  drops the kicker to assistive tech. The card would trade the words "Virtual model" for a note
  about an id. The inspector says the same thing without spending the card's identity.

## Consequences

**Good**: the common path stops depending on a person having read anything. Setup and the canvas
now derive the same way. Definitions stored under the old default explain themselves rather than
staying silent, and the fix stands one press from the notice. Both connect paths describe one
gateway.

**Bad, and accepted**: a person serving only Codex or Cursor meets a `claude-` prefix that buys
them nothing, and removes it by hand. The derived id can now collide with a real Anthropic id when
the name beneath it already reads like one. Record 0160 took that on for the press, and the default
inherits it. A person who strips the prefix freezes the id against further name typing, which is
the rule every other hand edit already follows.
