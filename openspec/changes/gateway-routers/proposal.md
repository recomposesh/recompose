## Why

A virtual model reaches exactly one target today, so a person who pooled several accounts under one name gets no benefit from the pool. The account that hits its limit takes the request down with it. The Architecture Decision Record (ADR) that deferred routing, ADR-0081, named the two modes that open the feature: `failover` and `round-robin`.

## What changes

A virtual model can hold a router between itself and its targets. A router carries a mode and an ordered list of children, and a child is a target or another router. `failover` walks its children in declared order and hands the request to the first one that can answer. `round-robin` spreads eligible requests evenly across its children.

The stored gateway document grows a graph where it held a single target, and a stored direct target migrates into that graph without changing what an existing gateway serves. The canvas gains a router node with a mode pill, and the inspector gains the routing-mode control.

Only these two modes ship here. The modes in issues #33, #43, #44, #45, #46, and #47 wait for the coverage bar ADR-0081 sets.

## Capabilities

### New capabilities

- `routers`: the behavioral contract of a router node, its two modes, its health and cooldown model, and the failures that permit another attempt.

### Modified capabilities

- `virtual-models`: a definition may bind a router in place of a target, and a refusal now names where in the chain it stopped.
- `gateway-canvas`: the canvas renders a router node between a virtual model and its targets, and a cable may meet a router.

## Impact

The gateway configuration schema takes a new version and a migration. Every gateway stored under the current version keeps serving what it serves today.

The serving path gains a second attempt where it had none, so the request pipeline changes shape for every provider. A request that has begun streaming to the caller never moves to another target.
