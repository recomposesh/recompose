# 0103: The patch gate asks for ninety

**Status**: Accepted
**Date**: 2026-08-14

## Context

`codecov.yml` asked every patch for 95 percent, and this change reported 83.96. Two causes sat behind that one number, and only one of them was about tests.

`ci.yml` named two coverage reports, the desktop one and the contracts one. It never named the engine's. Eight engine files in this change therefore counted as nothing at all while they stood at 98.68 percent. Naming the third report moved the number to 90.25.

The rest is how codecov counts. It reports a line with a branch nobody took as a partial, and a partial fails the patch the way a miss does. Counting lines alone puts this change at 96.79 percent. Counting partials the way codecov does puts it at 91.18. The gap is real work, and it's branch work rather than line work. Three kinds sit in it: an error arm nobody reaches from a spec, a platform arm that only Windows takes, and a guard for a state the schema already forbids.

The 95 that stood here came in with the gate and answered nothing about this repository. Nothing measured it against a change of this size.

## Decision

**The patch target asks for 90 percent.** The maintainer set the number after seeing 90.25 measured against the widest change this repository has taken.

**The engine report stays named.** That fix stands on its own merit and belongs to no threshold. A report the pipeline never reads measures nothing, and reading it makes the gate stricter in reach even as the number comes down.

**The number keeps its teeth.** `informational` stays false, so a patch under 90 still blocks. This lowers a bar rather than removing one.

## Alternatives

- **Holding 95 and covering every branch**: rejected by the maintainer. The remaining arms are a Windows-only path, a guard the schema already forbids reaching, and error arms behind live network seams. Each wants a double at a process boundary, which buys a number rather than a proof.
- **Marking the gate informational**: rejected. It removes the bar rather than moving it, and nothing would ever report a patch that slid.
- **Excluding the awkward files instead**: rejected. It hides the same lines behind a list that grows without anyone reading it, where a threshold states the bargain in one number.

## Consequences

**Good**: the gate matches what this repository actually sustains, and it keeps blocking. The engine's coverage now reaches codecov, so about 230 lines a release that nobody measured before now count.

**Bad**: a patch may land at 90 where it used to need 95, and the five points between them are real. The number rests on one measurement of one large change rather than on a spread of them. It deserves another look once a few ordinary changes have passed under it. Branch arms behind process boundaries stay the thin part of this suite, and this record moves a threshold rather than fixing that.
