# 0140: The cable into a router borrows the newest reading below it

**Status**: Accepted
**Date**: 2026-08-18

## Context

The canvas paints each cable from the traffic recorded against its own route node. The engine notes an outcome only where it spends or attempts, and that place is always a target. A router's node never carries a reading, so the cable feeding a router card rested through every request. A person watching a request walk a routed table saw the gateway wire light and the answering child light. Between them stood a resting gap, one per router on the path. A spec pinned the gap on purpose, on the reasoning that no request ever names a router. That holds for the engine and fails as a picture: the request did flow through that cable.

## Decision

**The cable into a router borrows the newest reading among the nodes below it.** The renderer derives it from the same per-node traffic the engine already records. The path a request walked lights whole from the gateway to the child that answered, however many routers stand between.

**Only the standing travels up.** The failure a person can press stays on the failing child's own cable, so one failed request still stands exactly one error to read.

**A reading through a child whose account left paints nothing upward.** The gateway wire already refuses stale readings from a broken binding, and the router cable keeps the same rule. A lit path into a card that can't serve the next request would say it could.

## Alternatives

- **The engine records an outcome on every router a request passes.** Rejected: the fact is derivable from the table shape and the per-node readings the engine already emits, so recording it would widen the traffic contract to say the same thing twice, and every consumer would have to learn which entries are targets and which are echoes.
- **The router cable reads the model-level aggregate the gateway wire reads.** Rejected: two sibling routers under one model would light together whenever either served, so a cable would claim traffic that never crossed it.

## Consequences

**Good**: a request through a routed table reads as one continuous flow, and a nested table lights every segment on the walked path. The traffic contract doesn't change, and the engine stays ignorant of how the canvas paints.

**Bad**: a router cable can read failed with no chip of its own to press, so a person follows the path down to the child that carries the error. The derivation walks a parent chain per painted node on every canvas render, a cost bounded by the router depth limit the stored table already enforces.
