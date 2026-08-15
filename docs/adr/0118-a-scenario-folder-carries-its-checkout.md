# 0118: A scenario's folder carries its checkout

**Status**: Accepted
**Date**: 2026-08-15

## Context

The end-to-end fixture gave each scenario's application a user-data folder named `~/.recompose-e2e-w<parallelIndex>`. The worker index made up the whole name, and a worker index means nothing outside the run that issued it.

Every job in this repository gets its own worktree. Two checkouts running `pnpm test:e2e` at once therefore hand worker 0 the same folder. The fixture opens by sweeping that folder with `rm -rf`, and closes by sweeping it again. One run's setup thus deletes another run's live profile. A repeat run at ten workers produced 56 failures against an unmodified baseline.

The symptoms read like product defects rather than like a collision. The fixture's own cleanup raised `ENOTEMPTY`, and making a gateways folder raised `ENOENT`. Two more read `recompose holds no gateway named "Codex"` and `Another gateway already holds the name "Codex"`. A reader would take those last two to the gateway code first.

## Decision

The folder name carries the checkout beside the worker: `~/.recompose-e2e-<checkout>-w<parallelIndex>`. The `<checkout>` part holds the first twelve hex digits of the SHA-256 of the harness's own directory.

`scenarioUserDataDir` in `apps/desktop/e2e/scenario-user-data.ts` derives the name. The fixture hands it the `appRoot` it already computes from `__dirname`.

The name holds a hash rather than the path itself. The path runs long and nested, and it carries separators that no folder name can hold. Nothing reads the name back, so the digits cost nothing.

## Alternatives

- **The worktree's branch or name from git**: rejected. It assumes a worktree exists, and it assumes a git binary answers. The fixture has to work in a plain clone, and in whatever a release job checks out.
- **The repository root's basename**: rejected. Every worktree of this repository sits under `.claude/worktrees/`, so sibling worktrees would collide on the parent name. That's the case that broke.
- **A temporary directory per run through `mkdtemp`**: rejected. The suite restarts an application against the same folder, to prove that stored state survives a restart. The fixture therefore has to derive the path twice rather than mint it once. The packaged-launch harness uses `mkdtemp` precisely because it never restarts.
- **Dropping the sweep so runs stop deleting each other**: rejected. It trades a collision for a scenario reading the last run's leftovers, which is the worse failure because it passes.

## Consequences

**Good**: two checkouts run the suite at the same time without touching each other's profiles. Every checkout has a path, so a plain clone keys the same way a worktree does, on every platform the suite runs on. The fixture still derives a folder twice within a run, so the restart scenarios keep working.

**Bad**: a folder name no longer says which worker owns it at a glance, because the checkout digits sit in front of the index. Anyone clearing stale profiles by hand matches `~/.recompose-e2e-*` rather than reading names.

A checkout that moves on disk earns a new folder and leaves its old one behind. Every scenario clears its folder on the way out, so what stays behind holds nothing.
