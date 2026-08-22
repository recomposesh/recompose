# 0159: The mutation gate scopes itself from its own config

**Status**: Accepted
**Date**: 2026-08-22

## Context

The mutation job asks one question before it runs anything. Did this branch touch a file the gate
mutates? It answered that question from half of each package's Stryker config. It read the positive
globs, turned them into git pathspecs, and ignored every negative one.

Stryker itself reads both halves. So a branch touching a file the config excludes gave
two different answers. The scope check said the branch was in scope and started a run. Stryker
subtracted the exclusions, found nothing left to mutate, and stopped with `ConfigError: No tests
were executed`. The job failed while reporting nothing about the code.

The desktop config excludes fourteen files this way, `src/main/index.ts` and
`src/main/engine-host/spawn-engine.ts` among them. Wiring one environment variable through
`spawn-engine.ts` was enough to fail the gate. The contracts and engine legs carried the same hole
behind hardcoded globs, where `packages/engine/src/child.ts` sits excluded.

## Decision

**One reader builds each package's scope, and it reads the whole `mutate` list.** A positive glob
becomes a `:(glob)` pathspec and a negative one becomes `:(glob,exclude)`, so git answers the
question Stryker would answer. A file the config excludes never counts as in scope, and the job
skips instead of failing.

**The three packages stop carrying hand-copied globs.** Contracts, engine and desktop each name a
directory, and the reader finds the config beside it. A glob added to any config now reaches the
scope check without anyone remembering to copy it.

**The test and type-spec suffixes stay filtered in one expression.** The three legs had drifted to
three patterns, and the widest of them is correct for all three. It still earns its place, because
`.test-d.ts` sits outside the exclusions every config writes.

## Consequences

A branch that only touches excluded files skips the gate, which is what the configs already said
should happen. Nothing that Stryker would mutate falls out of scope, because the exclusions the
reader applies are the exclusions Stryker applies.

The failure this replaces was loud but uninformative. It named a config error rather than the file
that caused it, and reading it as a real mutation failure sends a person hunting a surviving mutant
that never existed.
