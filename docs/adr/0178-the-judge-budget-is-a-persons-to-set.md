# 0178: The judge budget is a person's to set

**Status**: Accepted
**Date**: 2026-08-24

## Context

A conditional router asks a judge to read each request and name the branch it belongs to. Record
0158 settled what a judge reaching no verdict costs. The request refuses with a 503 rather than
falling to the else branch. An else branch catching every silence would hide a broken judge behind
a table that looks like it works.

The wait that produces such a silence has always been three seconds. Record 269 wrote the number
into `bornConditionalPolicy` in the renderer, stored it on every fresh router as `judgeBoundMs`, and
gave no surface for changing it. `budgetTheTableAsksOf` in the engine reads the field, takes the
tightest promise where two routers share one judge, and hands it to `AbortSignal.timeout`.

Three seconds fits a small model on a warm connection. It doesn't fit what people actually bind as
judges. A signed subscription channel, a cold model, a provider queueing behind a rate limit, and a
reasoning model asked for a one-word verdict all answer later than that. To a person, each of them
reads as the router refusing traffic it should have placed. Nothing on the canvas says why, and
nothing offers a way out.

The field is already per-router and already stored, so the shape needed nothing. What was missing
was a person's say over the number and a default that a real judge can answer inside.

## Decision

The budget stays per-router and gains a writer. Three changes carry it.

`BORN_JUDGE_BOUND_MS` moves from the renderer to `@recompose/contracts` and reads 30,000. Engine and
renderer both already depend on the package. The born value and the value the migration lifts a
stored router to are one fact rather than two copies of a number.

The gateway document steps to schema version 5. The migration rewrites `judgeBoundMs` to 30,000 on
every stored conditional policy that still holds exactly 3000, and leaves every other number alone.
Three seconds is the one value nobody chose, because no build before this one offered a way to
choose it. Any other number is a person's decision, and a migration that rewrote it would take that
decision back on the next load. A person who sets three seconds after the migration has run keeps
them.

The router inspector gains `JudgeTimeoutField`, between the re-judging rhythm and the judge itself.
It writes whole seconds, from 1 to 120, and stores milliseconds. `gatewayJudgingWithin` carries the
edit and refuses a value the stored shape would refuse, so a save never bounces off the schema with
a message written for a developer.

## Alternatives

- **Leaving the default at three seconds and shipping only the field**: rejected. It leaves every
  existing router refusing traffic until a person finds the field, and finding it means already
  knowing the cause.
- **Lifting every stored budget to thirty seconds, whatever it held**: rejected. It would be
  indistinguishable from the honest migration today, since nothing could have written another
  number yet, and wrong the moment somebody sets one.
- **Writing the field in milliseconds, as the table stores it**: rejected. Every other number on
  that panel is one a person can say out loud, and 30000 isn't.
- **One budget for the whole gateway rather than one per router**: rejected. A table can hold a fast
  judge on one router and a reasoning judge on another, and the engine already reads the field per
  router and takes the tightest of them wherever two routers share a judge.
- **Falling to the else branch when the judge runs out instead of refusing**: rejected, and not this
  record's to reopen. Record 0158 decided it.

## Consequences

**Good**: a person whose judge sits behind a slow channel raises the wait on the router that needs
it, without touching the others. A stored router that never chose gets a default a real judge
answers inside, so the common case stops refusing. The sentence under the field names the wait that
stands and says what running past it costs, so the setting explains its own consequence.

**Bad**: a judge that has genuinely stopped answering now holds a request for thirty seconds rather
than three before refusing it. That's the cost of the default, and the field is where a person
buys it back. The ceiling of two minutes is a judgement rather than a measurement: a request waiting
longer reads as a hang to whoever sent it, whatever the router intended.

The stored shape still accepts any positive integer, so a document written by hand can hold a budget
the field would refuse. The field reads it back rounded to seconds and writes whole seconds from
then on.
