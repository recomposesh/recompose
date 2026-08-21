# 0155: The browser install follows the tests that need it

**Status**: Accepted
**Date**: 2026-08-21

## Context

`check` installs Chromium only when the desktop filter matches, a condition
[0110](0110-desktop-jobs-run-when-desktop-can-change.md) set when the desktop app owned every
browser test. The site of [0111](0111-the-public-site-builds-to-files.md) has run a Vitest browser
project of its own since the hero canvas arrived, and `pnpm --filter @recompose/web test` runs it.

Nothing caught the gap because the desktop filter also lists `pnpm-lock.yaml`, and every site
change to reach `main` since then carried a lockfile edit. The first pull request to touch
`apps/web` alone met a runner with no browser: eleven node files passed, the browser project died
on `Executable doesn't exist at ~/.cache/ms-playwright/chromium_headless_shell-1228`, and
`ci-success` went red.

## Decision

**The filter names the site.** `changes` gains a `web` output for `apps/web/**`, and the install
step runs when either app changes. The desktop step keeps its own condition, and the site
installs through its own package so the browser build matches the Playwright version that package
pins.

## Alternatives

- **Installing Chromium on every `check` run**: rejected. A workflow or configuration change that
  touches neither app would download a browser nothing runs, which is the cost 0110 exists to
  avoid.
- **Reusing the desktop step for both**: rejected. It reads as though the site tests belong to the
  desktop app, and it would install the wrong browser build without a word the day the two packages pin
  different Playwright versions.
- **Skipping the browser project when no browser is present**: rejected. It turns a red gate green
  by running less, and the tests it drops are the ones that hold the hero canvas.

## Consequences

**Good**: a site-only pull request runs the same suite locally and in CI. The lockfile stops
deciding whether the site's browser tests can run.

**Bad, and accepted**: the filter now carries one entry per app that owns browser tests, so a third
such app has to add its own line. The failure that catches a missed line is loud and immediate,
which is the reason to keep the condition narrow rather than install for everyone.
