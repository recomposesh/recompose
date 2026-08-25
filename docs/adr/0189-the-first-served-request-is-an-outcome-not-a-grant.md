# 0189: The first served request is an outcome, not a grant

**Status**: Accepted
**Date**: 2026-08-25

## Context

A profile records the first request it ever served. The get-started checklist reads that record for
its fourth step, and the setup wizard now rests its whole ending on it.

The record read the wrong signal. It fired when a spend grant resolved, which is the moment
recompose decided a request may go to a target. Its own docstring said as much: only a resolved
grant means a request reached a target.

Reaching a target says nothing about an answer. Anthropic documents three separate ways a
syntactically perfect key fails on first use. GitHub's tracker carries years of reports where the
Copilot device flow completes and the inference endpoint then answers 403. A stream can open and
rate-limit halfway through.

So a person whose first request the provider turned away had a profile claiming they served one.
The checklist ticked. Under the wizard, that same signal would have closed setup on a failure and
dropped the person onto a canvas that had never worked.

## Decision

**The record follows the outcome the gateway wrote down.** A request the gateway recorded as
served closes the latch. Nothing else does.

**A live outcome closes nothing.** A request still answering has served nobody yet. The same
request arriving later as served is what closes the latch, which is the honest reading of a stream
that opened and then finished.

**A failed outcome closes nothing, and never reopens what already closed.** The latch is one-way
per process, as it was before.

**The latch rides the traffic desk.** Every recorded outcome already passes there on its way to the
windows, so the desk hands each one to an observer. The push it already made carries a whole
snapshot and could never say which row in it just changed.

## Consequences

The checklist's fourth step now means what it says. A person whose first attempt failed sees the
step still standing, which is the truth and also the useful reading.

The wizard can rest its ending on a signal that only fires when something actually worked.

Nothing observes engine traffic twice. The desk is the one place outcomes pass, and the record is
one more reader of it rather than a second listener on the same channel.

A profile that recorded a served request under the old signal keeps the record. The write happens
once and never clears, and rewriting history for a flag nobody can see would buy nothing.
