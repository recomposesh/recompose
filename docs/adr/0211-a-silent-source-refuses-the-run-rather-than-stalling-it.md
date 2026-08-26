# 0211: A silent source refuses the run rather than stalling it

**Status**: Accepted
**Date**: 2026-08-26

## Context

The setup wizard's build step opens the first gateway and composes the first virtual model over the
accounts a person marked. It can't write either one until it knows which model each account serves,
so it asks every marked account for its model list first.

`providerModelsQueryOptions` answers that question two ways. A readable account answers `listed`
with its model ids. An account that reached nothing answers `unlisted`. The lane behind it folds an
unreachable provider, a credential a vendor turned away, and a body that wasn't a catalog into one
silence. Main refusing the request outright throws instead, which leaves the query holding an error
and no data.

`useServedModels` kept only the `listed` case and answered every other one with an empty list. That
made a look still in flight and a look that answered nothing the same value. `BuildingStanding` then
held the run back until every target carried a model id, so an account that had already refused read
exactly like one about to answer.

The run never opened. `BuildingStep` offers its acts only once an outcome arrives, on the reasoning
that a working run has nothing for a person to decide. The surface therefore stood on a turning ring
with no control under it and a line promising a few seconds. The only way forward was the control
that leaves setup, which abandons the wizard rather than recovering it. A run over no recorded
source at all stalled the same way, for the same reason.

## Decision

Each marked source carries a standing of its own: `looking`, `listed`, or `unlisted`. A query
holding an error counts as `unlisted`, because an account main refused to read is as unreadable as
one that answered nothing. Neither silence is a person's to tell apart.

`sourceReadingOf` folds those standings into one reading for the run. A silence outranks a source
still answering, because an answer that has arrived settles the run sooner than one that may never.
No marked source at all refuses before the run asks anything, since there's nothing to ask and
nothing to route to.

Asking the accounts is a job row of its own. It reads "Reading what your sources serve" and stands
between the accounts already recorded and the gateway. A refusal marks that row, carries its reason
in place of the row's quiet line, and lights the two acts the step already had. Back returns to the
compose step and Try again puts the question to every account again before building again. The
reason names the accounts that went quiet, so a person holding three of them knows which to open.

## Alternatives

- **Hanging the refusal on the gateway row**: rejected. The gateway never refused anything. A row
  claiming an outcome it never had sends a person to look at the wrong thing, and the run's own
  reading already says a refusal marks only the job it happened on.
- **Refusing the compose step's Create control while a listing is silent**: rejected. A control that
  won't press and won't say why is another dead end, and that step holds no way to ask again.
- **Waiting on the silence behind a timeout**: rejected. A timeout invents a number, and after it
  expires a person still learns nothing about which account went quiet.
- **Binding an empty model id and letting the engine refuse the first request**: rejected. That
  stores a graph nobody asked for and moves the refusal somewhere a person can't act on it.
- **A message under the run rather than a row inside it**: rejected. The wait is work the run does,
  and the row is what says how far the run got before the work stopped.

## Consequences

**Good**: the one piece of this run that leaves the machine now shows up as work. A person watching
it sees what the wizard is waiting on rather than a ring that says nothing. A silence turns that row
red, with a reason and two ways forward. The wizard no longer holds a window a person can only
abandon.

**Bad**: the run reads one row longer than it did, which is a row that finishes in a moment on a
healthy machine. `useBuildRun` now counts from the index of the first job it owns rather than from
the number of recorded accounts. A caller passing the old number would report the run one row behind
where it stands.

The compose step still draws a source's own name where its listing hasn't landed, and it draws the
same thing where the listing refused. Pressing Create there carries a person to the build step,
which is where the refusal is now said out loud and where the acts to answer it stand.
