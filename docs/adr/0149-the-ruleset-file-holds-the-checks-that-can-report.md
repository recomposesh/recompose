# 0149: The ruleset file holds the checks that can report

**Status**: Accepted
**Date**: 2026-08-20

## Context

`.github/rulesets/main.json` is the committed shape of the branch ruleset, and the live ruleset
had drifted from it. GitHub held three things the file never named: a `code_scanning` rule, a
required `UI Tests: recomposesh`, and a required `codecov/patch`. Anyone reading the file learned
the wrong rules, and `apply-ruleset.sh` would have deleted the two the file forgot.

`codecov/patch` also can't report on most pull requests.
[0110](0110-desktop-jobs-run-when-desktop-can-change.md) put the desktop filter on the jobs that
build the app. It kept the coverage upload out of that filter and wrote down why: "`codecov/patch`
is a required check that posts nothing without an upload." A later change gave `coverage-upload`
the condition `needs.changes.outputs.desktop == 'true'` anyway, and walked into the hazard that
record had named.

A change to the site, the docs, or a workflow now skips the upload, so Codecov receives nothing.
Codecov posts for commits it holds a report for, and `if_not_found: success` in `codecov.yml`
answers an empty head report rather than an absent upload, so no check appears at all. GitHub then
waits for a status nobody will send. Every pull request outside the desktop app sat blocked, and
each one merged on a maintainer bypass.

The other skipped jobs don't have this problem: GitHub reports them as skipped, and a skipped
check satisfies a requirement. `codecov/patch` isn't a job in this repository, so nothing reports
it.

## Decision

**The file names every rule the ruleset holds.** `code_scanning` and `UI Tests: recomposesh` join
it, because both stand in GitHub today and both report on every pull request.

**`codecov/patch` leaves the required list.** Codecov keeps commenting and keeps publishing its
check on the pull requests that upload, so the patch verdict stays visible where it means
something.

**Coverage keeps the gate it already had.** `vitest.shared.ts` fails the run below 90 percent on
lines, branches, functions, and statements. Those thresholds run inside `check`, which carries the
same affected-paths condition, and `check` feeds the required `ci-success`. The number doesn't
move, and the enforcement was never Codecov's to begin with.

## Alternatives

- **Restoring the unconditional `coverage-upload` that
  [0110](0110-desktop-jobs-run-when-desktop-can-change.md) kept**: rejected. The artifact comes
  from `check`, which is itself conditional, so the upload would need the whole suite to run for a
  change to a sentence of prose. That cost is what the affected-tasks work removed.
- **Leaving the requirement and bypassing each merge**: rejected. A required list that nobody can
  satisfy trains everyone to reach for the bypass, and the weekly bypass audit fills with entries
  that mean nothing.
- **Applying the committed file as it stood**: rejected. It would have removed `code_scanning`
  from the ruleset, which is a real gate reporting real findings.
- **A job that reads the Codecov verdict and fails on it**: rejected. Codecov processes uploads
  after the run finishes, so the job would poll a third party and go flaky, to re-decide a
  threshold the test run already enforces.

## Consequences

**Good**: a pull request that touches no desktop code can merge on its own checks, and the bypass
stops being routine. The file and the ruleset say the same thing, so `apply-ruleset.sh` is safe to
run and the diff shows any future drift.

**Bad, and accepted**: nothing blocks a merge on the patch coverage of a diff. The suite's own
thresholds bound total coverage, so a change can still lower coverage inside the 90 percent floor
without a check objecting. Codecov's verdict now needs a reader rather than a gate.
