# 0162: Vitest refuses to run from the repository root

**Status**: Accepted
**Date**: 2026-08-23

## Context

Four packages each own a Vitest config, and each one knows what its own tests need. `apps/desktop`
splits into four projects: `unit` in node, plus `browser` and two Storybook projects in headless
Chromium. `apps/web` splits into two. `packages/engine` and `packages/contracts` run in node.

The repository root owned nothing. So `vitest run` from the root fell back to the Vitest default
config, which globs `**/*.{test,spec}.?(c|m)[jt]s?(x)` from the directory it starts in. It gathered
1233 files into one node project: all four packages at once, the 127 renderer browser specs in node
rather than Chromium, and the eleven `.claude/workflows` specs that `node --test` owns. The desktop
config never loaded, so its `CI` pacing never applied, and the run forked one worker per core and
held a fourteen-core machine at full load until it finished. What came back wasn't an answer.

## Decision

**The root holds a `vitest.config.ts` that refuses, and names the commands that work.** It throws
while Vite loads it, so the run stops in half a second having forked nothing. The message names the
commands that do work: `pnpm test` for every package, `pnpm --filter <package> exec vitest run` for
one, and `--project <name>` for one desktop project.

**A root `projects` list looked like the standard answer, and it doesn't hold on Vitest 4.**
`resolveProjects` starts one project per referenced config file and discards the `projects` that
file declares. Pointing the root at `apps/desktop/vitest.config.ts` collapsed its four projects
into one and put the browser specs back in node. That gathered 1242 files in place of 1233, which
is no improvement worth a file. Referenced configs keep their own projects on the Vitest `main`
branch, past 4.1.11, so the option reopens when that release lands.

**Splitting every package's projects into separate config files costs more than it returns.** It
would make a root run correct, and it costs eight files, a shared browser module, and project names
that have to stay unique across packages. The reward is a working command that collects around 1600
files, 600 of them in Chromium, in a repository that already has `pnpm test` and a Turbo cache for
exactly that.

## Consequences

A root run fails in under a second with instructions, in place of running for minutes and reporting
a result nobody should trust.

Nothing else moves. CI reaches Vitest only through `pnpm --filter`. Stryker points each package at
its own `vitest.mutation.config.ts`. Vitest looks for a config in the working directory and doesn't
walk up, so a run started inside a package directory still finds that package's config.

The root config carries no test options at all. Coverage thresholds, browser settings and CI pacing
stay in the package that owns them.
