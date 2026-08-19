## Why

A router today picks children by order or by rotation. Neither mode reads the request itself, so a gateway can't send code review to one model and casual chat to another under a single virtual model name. The brainstorm of 2026-08-19 settled a third mode: a judge model classifies each request and the router follows the branch whose rule matches. The flow screens 0 to 7 already live in `designs/recompose.pen` (PR #267), so this change builds the engine, the contract, and the canvas behavior they depict.

## What changes

- `routerPolicySchema` in `packages/contracts/src/gateway-routing.ts` grows a `conditional` variant carrying the judge binding (`accountId` plus `providerModel`), ordered branches (label, rule, child id), a mandatory else child, and a timeout budget.
- `ChildPicker` in `packages/engine/src/routing/attempt-walk.ts` goes async, because the conditional pick awaits the judge's answer.
- The walk injects the judge call like an attempt, and the judge inherits the cooldown rules: a cooling judge sends the request down the else branch.
- Conversations stick to the branch they first earned, keyed by a conversation fingerprint, with a per-router toggle to re-judge every request.
- Judge failure, timeout, and no match all land on else. Routing trouble never drops a request.
- Server-state turns follow the `wouldRotate` chained-turn precedent and refuse a branch change.
- The mode sentence joins `router-modes.ts` and `nameOfRouterMode` gains `conditional`.

## Capabilities

### New capabilities

None. The conditional mode extends the existing router capability rather than standing beside it.

### Modified capabilities

- `routers`: a third mode joins failover and round-robin, with a judge binding, labeled branches, a permanent else branch, and sticky conversations.
- `engine`: the attempt walk picks children asynchronously and treats the judge as a real binding under the same custody and cooling rules as any target.
- `gateway-canvas`: the mode pill reads `? conditional`, branch cables carry rule pills, and the judge rides above the router as a satellite node.

## Impact

- The contracts package changes shape, so every consumer of `routerPolicySchema` re-checks against the new discriminated union.
- Making `ChildPicker` async ripples through the walk's call sites in the engine.
- No behavior changes for failover or round-robin routers: the new mode is additive.
- The renderer work lands against settled designs, so screens 0 to 7 in `designs/recompose.pen` bound the canvas impact.
