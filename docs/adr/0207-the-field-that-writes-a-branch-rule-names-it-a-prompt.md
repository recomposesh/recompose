# 0207: The field that writes a branch rule names it a prompt

**Status**: Accepted
**Date**: 2026-08-26

## Context

A conditional router hands every request to a judge model. `compiledJudgePrompt` in
`@recompose/contracts` assembles what that judge reads: an instruction to pick one branch, the
branches as `label: rule` lines, a decline word standing last, and the caller's own words between
request markers. A branch's rule is therefore not a matcher the gateway evaluates. It's one line of
a prompt a model reads and classifies against.

The field that writes that line carried the heading `Rule`, standing beside `Label` and `Routes to`.
Nothing on that surface said a model reads the text. People wrote keywords into it, which is what a
field named `Rule` beside a field named `Label` invites. A keyword classifies worse than the
sentence the same person would have written, had they known who the reader was.

A second report said that once a person sets a rule, nothing offers a way to edit it. Read against
the code, that report is about naming rather than capability. Three routes already reached the
editing sheet on a standing branch. The router inspector's branch row draws the rule line as a
button, and the rule sentence itself names it. That row's context menu carries `Edit rule`. The
label pill riding the cable on the canvas opened the same sheet while carrying no name for the act
at all. The pill announced one word to a screen reader and looked like a caption to everyone else.

## Decision

The stored vocabulary stays. `BranchRule`, `branch.rule`, `branchesWriting` and
`gatewayWritingBranch` all keep the word rule. The surface that writes the text names its use.

The field now carries the heading `Rule as prompt`, and the control's accessible name repeats that
heading exactly. The sheet's own sentence says the judge reads this text as its prompt, beside every
other branch's, and answers with one branch label.

The empty field stands an example written the way the compiled prompt reads it. The example gives a
description of the requests that belong on the branch, then a line saying what doesn't. A classifier
reads a boundary the way it reads a category, and nothing else on the surface could teach that a
rule may hold more than a noun phrase.

The cable pill carries the act as its description rather than as its name. The label stays the
accessible name, because the word the judge answers with is the fact a reader needs first, and a
name beginning `Edit` would bury it.

## Alternatives

- **Renaming the stored field from `rule` to `prompt` through contracts and the engine**: rejected.
  It's a schema migration plus a rewrite of `judge-prompt.ts`, `policies.ts` and every routing
  edit, bought for one word. A document's name for a thing and a surface's name for its use can
  differ without either one lying, and the surface is where the confusion happened.
- **Leaving the heading at `Rule` and explaining it only in the sentence under the sheet**:
  rejected. The heading is the part a person reads before they start typing, so the heading has to
  settle the register.
- **Making the whole compiled prompt editable per branch**: rejected, and not this record's to
  reopen. The label set, the branch order and the request markers are the injection posture, which
  is why `JudgeDirective` prints the assembled prompt read-only and offers only the directive.
- **Naming the pill `Edit prompt for code` rather than describing it**: rejected. It replaces the
  judge's own vocabulary with a verb in the one place a person reads that vocabulary at a glance.

## Consequences

**Good**: a person meets the word prompt before they type, and an example in the register the judge
actually reads. The canvas route to an existing rule announces what pressing it does, so a branch
already worded stops reading as finished and fixed.

**Bad**: the surface and the stored document now use two words for one thing. A reader of the schema
meets `rule`. A reader of the panel meets `Rule as prompt`. This record is the reconciliation, and
anyone tempted to rename one to match the other should read the first alternative above first.

The row context menu still reads `Edit rule`, in `child-row`, outside the files this change owns.
Renaming that item to `Edit prompt` is the one act the report asked for by name, and the change that
owns that file takes it.
