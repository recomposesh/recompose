# 0193: Visual regression leaves with the gate that never reports

**Status**: Accepted
**Date**: 2026-08-25

## Context

Record 0033 put Storybook snapshots behind Chromatic and made Chromatic's own **UI Tests** commit
status a required check in the `main` ruleset, on the `codecov/patch` precedent.

The plan's snapshot quota doesn't reach one day of this repository's traffic. `chromatic.yml` fires
on every push to every branch, and the desktop Storybook now holds 1161 stories, so a single push
spends more than the month allows. The status the ruleset requires has read `pending` with
"Update your plan to resume testing" ever since. A required check stuck on pending blocks nothing
and passes nothing: every merge rides the maintainer's bypass instead.

That's worse than having no gate. A bypass used once is an exception. A bypass used on every merge
is the merge procedure, and it leaves the two checks that do work, `ci-success` and CodeRabbit,
riding the same escape hatch.

The repository isn't left without visual coverage. `visual.spec.ts` renders four screens under
Playwright and compares them against committed baselines on all three runners, twelve snapshots in
total, and the `update-baselines` label regenerates them. The `storybook` and `storybook-dark`
Vitest projects render every story in Chromium in both schemes on each run, and they read
behavior and accessibility rather than appearance.

## Decision

**Chromatic leaves.** `.github/workflows/chromatic.yml`, the `chromatic` devDependency, its
`knip.json` exemption, and the `isChromatic()` motion switch in `.storybook/preview.ts` all go.

**The `UI Tests: recomposesh` required check leaves the ruleset with it.** A required context whose
producer no longer runs would block every merge outright, and leaving it repeats the same bypass
habit under a new name.

**Playwright keeps the snapshots, and the story suites keep the semantics.** `visual.spec.ts` remains
the pixel gate at the screen level. The Vitest story projects remain the reading of every story,
and the project rule that anything reaching the screen gets looked at in both schemes before it
lands stands unchanged.

## Alternatives

- **Paying for a plan that fits 1161 stories**: rejected for now. The maintainer decides what the
  repository spends, and the coverage below already answers the question the gate was blocking on.
- **Narrowing `chromatic.yml` to `main` alone, or to a story subset**: rejected. It would fit the
  quota by giving up the branch-level reading that made the gate worth having, and a snapshot tool
  that watches a fraction of the stories reports absence of change it never looked for.
- **Keeping the workflow and dropping the required check**: rejected. The workflow would keep
  spending quota to publish a build nobody gates on, and the `Storybook Publish` status would keep
  reading green beside a `UI Tests` that never resolves.
- **Widening `visual.spec.ts` to cover every screen**: not rejected, just not this job. It would
  grow the committed baselines on three platforms, and the flake surface record 0176 already names
  grows with them.

## Consequences

**Good**: no required check sits permanently pending, so a bypass goes back to meaning something.
Every push stops spending a quota that ran out. One devDependency and one workflow leave the tree.

**Bad, and accepted**: a story's appearance changes with no gate reading it. `visual.spec.ts`
compares four screens and nothing else, so a component only a story renders answers for behavior
and accessibility alone. Record 0033 stands superseded rather than wrong: its architecture was
sound and the plan under it wasn't.
