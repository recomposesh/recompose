# 0113: A router walks an id-keyed table, one attempt at a time

**Status**: Accepted
**Date**: 2026-08-14

## Context

A virtual model reached exactly one target. A person who pooled several accounts under one name got
nothing from the pool, because the account that hit its limit took the request down with it.
Architecture Decision Record (ADR) 0081 deferred router execution, named `failover` and
`round-robin` as the two opening modes, and left an implementation order this change follows step by
step. This record answers it.

The pinned upstream supplies the bar, because its open defects show what a naive router does. A
transport failure carrying no status skipped failover entirely (CLIProxyAPI#2189). Rotation broke
chained turns (#2594, #3189). One exhausted credential poisoned a whole pool (#3317). A retry
counter that resets looped forever (litellm#7091).

## Decision

**A router is a node between a virtual model and its targets, and it chains.** A router's child is a
target or another router, and a virtual model binds either kind. `failover` walks its children in
declared order, `round-robin` spreads eligible requests across them, and no third mode ships.

**The stored shape is a flat id-keyed table, never a nested one.** A virtual model binds
`routing: { entry, nodes }`, where a route node is a target or a router and a router names its
children by id. On the pinned `zod` 4.4.3 a recursive discriminated union collapses inference and a
cyclic value overflows the parse. String references delete that hazard rather than mitigating it,
because a parsed cycle has no representation at all. One iterative walk in a `superRefine` proves
entry resolution, child resolution, single parenthood, full reachability, and a router depth of at
most four. Acyclicity follows from the first two of those, so no rule checks it on its own. The walk
sits in contracts, ahead of any canvas guard, per ADR 0081 rule 3. A deferred mode later joins the
policy union as another arm, with no second migration.

**A migration that runs on every load is a pure function of the document, or it's a defect.** The
gateway config takes version 4, since the gateway key change took 3 first, and the router entry
registers `from: 3`. It wraps each direct target in the one-node graph that serves identically, and
the entry takes its name from the virtual model's own id rather than a mint. The first version
minted `crypto.randomUUID()`, and every gateway stored before this change answered "holds no target"
after the upgrade, for a target plainly in the file. Nothing writes a migrated document back, so the
ladder runs on every load. The engine's snapshot and the lookup a request made against the same file
therefore named different seats, and the lookup missed every time. A stored id is unique inside its
document and stable across loads, which a fresh identifier never is.

**The walk resolves custody per attempt, and one child's custody failure costs only that child.** A
route node id crosses to the engine child as a seat name, and `accountId` never crosses. Only main
turns a seat into a credential, which is ADR 0081 rule 4 verbatim. Both custody failures, a missing
credential and a missing target, move the walk to the next child.

That second row arrived late, and its absence was the failure this change exists to prevent. The
approved decision wrote the rule for a missing credential alone, and #3317 is about custody failing
at all.
An account leaving the registry answers `missing-target`, which no row covered. A graduated scenario
found it on the shipped app. A failover router stands over two targets, one account leaves, and the
gateway answers 502 "holds no target" while the healthy sibling never hears about it. Nothing leaves
the machine. Both readings now move on, and the exhausted refusal says `has no target` beside the
siblings it tried.

**A standing goes stale when an account leaves, and the walk tolerates that rather than refreshing
it.** `removeAccount` rewrites the accounts file and never re-mints the engine view. The cluster
compared both readings before this stood, and the stale one and the fresh one agree on status, body,
and code everywhere a divergence could show. Refreshing costs more than it buys. `createGatewayApp`
builds the routing memory, so restarting the child forgets the cooldown ledger and the rotation
cursors for every virtual model on that gateway. Not only the ones touching the account that left.
It also kills in-flight requests, and an account can back targets in any stored gateway, so a
correct refresh has to sweep them all.

**The commit boundary is the first byte written downstream, never an upstream 200.** Before it, an
upstream error event, a status-less transport failure, and a retryable status all move to the next
child. After it, the provider's stream error forwards verbatim, the stream closes, and no sibling
begins. Anthropic documents that a 200 stream can open with an overload error, so the upstream
status proves nothing. Holding relay until the first upstream event classifies isn't buffering,
because relay resumes the moment it does.

**Termination is structural.** A request-scoped visited set of attempted node ids bounds the walk,
and a cap of eight attempts bounds it again. A counter can reset, which is how litellm#7091 looped
forever. A visited set can't.

**Cooldown lives in memory and forgets on restart.** It keys by gateway, virtual model, and route
node id, per ADR 0081 rule 6. Duration comes from the provider's own signal when one arrives, and
from a fixed 60 seconds otherwise. No failure counting exists in this release, because two of
#3317's suspected causes were health state that outlived its trigger. The ledger also records
whether the provider promised the time, since the exhausted refusal's status turns on that across
requests.

**Three refusals, each a fact rather than a dialect concern.** An empty router answers 502 under
`empty_router`. An exhausted one enumerates every child it tried with its reason, and answers 429
carrying `Retry-After` when every child promised a time, 502 otherwise. A chained turn under
round-robin answers 400 under `chained_turn` with a remedy sentence, and never rotates. The retry
time rides the rendered refusal, so one seam writes the header for all four dialects.

**Depth four, eight attempts, and 60 seconds stand as recorded decisions.** The field's defaults
tune replica fleets rather than a person's metered accounts. Each number lives beside its consumer,
and changing any of them is a one-line edit with no migration.

**Every path that can serve only one target resolves the first declared target.** Token counting,
images, video, and socket preparation each need one account and one provider model, and none of them
can walk a ladder. One reader answers for them all instead of each caller writing its own descent.

## What this change didn't build

- The six deferred modes of ADR 0081. The policy union is their seam and nothing else of theirs
  lands.
- Session affinity in any form. A chained turn refuses rather than pinning, and a failover move
  mid-chain can still poison encrypted reasoning, which stays with issue #45.
- Failure counting, escalating windows, and any cooldown or cursor state that survives a restart.
- Mid-stream continuation, and a bigger-window fallback for a context-length failure. Those stay
  request-scoped per ADR 0081 rule 8.
- **A cable dropped onto an existing router card.** Two readings of the chaining decision took it as
  licensed, and the cluster that owned the gesture refused it. A cable on this canvas runs parent to
  child, so a cable ending on a router card would make that router a child of its source. The stored
  shape refuses a node answering to more than one parent, and a routing table belongs to one
  definition. Every such drop is therefore a no-op, unrepresentable, or a re-parent. A re-parent is a
  move, the canvas owns only binding, and no approved scenario asks for one. The gesture needs a
  scenario naming which move it means before anyone writes it.
- Route node ids on every canvas node. The entry answers in the virtual model's own name and only a
  node below it carries its route node id, because the position store keys by node id and a uniform
  rename would discard every card a person had dragged.

## Alternatives

- **The recursive schema the archived shape used**: rejected on a spike rather than a preference.
  The inference collapse and the cyclic-input crash both reproduce on the pinned `zod`.
- **Cutting nested routers to delete the same hazard**: rejected. It deletes the product promise
  along with the hazard, and the flat table deletes the hazard alone.
- **Shared children, making the table a directed acyclic graph**: rejected. The canvas draws one card
  with one inbound cable, and a single parent keeps cooldown attribution unambiguous.
- **A universal fourth column for routers, with a stored-position migration**: rejected. Card seats
  live in the renderer's own store rather than the document, so seating derived from routing depth
  moves a displaced target without writing anything, and no existing gateway moves a pixel.
- **Pinning a chained turn to the child that served its first turn**: rejected. It builds a corner of
  sticky routing ahead of its feature, inventing an affinity key, an eviction policy, and a restart
  story for issue #45 to re-cut.
- **Answering 429 whenever a router exhausts**: rejected. A pool downed by transport failures isn't a
  rate limit, and a synthetic retry time would lie to the caller.
- **Citing the field's defaults for the three numbers**: rejected. They answer a different problem.

## Consequences

**Good**: no parsed value can hold a cycle, no failure shape slips past failover unseen, and no
configuration turns one client request into an unbounded upstream sequence. The status-less
transport failure that `gateway-proxy.ts` used to swallow into a terminal answer is now a typed
reading the compiler checks for exhaustiveness. Every attempt reaches traffic and the log with its
node named, so a router can't hide the spend of a child that failed. One dead account costs one
child. A stored version 2 gateway climbs the ladder and serves what it served.

**Bad, and accepted**: every reader of the field that went away changed at once. Thirty-five files
read it, because the repository typechecks as one unit. Nineteen wanted the same answer, so
contracts grew one rule for the single target a routing binds. Both protocol type-spec suites rewrote,
which the test invariant permits because the contract changed under them. Round-robin trades
prompt-cache locality for spread, and the inspector says so at the point of choice.

The residuals a later reader will meet:

- A quota-shaped 429, which waiting can't fix, classifies as retryable and spends sibling attempts.
  The visited set and the attempt cap bound the waste. That row moves to answer once the normalizers
  can discriminate a quota body from a rate limit.
- Cooling reaches no log. The traffic notes filter a cooling child out, so the only evidence a caller
  or a scenario sees is the exhausted refusal naming that child.
- A refusal code surfaces in the OpenAI and Responses dialects only. The Anthropic envelope carries
  no code field at all, and Gemini renders a 429 as `INVALID_ARGUMENT`.
- A failure after the commit point logs a bare `TypeError: terminated`, where the transport-failure
  path names the gateway, the virtual model, and the target. Giving it context means wrapping the
  forwarded stream, which reaches past this change.
- A closed stream and a finished one look alike at the transport. A client watching only for socket
  close reads a truncated answer as a complete one. That one is about the product rather than the
  rig.

Two things would reopen this. An account registry that has to stay fresh in the engine's view wants
a directive updating standings in place, rather than a child restart. A deferred mode that needs one
target under two parents costs the single-parent rule, and the tree that rests on it.
