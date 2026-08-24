# 0176: The browser suites open when a run asks for them

**Status**: Accepted
**Date**: 2026-08-24

## Context

`apps/desktop` runs four Vitest projects from one config. `unit` runs 364 files in node. The other
three drive a real headless Chromium: `browser` opens 165 files, and `storybook` and
`storybook-dark` each open the same 183 stories, once per scheme. That's 531 files in a browser on
every run, and the `test` script measured coverage over every one of them.

Record 0117 already measured the split on a fourteen-core machine. The `unit` project alone
finished in 57 to 66 seconds. The whole battery took 311 to 557 seconds across four runs. The
browser projects hold the difference, and they hold it in processes that compete with the node
workers for the same cores.

Nothing about the inner development loop needs that. A person changing a routing rule or a token
count waits on 531 browser files to learn whether a node test passed, and the machine is unusable
while they wait. `apps/web` carries a smaller version of the same shape.

Mutation was already outside this. Stryker runs from its own config through `test:mutation`, on the
pull request in a scope cut from the diff, and weekly in full. No Vitest run ever reaches it.

## Decision

The Chromium projects open on two conditions, and stay closed otherwise:

- `CI` names the run, which covers every pipeline leg without touching a workflow file.
- `RECOMPOSE_BROWSER_TESTS=1` names them by hand, which is the local pre-pull-request run.

Coverage follows the same condition through `coverage.enabled`, and the `test` script drops its
`--coverage` flag. The thresholds ask for ninety across `src/**`, and only a battery that opened the
browser projects can answer that. Measuring a node-only run against them would report a failure
about the lane rather than about the code.

`pnpm test:full` sets the variable and hands the rest to Turbo, so one command covers every package.
The Turbo `test` task declares both variables under `env`, which puts them in the cache key. Without
that, a cached node-only result could answer for a pipeline leg that asked for the full battery.

## Alternatives

- **Splitting the scripts instead, with `test` filtered to `--project unit`**: rejected. It leaves a
  bare `vitest run` heavy, which is the command that prompted this, and it moves the task name that
  continuous integration and Turbo both call.
- **`--mode full` rather than an environment variable**: rejected. Vite's mode reaches the code.
  `apps/desktop/src/renderer/src/app/routes/__root.tsx` mounts devtools on
  `import.meta.env.MODE !== 'test'`, so a renamed mode would put devtools inside the browser suites.
- **A pre-push hook carrying the full battery**: rejected for now. The maintainer asked for a
  written rule to follow before the pull-request commit, rather than a hook that fires on every
  push, including the pushes that open no pull request.
- **Lowering the coverage thresholds so a node-only run can pass them**: rejected outright. The
  gates never loosen. Coverage moves with the battery that can satisfy it instead.

## Consequences

**Good**: the inner loop drops from the whole battery to the `unit` project, which record 0117
clocked at about a minute. Continuous integration changes in no way, because `CI` already names
every leg. Nothing about the gate weakens: the same four thresholds hold over the same battery.

**Bad**: a local run no longer answers whether a story or a browser spec broke, so a branch can sit
green on the fast lane and fail the pipeline. The rule in `CLAUDE.md` closes that by naming
`pnpm test:full` as the run before the commit that opens a pull request. The coverage gate in
continuous integration stays the guard that catches a lane narrowing on its own.

`knip` reads the same config, so `lint:dead` sets the variable as well. A run without it loses the
browser projects, and the setup file they name then reads as an unused file.

`pnpm test:full` and `apps/web`'s `test:browser` both set the variable through an inline prefix,
which needs a shell that reads one. A Windows contributor sets `RECOMPOSE_BROWSER_TESTS` first and
then runs `pnpm test`. Only the e2e legs run on Windows in continuous integration, so no pipeline
leg rests on the prefix.
