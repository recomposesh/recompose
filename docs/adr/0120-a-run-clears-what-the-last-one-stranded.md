# 0120: A run clears what the last one stranded

**Status**: Accepted
**Date**: 2026-08-15

## Context

Issue 219 records stray Electron processes outliving a Stryker mutation run and poisoning the next
suite. The measurement: 19 failed and 17 flaky across four unrelated feature files, then 260 passed
after `pkill -f Electron`. The poisoned run took about twice the wall time.

The attribution is wrong. Reading it straight would have sent the repair to the wrong file.

`apps/desktop/vitest.mutation.config.ts` runs `environment: 'node'` over `src/**/*.test.{ts,tsx}`
and `scripts/**/*.test.mts`. It excludes `**/*.browser.test.*`, and never includes `e2e/**`.
Stryker's config names no `buildCommand` and runs no install inside its sandbox, so no
`@electron/rebuild` postinstall fires there either. Nothing a mutation run executes can reach an
Electron launch.

The counts name the real suite. Flaky is a Playwright bucket rather than a vitest one. Feature
files are the acceptance suite's unit of work, and that tree holds 261 scenarios. The poisoned run
was the Playwright suite. The mutation run ran alongside it, and caused nothing.

Two things produce the strays.

The first is repairable here. `launchFrom` in `e2e/steps/app.steps.ts` launched an application,
then awaited `firstWindow`, `windowVisibility`, and `waitForLoadState` before returning it. Only
the returned value reaches the `After` hook that closes it. An application that failed while its
window opened reached nothing, and nothing closed it. It outlived the whole run, holding the
worker's user data folder. The sibling launch in `fixtures.ts` already had its `try`/`finally`.

The second isn't. Playwright launches Electron detached on every platform except Windows, so the
application heads its own process group. Playwright's own handlers close it on exit, `SIGINT`,
`SIGTERM`, and `SIGHUP`. `SIGKILL` and a hard worker crash aren't on that list. No handler inside a
killed process can run, so nothing the dead run owns can clean up after it.

## Decision

Two changes answer the two causes.

`launchFrom` wraps its post-launch awaits and closes the application before rethrowing. That ends
the leak this repository owns.

A sweep runs on the way in rather than on the way out. The run that strands an application is the
run somebody killed, and a killed run executes no teardown. A Playwright `globalSetup` ends what a
previous run left, and names each process it ends.

The sweep's reach is the whole risk. `pkill -f Electron` on a developer machine is a hostile
command. On the machine that measured this, it would have ended two applications the maintainer was
running. So the sweep claims a listing line only when that line carries both of these:

- the Playwright electron loader argument. Playwright passes it to open its control channel, and
  nothing else passes it. `pnpm dev` runs the same binary out of the same checkout without it.
- this application's root path, which ends in `apps/desktop`. The checkout root alone would let a
  worktree at `recompose` claim one at `recompose-2` by prefix.

Selection is a pure function over `ps` output. Seven specs pin it. They cover the developer's own
`pnpm dev` application, an installed application under `/Applications`, another checkout, and a
checkout whose path merely starts with this one.

Dry run against the live process table on the measuring machine: 763 processes listed, two
mentioning Electron, zero claimed. The same run claimed a synthesized Playwright launch carrying
this worktree's real paths, and declined the same worktree's `pnpm dev` line.

## Alternatives

- **`pkill -f Electron` in a cleanup step**: rejected. It ends every Electron on the machine,
  including the maintainer's own applications and any sibling worktree's suite.
- **Scoping by executable path alone**: rejected. `pnpm dev` runs that exact binary from that exact
  checkout. The sweep would end the application a developer is looking at.
- **A `globalTeardown` instead**: rejected. Teardown runs on the endings Playwright already
  handles, and never runs on the `SIGKILL` this covers. It would add nothing.
- **Repairing `launchFrom` and stopping there**: rejected as incomplete. It closes the leak this
  repository owns, and leaves the killed-run case. That case is the one the issue measured.
- **Recording the launched process ids to a file for a later run to read**: rejected. The run that
  strands an application is the run that died, so the file would stay as unwritten as the teardown.

## Consequences

**Good**: this record corrects the issue's own attribution, so the next reader doesn't go looking
inside the mutation config. The failure that produced the measurement now has a repair at its
source. A sweep clears the case no in-process handler can reach, before it poisons anything.

**Bad**: the sweep reads `ps` output, a text interface with no stability promise. A change to how
Playwright loads its control channel retires the marker. The sweep would go back to claiming
nothing, and no test would go red, because every spec feeds it recorded text rather than a live
process.

A green acceptance suite would prove only that the sweep harms nothing, because a suite that
finishes tidily strands nothing to find. So one spec strands an application on purpose.

It spawns a detached process carrying the loader argument and an application root. It kills the
runner that started it with `SIGKILL`, then reads `ps` to confirm the survivor now answers to
process 1. Only then does it run the sweep and confirm the survivor went.

The spec strands a stand-in rather than a real Electron, because the sweep reads a command line and
knows nothing about Electron. Its root is a temporary folder, so a suite running from this checkout
at the same time can never match it.

Measured: with `process.kill` removed from `endApp`, the spec polls its whole 5 second window and
fails on the survivor still standing. With the kill restored it passes in 222 milliseconds, and
leaves no process of its own behind.
