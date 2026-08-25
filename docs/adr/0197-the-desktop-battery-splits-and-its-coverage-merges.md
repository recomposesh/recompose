# 0197: The desktop battery splits, and its coverage merges

**Status**: Accepted
**Date**: 2026-08-26

## Context

Record 0194 raised turbo's concurrency and record 0195 narrowed the graph to what a diff touched.
Both helped, and the `check` job still took about twelve minutes on any pull request that touched
the desktop package. One task accounted for the whole of it.

`@recompose/desktop:test` is a single Vitest run over four projects: 3479 node tests, 1048 in
Chromium, and 2322 more across the two story projects in both schemes. Turbo runs tasks from
different packages side by side, and it has no way to divide one package's task. The widest machine
still walked that battery end to end.

Record 0195 called splitting it blocked, and named the reason. The thresholds hold over the whole
battery (record 0176), so one project measured alone reports single-digit coverage and fails at 90.
That reading was incomplete. Vitest 4 carries `--shard`, a `blob` reporter and `--mergeReports`,
and a merged report carries the coverage of every leg that fed it. Measured on
`@recompose/contracts`, two shards each refused their own thresholds. The merge of the two read
99.82% statements and passed. The desktop battery answers the same way: four shards merge to 97.6%
statements, and the thresholds hold.

## Decision

**The desktop battery runs as four shards and one merge.** Each leg writes a blob report,
`test-desktop-merge` rebuilds one report from the four and measures coverage on it.

**Thresholds apply to the merged reading alone.** `RECOMPOSE_TEST_SHARD` marks a run as one leg,
and `vitest.shared.ts` leaves the thresholds off where it stands. The numbers themselves never
move. What changes is which run applies them, and the run that applies them is the only one holding
the whole picture.

**`check` keeps every other package's tests.** It runs `turbo run test --filter=!@recompose/desktop`
beside its lint, typecheck, and build. Contracts, engine, and the web app together finish in under
a minute, and a job of their own would spend more on installing than on running.

**Coverage travels as two artifacts.** `check` uploads what the packages measured and the merge
uploads what the desktop measured, and `coverage-upload` pulls both into the paths Codecov names.

## Alternatives

- **Leaving the battery whole**: rejected. It set the floor for every desktop pull request, and no
  other lever reaches inside one turbo task.
- **A job per Vitest project**: rejected. The four projects are uneven, so the longest would still
  set the floor. A shard splits by file across all four instead.
- **Lowering the thresholds so a leg passes**: rejected outright. That weakens the gate, which the
  project rules forbid. Leaving thresholds off a partial reading and applying them to the whole one
  is the opposite move.
- **Running coverage only on the merge, with legs measuring nothing**: rejected. The merge has no
  tests of its own to run, so its coverage can only be what the legs recorded.

## Consequences

**Good**: the battery reports in about the time a quarter of it takes. The gate still reads one
number over the whole suite, and it reads it once.

**Bad, and accepted**: five jobs stand where one did, and each pays its own install and its own
Chromium download. A leg that dies takes its blob with it, so the merge refuses on incomplete input
rather than reporting a number too low, which is the safe direction. The marker is an environment
variable, so a person who exports it in a shell turns their own thresholds off without meaning to.
