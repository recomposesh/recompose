# 0089: The mutation scope follows the test world

**Status**: Accepted
**Date**: 2026-08-12

## Context

Record 0036 drew the mutate scope at `packages/contracts/src` and `apps/desktop/src/main`, and it kept the renderer out because Stryker's Vitest runner carries no browser mode. Two features since then put eleven renderer library modules into that scope: the canvas libraries in #151 and the usage libraries in #164. Each of those modules carries a node test, and record 0036 already flattens the desktop mutation config to the `unit` project, so the runner never reaches for browser mode. The config and the record disagree, and a review caught the gap.

## Decision

**A module joins the mutate scope when a node test proves its behavior, whatever process folder holds it.** The flattened `unit` project is the test world the gate runs, so any module that project covers can host a mutant a real test kills. Renderer libraries qualify under that rule, and the canvas, usage, and chart-preset modules already in the list stay. Components whose only coverage runs in the browser or Storybook projects stay out, and browser-mode support in the runner remains the revisit trigger record 0036 named. This amends record 0036's scope line rather than sitting beside it.

## Alternatives

- **Cutting the renderer modules back out, to match record 0036's letter**: rejected because the gate already kills mutants in canvas and usage logic. Removing them drops coverage that works.
- **Leaving the config and the record in disagreement**: rejected because a gate whose real rule lives only in a config file drifts, and the next reviewer reads the record.
- **Widening the scope to every renderer file**: rejected because a browser-tested component has no node test to kill its mutants, so every mutant would survive and the score would collapse.

## Consequences

**Good**: the record now names what decides the answer, which is the test world rather than the folder. A reviewer who reads record 0036 and the config together sees one rule.

**Bad**: the mutate list stays a hand-kept enumeration in two places, the Stryker config and the CI diff list. A new node-tested module needs a deliberate entry in both, and nothing fails when someone forgets one. The cheap guard is the review, and the honest cost is that the gate covers what the list names rather than what the rule describes.
