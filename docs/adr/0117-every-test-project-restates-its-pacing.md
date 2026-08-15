# 0117: Every test project restates its pacing

**Status**: Accepted
**Date**: 2026-08-15

## Context

The desktop suite runs four vitest projects from one config: `unit`, `browser`, `storybook`, and `storybook-dark`. The three browser projects each spread `pacedForCi`. That spread turns file parallelism off and allows one retry whenever `CI` names the run. The `unit` project didn't.

The root `test` block spreads the same object, which reads like it covers all four. It doesn't. A `projects` entry that carries its own `test` block inherits nothing from the root one. A probe over the resolved config confirmed it. Before this change, `unit` resolved to `retry=undefined, fileParallelism=undefined`, while the other three resolved to `retry=1, fileParallelism=false`. That silent gap explains why the browser projects restate the spread, and nobody wrote it down.

The gap cost four diagnosis rounds during #214. Each run lost a different `src/main/**` file, and the branch had opened none of them. They were `tray/tray-repaint`, `boot/stored-boot-usage`, `engine/token-count`, and `usage/usage-store` reading a ledger before its flush landed. Every one passed alone. The first measurement run for this decision reproduced the class on an unmodified baseline and lost `usage/usage-store` again.

`pacedForCi` stays empty without `CI`. This decision therefore governs continuous integration only, where cores run scarcer than on any developer machine.

## Decision

The `unit` project spreads `pacedForCi` the way the other three do. The constant carries a note saying that a project inherits nothing from the root block.

Six isolated runs of the `unit` project, on a 14-core machine under sibling load:

| Variant                            | Wall time | Outcome                  |
| ---------------------------------- | --------- | ------------------------ |
| Parallel, no retry (the old state) | 65.9s     | `usage/usage-store` lost |
| Parallel, no retry                 | 60.6s     | Passed                   |
| Serialized, no retry               | 56.9s     | Passed                   |
| Serialized, no retry               | 66.1s     | One file lost            |
| Parallel, one retry                | 57.6s     | Passed                   |
| Serialized, one retry              | 62.9s     | Passed                   |

Serializing costs nothing, because module import dominates the project's time rather than the test bodies. One worker pays that import once and reuses it across 253 files. Fourteen workers each pay it again.

Retry is the half that closes the failures. Serializing alone still lost a file.

## Alternatives

- **Retry alone, leaving parallelism on**: rejected. It's the smaller change and it passed. It also leaves `unit` the one entry of four that reads differently, which is the condition that cost the diagnosis rounds. Fourteen node workers would still compete with the browser projects for a shared runner's two cores.
- **A `maxWorkers` bound instead of full serialization**: rejected. It adds a third pacing shape to a suite that already has one, and the measurement gives it nothing to buy. Serializing was never the slower option.
- **Removing the root spread as dead weight**: rejected for now. It resolves into the global config, and nothing here measured what that global value governs. The note on the constant defuses the misreading at no risk.
- **Chasing each losing spec into a deterministic wait**: rejected. Four unrelated files lost across four runs, so the pressure comes from the runner rather than from any one spec.

## Consequences

**Good**: four projects read the same way, so the next reader has nothing to reconcile. Both halves of the pacing answer the load-induced failures the issue records.

**Bad**: `retry: 1` will mask a genuinely flaky unit spec once, exactly as it already does for the three browser projects. A spec that fails and then passes on its retry still shows up as flaky in the run output. The signal survives even though the gate goes green.

The whole-battery wall time couldn't settle the trade on the machine that measured it. Four alternating runs gave 311s and 351s with the spread, against 557s and 329s without it. The within-condition spread reached 228 seconds, which is wider than any difference between the conditions. Four sibling clusters held the load average between 13 and 27 throughout. The paced runs were the tighter pair, and no paced run was the slowest. The honest reading: this change isn't a wall-time regression, rather than that it's a wall-time win.
