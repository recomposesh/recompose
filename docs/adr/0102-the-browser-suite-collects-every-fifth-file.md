# 0102: The browser suite collects every fifth file

**Status**: Accepted
**Date**: 2026-08-13

Supersedes [0094](0094-the-browser-suite-collects-every-tenth-file.md).

## Context

Record 0094 set the collection at every tenth file. It closed with an instruction rather than a hope: if a run ever dies with the browser closed again, the pace comes down before anything else changes.

A run died. The `check` job on this change reported 577 of 602 files passed and none failed, then ended on `Error: [vitest] Browser connection was closed while running tests`, with `[birpc] rpc is closed, cannot call "createTesters"` beneath it. Every test that ran was green. The browser ran out of room before the suite ran out of files.

The suite grew. This change adds six files under the browser and storybook projects, and the repository now holds 131 story files. Record 0094 priced the leak at about 90 MB a file from the upstream measurement, which puts a ten-file cap near 900 MB. That cap held on the day it landed. It doesn't hold now.

## Decision

**The collection runs every fifth file.** The counter and its home stay exactly as record 0094 placed them, in the `requestGC` browser command, which runs in node and survives across files. Only the number moves.

**The cap is what changed, not the mechanism.** Five files at the measured 90 MB puts the peak near 450 MB, half of what just failed. The instruction in record 0094 named the pace as the first thing to move, and nothing else moves here.

**The next death lowers it again.** This record keeps that instruction rather than replacing it. A cadence chosen against a measured ceiling earns another look whenever the suite outgrows that ceiling, and the suite grows with every feature.

## Alternatives

- **Raising the browser's memory instead**: rejected. It buys the same room at a cost that grows with the runner rather than with the suite, and it hides the growth the cadence makes visible.
- **Splitting the browser project across shards**: rejected under You Aren't Gonna Need It for now. It answers the same problem by rescheduling the job, and nobody has tried the pace at five yet.
- **Collecting after every file**: rejected. Record 0093 measured that at about 1.8 seconds a file across 562 files, and record 0094 replaced it for that reason. Nothing suggests the cap needs to be one.

## Consequences

**Good**: the peak halves, and the suite that just died has room to finish. The mechanism, its home, and its reasoning stay where record 0094 put them, so this is one number against one measurement.

**Bad**: the collection runs twice as often, so the job pays more wall clock. This record names no figure for it, because the failing run never reached the end and left nothing to measure against. The number remains a ceiling guess against an upstream measurement rather than against this suite's own profile, and the suite will outgrow five as it outgrew ten.
