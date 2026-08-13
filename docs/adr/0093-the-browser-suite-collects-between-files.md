# 0093: The browser suite collects between files

**Status**: Superseded by [0094](0094-the-browser-suite-collects-every-tenth-file.md)
**Date**: 2026-08-13

## Context

The `check` job started dying mid-suite. Three runs in a row, on three different commits, ended the same way: every test passed, then one unhandled error said `Browser connection was closed while running tests`, and the run failed with no assertion behind it. The crash landed in a different, unrelated story file each time, and it got further along each run: 443 files, then 499, then 508 of 562. Two reruns changed nothing.

That shape is accumulation rather than a broken test. Vitest issue 9437 names the cause. Chromium never releases the memory a finished test file leaves behind, and Playwright's launch keeps that memory in files on disk. A long browser run then fills the runner until the browser dies. Firefox and WebKit don't do it. The upstream patch isn't merged, and the reporter measured the workaround at 13.7 GB down to 0.55 GB of peak usage over the same 150 files.

## Decision

**Every browser test file asks the page to collect when it finishes.** `vitest.config.ts` registers a `requestGC` browser command that calls Playwright's `page.requestGC()`, and `vitest.browser-setup.ts` runs it from an `afterAll`, which fires once per file. The three chromium projects, `browser`, `storybook`, and `storybook-dark`, all load that setup file.

**The workaround stays until the upstream fix ships.** It costs one round trip per test file and nothing else, and it comes out the moment Vitest collects between files on its own.

## Alternatives

- **Rerunning until a run survives**: rejected after three reruns proved the accumulation deterministic rather than flaky. A gate that needs luck isn't a gate.
- **Sharding the browser projects across jobs**: rejected as more CI machinery for the same leak, and each shard still accumulates within itself.
- **Moving the browser suite to Firefox**, which doesn't accumulate: rejected because the product ships on Chromium and the suite should run where the app runs.
- **Raising the runner size**: rejected. The leak grows with the suite, so a bigger runner buys months rather than a fix, and the repository's own comment already records a shared runner starving this suite once before.

## Consequences

**Good**: the run's peak footprint stops growing with the file count, so the suite can keep growing without buying a bigger runner. The failure it removes was the worst kind to read: green tests, a red job, and a different innocent file named each time.

**Bad**: a per-file round trip to the browser costs a little wall clock across 562 files. The command also pins the suite to a Playwright API, so a provider swap would take the workaround with it.
