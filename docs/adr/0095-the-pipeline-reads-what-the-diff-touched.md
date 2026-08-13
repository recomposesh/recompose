# 0095: The pipeline reads what the diff touched

**Status**: Accepted
**Date**: 2026-08-13

## Context

The `changes` job has filtered the pipeline since record 0007, but only some jobs asked it. End-to-end, mutation, the workflow floor, and the audit all stand down on a documentation-only diff. The heaviest job of all, `check`, ran anyway, and so did the coverage upload behind it, CodeQL, and a Chromatic snapshot build.

That showed on two pull requests in a row. #171 changed markdown only, #172 changed one design file, and both ran the full `check` job plus a Chromatic build. The turbo cache spared the compute inside `check`, but the job still installed the workspace, downloaded a browser, and spent minutes of runner time to replay a cache. A design file that no test reads spent a snapshot from a quota the project has already exhausted.

The filter also counted `designs/**` as code, so a `.pen` edit looked to the pipeline exactly like a source edit.

## Decision

**The design folder isn't code.** `designs/**` joins `docs/**` and `**/*.md` in the negations that define the `code` filter, so a diff touching only drawings leaves every code job standing down.

**`check` asks the filter like everything else.** It gains the same `if: needs.changes.outputs.code == 'true'` its siblings already carry, and the coverage upload behind it follows.

**A skipped run keeps its required checks green.** `ci-success` already ignores a skipped need, and Codecov's patch status now carries `if_not_found: success`, so a diff that uploads no coverage reports a pass rather than nothing at all. Chromatic keeps triggering, and passes `skip` when the filter says the diff carries no code. That's the mechanism Chromatic ships for exactly this: no build, no snapshot spent, and the commit still marked as passing.

**CodeQL reads paths on the trigger.** It carries no required check, so `paths-ignore` is enough there.

**A markdown diff still runs what markdown needs.** Prose, spelling, and the OpenSpec validator answer to their own filter, and the pull-request gates that read the diff itself, `meta`, `commitlint-pr`, and `gitleaks`, stay on every run.

## Alternatives

- **`paths-ignore` on the whole `ci` workflow**: rejected because a required check that never reports blocks the merge forever. The job-level `if` reports a skip, which the aggregate already tolerates.
- **Leaving `check` unconditional and trusting the turbo cache**: rejected because the cache spares the work inside the job, not the job. Install, browser download, and runner minutes all still land.
- **`paths-ignore` on the Chromatic workflow**: rejected because the ruleset requires its `UI Tests` check, and a workflow that never runs leaves that check pending.
- **Counting `designs/**` as code, so a drawing runs the suite**: rejected because nothing in the build reads a `.pen` file. The drawings are the argument for the code, not an input to it.

## Consequences

**Good**: a documentation or design pull request now runs the gates that read documentation and designs, and nothing else. It costs a fraction of the runner time and spends no Chromatic snapshot, which matters while the quota stands exhausted.

**Bad**: a diff that mixes one markdown line with real code still runs everything, which is correct but hides the saving. The filter also has to stay in step with reality: a new folder that holds no code needs adding to the negations by hand, and forgetting is silent.
