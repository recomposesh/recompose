# 0196: The acceptance suite shards, as wide as the event allows

**Status**: Accepted
**Date**: 2026-08-25

## Context

The `e2e` job ran the whole acceptance suite in one step, and that step took nine minutes on Linux. It set the floor for every run, so a pipeline that reports in three minutes everywhere else
still waited on it.

Raising the worker count is the wrong lever, and the config already says why. Every worker launches
a whole Electron application rather than a browser context, and on a shared runner the launches
starve each other past two. What surfaces then is `firstWindow` crossing the test timeout, which
reads as a scenario failing rather than as a machine out of room.

More machines is the lever the suite actually has. Playwright splits a run by file with `--shard`,
and each shard then keeps the same two workers it can afford.

The job carries more than the acceptance suite. Visual snapshots, the leak run, the packaging
build and the packaged smoke test all live in it, and each one stays whole.

## Decision

**A shard dimension joins the matrix, and the event says how wide.** A pull request runs Linux
alone, so it takes eight shards. A push takes four, on each of the three systems.

**The config reads the shard from `E2E_SHARD`, not from the command line.** `pnpm run` forwards
extra arguments with the `--` separator still attached, and Playwright reads everything past a bare
`--` as a file filter rather than as flags. A shard passed that way runs the whole suite and then
refuses, which is what eight legs did at once before this. The environment carries no separator and
reaches bash and PowerShell alike, so the workflow sets one variable and `playwright.config.ts`
parses it.

**Everything that stays whole runs on shard one.** The visual, leak, packaging and packaged
steps all read `matrix.shard == 1`. Shard one therefore carries the extra work and stands as the
long pole, and the other three finish sooner.

**Traces name their shard.** The failure artifact took the operating system as its whole name, and four legs
per system would have collided on it.

## Alternatives

- **Raising `workers` above two on continuous integration**: rejected, for the reason the config
  already records. The launches starve and the timeouts read as scenario failures.
- **A separate job for the work that stays whole**: rejected for now. It would spend another
  install and another build to spare shard one about two minutes, and shard one isn't what makes a
  run slow.
- **Sharding Linux alone**: rejected. `main` and every release tag run all three systems, and the
  tag is the run that has to be quick to trust. Sparing the other two buys nothing on a public
  repository, where their runners are free as well.
- **Eight shards on every event**: rejected. Three systems at eight is twenty-four jobs against a
  twenty-job ceiling, and eight macOS legs against a cap of five. The extra shards would queue in
  waves and report later than four that all start at once.

## Consequences

**Good**: the acceptance suite reports in about the time a quarter of it takes, plus the fixed
install and build. A pull request pays four Linux runners for it.

**Bad, and accepted**: a merge to `main` now starts twelve e2e runners rather than three. The
repository is public, so standard runners cost nothing on any system. What they spend is
concurrency: the plan allows twenty jobs at once and five of them on macOS, and a leg past either
waits for a slot. Twelve fits, and eight per system would not. Two numbers now have to agree, the
shard list and the divisor beside it, and they sit on adjacent lines for that reason. Each shard
also repeats the install and the build, so every system pays that fixed cost once per leg.
