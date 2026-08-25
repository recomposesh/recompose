# 0194: The pipeline runs its work in parallel

**Status**: Accepted
**Date**: 2026-08-25

## Context

A push to `main` took about 25 minutes to report. Two things spent it.

The `check` job runs `turbo run lint typecheck build test` with `--concurrency=1`. Turbo then walks
the whole graph one task at a time across four packages, on a runner with four cores. Three of them
sit idle for the length of the run.

The `e2e` job fans out over macOS, Windows and Linux on every pull request. Windows alone takes
about 12 minutes, which sets the floor for the whole matrix.

Waiting 25 minutes on a green light changes how people work. A maintainer who has to ship stops
reading the run and merges on the bypass, which is how a required check turns into a formality.

Record 0192 read that habit backwards. It said a code-only pull request never spell-checked what it
added. The `check` job has carried `lint:spell` since record 0053. Pull request 326 did meet the gate:
`check`, `ci-success`, `prose` and all three end-to-end legs failed on it, and the merge went over
them. The words landed because a red run merged, not because no gate read them. What record 0192
built is still worth having, for a reason it didn't name. A spelling mistake now reports in under a
minute rather than 30 minutes into `check`.

## Decision

**`check` runs at the machine's width.** `--concurrency=1` becomes `--concurrency=100%`, which is
turbo's own spelling for one worker per core. The same tasks run, in the same dependency order,
against the same gates. It skips nothing, and no threshold moves.

**`lint:spell` leaves `check`.** The `spell` job record 0192 added runs it on every event already,
so the step inside `check` spent 30 seconds proving the same thing a second time.

**A pull request runs end-to-end tests on Linux, and `main` runs all three.** The matrix reads the
event: `pull_request` fans out to `ubuntu-latest` alone, and every other trigger keeps macOS,
Windows and Linux. A push to `main` and a release tag both take the full three.

## Alternatives

- **Splitting `check` into one job per package**: rejected for now. It buys the same parallelism at
  the cost of four installs and four Playwright downloads, and turbo already knows the graph.
- **Dropping a platform from `e2e` outright**: rejected. Windows chrome shipped this release, and a
  platform nothing runs is a platform nothing catches.
- **Running the full matrix on a pull request and accepting the wait**: rejected by the maintainer,
  who authorized the narrowing. A branch keeps Linux, and the merge itself keeps all three, so a
  platform break still stands between `main` and a tag.

## Consequences

**Good**: the pipeline reports in a fraction of the time, and a green light stays worth reading.
The idle cores go to work for free.

**Bad, and accepted**: a macOS or Windows break now surfaces on the merge to `main` rather than on
the branch that wrote it. The repair rides a follow-up pull request. Parallel tasks also interleave
their output, so a failing task takes longer to find in the log.
