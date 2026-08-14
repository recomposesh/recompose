# 0115: A docstring earns its place by content, not by visibility

**Status**: Accepted
**Date**: 2026-08-15

## Context

recompose bans code comments and allows one exception: a constraint or invariant the code genuinely
can't express. Beside that exception sat a carve-out for the `@summary` docstring, permitted on
exported declarations because it's "API documentation the tooling reads." The router change put a
real question to that clause, and the strict reading answered that a `@summary` on a module-private
function is a banned comment.

Three facts settle it, and a command answered each one.

One tool here reads a docstring: `react-docgen`, set by `typescript.reactDocgen` in
`apps/desktop/.storybook/main.ts`, over the renderer `.tsx` files Storybook's story glob pulls in.
No linter reads one, since the oxlint configuration turns on no `jsdoc` rule. The repository carries
no typedoc, no api-extractor, and no other documentation build. The renderer never imports
`@recompose/engine`, so nothing reads a docstring under `packages/engine/src` or
`apps/desktop/src/main`, export keyword or no export keyword. The clause was false for most exported
declarations too, so it couldn't be the test.

The codebase had already settled the question in practice. Before the router change, 106 top-level
module-private declarations carried a `@summary`. Of those, 59 sit outside the renderer and outside
test files, and the oldest dates to 2026-07-24, three weeks earlier. Each follows one shape: a line
of what the thing is, then a summary carrying why. `matches` in
`packages/engine/src/api-key-guard.ts` explains why a length comparison precedes `timingSafeEqual`,
and what an earlier digest-first draft gave up. The code can't say either for itself.

The comment ban's own exception, in both `CLAUDE.md` and `.claude/rules/clean-code.md`, covers a
constraint the code can't express. It says nothing about who can see the declaration.

## Decision

**Content decides whether a `@summary` belongs, and visibility decides nothing.** Write one on any
declaration when it records a constraint, an invariant, a rejected alternative, or a cross-cutting
reason the code can't state. Never write one that narrates what the code does, restates the name, or
describes the diff. Both tests read the same on an exported declaration and on a module-private one.

The ban on inline explanations stands unchanged. So does the rule that a block needing explanation
wants extracting or renaming instead. A summary carries the reason that survives good naming, never
a substitute for it.

**A summary moves with the code it describes.** Extracting a function carries the reason to whatever
declaration still holds the constraint, or drops the reason where the constraint no longer holds.

## Alternatives

- **Keep the visibility test**: rejected because its stated justification is false. No tool reads
  the docstrings the clause protects. The rule would also delete 59 standing records of why
  node-side code takes the shape it takes, the timing-comparison reason in `api-key-guard.ts` among
  them.
- **Ban every docstring on a module-private declaration**: the one mechanical rule available here,
  and a linter could gate it. Rejected for what it buys that enforceability with. It deletes real
  invariant documentation to win a rule a machine can check, and the invariants stay true either
  way.
- **Move every private summary onto the nearest exported declaration**: rejected because it detaches
  the reason from the code it constrains. It also worsens the rot named below, since a summary
  sitting on the wrong declaration is the failure mode at issue.

## Consequences

**Good**: the rule now matches what the tooling does rather than a belief about it. A reason stays
beside the code it binds, at whatever visibility that code has. A reader meeting a surprising line
finds the why in the same file. One test covers both visibilities, so nobody weighs whether a
declaration counts as exported enough to deserve its reason.

**Bad**: a judgement test resists gating. No linter can tell a recorded constraint from a narration,
so review carries this rule, and review runs uneven.

Permitted prose rots, and the boot path already shows how. In
`apps/desktop/src/main/boot/stored-boot.ts`, the summary on `openUsageLedger` describes legacy-home
adoption, serving-memory wiring, close ordering at quit, and every Inter-Process Communication (IPC)
channel answering before the first gateway stands up. That function opens two stores. The work the
summary describes lives in `bootFromStoredState`, and an extraction left the summary behind. Nothing
failed when the reason stopped holding. The mechanical alternative that would catch this is the one
rejected above, so the rot is what this decision costs. The moves-with-the-code rule is the only
thing standing against it.
