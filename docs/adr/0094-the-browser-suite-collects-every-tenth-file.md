# 0094: The browser suite collects every tenth file

**Status**: Accepted
**Date**: 2026-08-13

Supersedes [0093](0093-the-browser-suite-collects-between-files.md).

## Context

Record 0093 gave every browser test file a `page.requestGC()` on its way out, which stopped the `check` job dying mid-suite. The first clean run since the crashes proves it works and prices it. The job took 29 minutes, against the 12 minutes and 18 seconds of its last passing run before the change. That's about 1.8 seconds per file across 562 files, and record 0093 called the cost "a little wall clock" without having measured it.

The leak the collection answers grows per file. The reporter upstream measured 13.7 GB of peak usage over 150 files, which is 90 MB a file. Nothing about the fix requires collecting after every one of them.

## Decision

**The collection runs every tenth file.** The `requestGC` command counts each file it answers and reaches the page on the tenth. That caps the peak at ten files of leaked memory, around 900 MB by the upstream measurement. The counter lives in the command, which runs in node and survives across files, rather than in the setup file, which doesn't.

**The cadence is a measured number, not a guess.** If a run ever dies with the browser closed again, the pace comes down before anything else changes.

## Alternatives

- **Keeping the per-file collection**: rejected on the measurement. 17 minutes on every push buys headroom the runner never needs.
- **Collecting on a memory reading rather than a count**: rejected because Playwright hands no cheap number to threshold on, and a count is what the leak scales with.
- **Collecting only in the storybook projects**, which hold most of the files: rejected because the browser project accumulates the same way and the count already spends almost nothing there.

## Consequences

**Good**: the job keeps the fix and gets its 17 minutes back. The pace is one constant, so tightening it takes a one-line change with a measurement behind it.

**Bad**: peak memory now sits ten files higher than it needs to, which is headroom traded for time. A suite whose files each leak far more than 90 MB would need the pace tightened, and nothing measures that automatically.
