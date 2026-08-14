# 0110: Desktop jobs run when desktop can change

**Status**: Accepted
**Date**: 2026-08-14

## Context

The workspace held one application until `apps/web` arrived. Every gate in `ci.yml` therefore asks one question: did anything outside `docs/`, `designs/` and markdown change? The `code` path filter answers it, and `e2e`, `e2e-quarantine`, `mutation`, the Storybook build and the Chromatic upload all key on that answer.

That question stopped fitting. A change confined to `apps/web` now buys a three-platform Electron matrix, a packaged-app run, an incremental mutation pass and a snapshot upload. None of them can observe a line of the site. The web package's own tests take four seconds.

The saving isn't uniform. The `check` job runs `turbo run lint typecheck build test` across the workspace, and its remote cache already replays a package nothing touched.

## Decision

A `desktop` path filter names what builds the desktop application: `apps/desktop/**`, `packages/**`, the lockfile, `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `vitest.shared.ts` and `tsconfig*.json`. The desktop-only jobs key on it. `chromatic.yml` carries the same filter, since it builds the desktop Storybook.

The filter names whole trees rather than files, and it errs toward running. A missed run puts a defect on main. A spare run costs minutes.

The `check` job keeps its full turbo run, and the coverage upload behind it stays as it is. `codecov/patch` is a required check that posts nothing without an upload. The action lists three reports under `fail_ci_if_error: true`, so dropping desktop's tests would deliver two of three and fail the job.

The filter doesn't name the workflow files. Naming them makes it fire on itself, so an edit to the prose job or the web side buys the whole matrix. The change introducing the filter then can't show its own saving.

## Alternatives

- **`turbo run --affected` everywhere**: rejected. It governs turbo tasks, so `e2e`, the Storybook build and Chromatic stay outside it. It would also drop desktop's test task on a web-only change, taking two coverage reports with it.
- **A filter listing source files rather than trees**: rejected. The mutation job already carries such a list, and it drifts every time a file moves.
- **Leaving the `code` filter alone**: rejected. Every web change keeps paying for three platforms.

## Consequences

**Good**: a change inside `apps/web` runs the web tests, the workspace checks and the prose gate, and nothing else. The filter reads as a sentence naming what desktop needs, so a reviewer can judge it without tracing the dependency graph.

**Bad**: the dependency graph now appears twice, in the graph itself and in the filter. A new package shared with desktop has to join the filter, and nothing fails when it doesn't. Writing the filter to whole trees keeps that unlikely, and `packages/**` already covers anything added beside the two that exist.

A change to the desktop jobs no longer validates itself. Editing the end-to-end job and pushing that alone leaves the job skipped, so the author touches a watched path in the same branch to exercise it.
