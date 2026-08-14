# 0114: The serving suite answers from a scripted upstream

**Status**: Accepted
**Date**: 2026-08-14

## Context

Rider #140 asked for an adopt-or-extend decision with a record either way, at whichever change next
reshaped the serving path. The router feature is that change, so the decision lands here.

A router offers one request to several children in turn, and a scenario about it has to say that
this child refused and that one served. The shipped key-probe and runtime stubs answer probes and
listings. Each answers one thing to every turn, which is enough while a virtual model binds one
target. The router scenarios need more. One child has to refuse with a 429 carrying `Retry-After`
while its sibling serves. A request has to come back malformed. A stream has to break partway, and a
connection has to drop before it writes any status.

## Decision

**Adopt `@copilotkit/aimock`, pinned exact at 1.38.0.** It enters as a development dependency of the
desktop app. What the adoption measured about it: `license: "MIT"`, zero runtime dependencies, and
31 releases in the four months since its first, all from a single vendor.

**One instance per Playwright worker, on an ephemeral loopback port.** A worker runs its scenarios
one at a time, so one server per worker is enough. The worker-scoped fixture in
`apps/desktop/e2e/fixtures.ts` clears the last scenario's memory before the next one arranges.

**Deterministic controls only, behind one wrapper.** `apps/desktop/e2e/scripted-provider.ts` is the
whole surface the step definitions see. A scenario matches a fixture by model, paces or cuts its
delivery, and reads the journal back. Its vocabulary is the real model name. Both children of a
router reach one origin under one dialect, so the model each attempt names is the only thing on the
wire that tells them apart. The same wrapper answers which models left the machine, which is the
reading the key probe already offered, so a step reads one shape whichever stand-in served it.

**A chaos rate is 0 or 1, and never a value between.** The approved decision first held every chaos
rate at zero, for determinism. Reading the package proved that `chaos: { disconnectRate: 1 }` is the
one expression of a connection dropping before any status. It still journals the request, so the
attempt stays visible to the scenario. The rate is a threshold on a random roll, and at
exactly 1 the roll decides nothing. The amendment therefore forbids the values between rather than
the control.

## What the stand-in can't express

The unit that owned the streaming scenarios answered the question before writing a line, reading the
package's own source at the pinned version rather than its documentation. Three findings, each of
which cost an approved scenario or corrected a fact an earlier cluster had recorded:

- **An error fixture is always a serialized error, never a stream.** The Anthropic handler branches
  on the error shape before it ever reads `stream`, and the error writer fixes the content type to
  JSON. Even at status 200 the answer is an error envelope. A 200 stream that opens with an error
  event has no expression at all.
- **A truncated stream dies as a bare socket.** It carries no provider error payload, so nothing can
  read one back, and the clause asserting that the caller receives the provider's stream error
  unchanged has no honest assertion behind it.
- **Truncation counts before it compares**, so `truncateAfterChunks` of 0 and 1 both abort after
  exactly one chunk, and one chunk doesn't cross the commit latch. Node corks a write and uncorks on
  the next tick, and the stand-in destroys the socket synchronously after writing, so nothing
  flushes. Measured from the child: 420 bytes written, none read, and the caller holding a whole
  answer from the sibling. Pacing at 25 milliseconds and cutting after two chunks is what lands past
  the latch, because the await before the second write is the tick boundary that flushes the first.

**The maintainer chose deletion over building around the gap.** The approved `streaming.feature`
loses its scenario about a stream opening with an error event, and the post-commit scenario loses
its verbatim-forward clause. What survives is what the suite can prove: the stream closes, no sibling
begins, and a status-less drop moves on. Nothing about the product changed. The unit specs cover the
pre-commit error-open path and the verbatim forward. The delta spec still requires the forward,
because a requirement describes the product rather than the test rig. What went away is the
end-to-end witness, not the guarantee.

Two more limits the units measured and worked around:

- `mount()` can't serve a path the stand-in already owns. Mounting the messages path and reading the
  body deadlocks, and a mounted request never reaches the journal, so the reading that proves what
  left the machine goes blind to it.
- The stand-in always writes `Retry-After` on a 429, defaulting to one second. A walk exhausted over
  429s therefore always answers 429, and no scenario can reach the 502 half of the exhausted refusal
  that way.

## Alternatives

- **Extending the hand stubs**: rejected. They would re-implement vendor Server-Sent Events (SSE)
  failure choreography, and every later serving scenario would grow that hand-rolled surface again.
- **Deferring the two clauses the stand-in can't carry**: rejected. A deferred scenario sits in the
  tree reading as coverage that doesn't exist.
- **Rewording them to whatever the stand-in can prove**: rejected. A scenario reworded to fit its rig
  stops describing the product, and the requirement it came from would follow it down.

## Consequences

**Good**: the serving scenarios script an upstream in the vocabulary the wire carries, and the
failure choreography arrives with the package instead of growing inside this repository. The wrapper
is one file, so the surface this project depends on is small, named, and readable in a minute.

**Bad, and accepted**: a four-month-old package from a single vendor now sits under the serving
suite. The exact pin freezes its behavior, and the deterministic subset keeps the used surface to
that one wrapper. The unit and integration layers pin the same refusal envelopes on their own, so a
forced retreat costs convenience rather than coverage. `ScriptedProvider` is the retreat seam: it
names what the scenarios need, and a hand-rolled server behind it would change no step definition.

Two end-to-end witnesses no longer exist, and a later reader looking for a scenario about a stream
that opens with an error will find none. This record is why, and the gap closes the day a stand-in
can express a streamed error envelope.

The journal the wrapper exposes spans a whole scenario, arrangement included. A Given that has to
send a real request to arm a cooling child leaves a row behind. It clears the journal rather than
the fixtures, because forgetting the fixtures would disarm the arrangement it just made.

The wrapper ships with no spec of its own, since the only end-to-end include in the desktop Vitest
config covers the fake tools. Its correctness rests on the scenarios that use it, which is the trade
a thin wrapper earns.
