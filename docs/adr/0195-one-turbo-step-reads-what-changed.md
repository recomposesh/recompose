# 0195: One turbo step reads what changed

**Status**: Accepted
**Date**: 2026-08-25

## Context

The `check` job carried the same turbo command twice, once behind
`if: github.event_name == 'pull_request'` with `--affected`, and once behind the negation without
it. A run therefore always printed one step and skipped its twin, which reads to anyone opening the
log as though half the job were missing.

The split existed because `--affected` needs a base to compare against, and only the pull request
event offered one. `TURBO_SCM_BASE` took `github.event.pull_request.base.sha`, and a push had
nothing to put there, so the push ran the whole graph.

Turbo also groups a task's output and prints it when the task ends, which is its default whenever
more than one task can run at a time. After record 0194 raised the concurrency, `lint` reported at
33 seconds and then the job sat silent for minutes while `test` ran. Nothing was wrong, and there
was no way to tell that from the log.

## Decision

**One step, always `--affected`.** A push sets `TURBO_SCM_BASE` from `github.event.before`, which
is the commit `main` stood on before the merge. A pull request keeps its base commit. Both events
now name a base, so both read the same command and the log shows one step rather than a pair.

**The log streams.** `--log-order=stream` interleaves task output as it arrives, so a long task
reports progress instead of silence.

## Alternatives

- **Splitting `test` into a matrix over the vitest projects**: rejected, because it would break the
  coverage gate rather than speed it up. The desktop thresholds hold over the whole battery
  (record 0176), so a single project measured alone reports single-digit coverage and fails at 90.
  Making the split work means redesigning how coverage merges, which is a gate change and its own
  job.
- **Keeping the full run on a push**: rejected. The remote cache already replays every task a merge
  didn't touch, so the full graph mostly proves that the cache works. What a merge actually changed
  is what a merge should run.
- **Leaving the two steps and only adding the stream flag**: rejected. The skipped twin is the part
  people misread, and one command that reads the event is simpler than two that split on it.

## Consequences

**Good**: one command to read and one to change. A long task says what it's doing while it does it. A merge to `main` runs what the merge touched rather than the whole graph.

**Bad, and accepted**: `main` no longer runs every task on every push, so a run takes the cache's
word for a task rather than repeating it. A force push to `main` would leave `github.event.before`
naming a commit no longer in history, and turbo would fall back to running everything, which is the
safe direction to fail in. Streamed output interleaves, so a failing task takes longer to find.
