# Candidate: contracts-first purity

One authoritative representation per rule, provable at the type level, shaped so the deferred modes (#33, #43 to #47) enter as additive union arms rather than a second migration. The price lands now: every `virtualModel.target` reader changes here.

## 1. Stored shape: a flat node table, not a recursive union

Write no recursive schema at all. zod#5991 bites getter-recursive `z.discriminatedUnion`, and the `z.union` workaround trades away the discriminator; a flat, id-keyed table needs neither. In `packages/contracts/src/gateway-config.ts`:

```ts
const routeNodeIdSchema = gatewaySlugSchema;

const routeNodeSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('target'),
    accountId: nonBlankString,
    providerModel: nonBlankString,
  }),
  z.strictObject({
    kind: z.literal('router'),
    policy: routerPolicySchema,
    children: z.array(z.strictObject({ node: routeNodeIdSchema })),
  }),
]);

const routingGraphSchema = z
  .strictObject({ entry: routeNodeIdSchema, nodes: z.record(routeNodeIdSchema, routeNodeSchema) })
  .superRefine(entryResolvesEveryChildOnceAndNoWalkReturns);
```

`routerPolicySchema` is `z.discriminatedUnion('mode', ...)` over the two shipped modes. No union of "direct target or graph" on `virtualModelSchema`: `target: targetSchema` becomes `routing: routingGraphSchema`, one representation. A direct target is the one-node graph `{ entry: 't1', nodes: { t1: { kind: 'target', ... } } }`, and the v2 to v3 migration beside `noStoredGatewayEverMintedAVirtualModel` rewrites each stored `target` into exactly that, so `gateway-config-migration.test.ts` proves the round trip serves identically. References are strings, so parsed data can never be cyclic and zod's infinite-loop warning is structurally unreachable; ADR-0081 rule 3's acyclicity and dangling-reference checks are one visited-set walk in the `superRefine`, in contracts, ahead of any canvas guard.

`*.test-d.ts` earns: `RouteNode['kind']` exactly two arms; `policy['mode']` exactly the two shipped modes; children as `{ node: string }[]` (the #43 seam); `RoutingGraph['nodes'][string]` inferring `RouteNode | undefined` under `noUncheckedIndexedAccess`; the migration output extending the v3 input. Route node ids reuse the slug grammar `layout.nodes` keys by.

## 2. Where routing decides: the child walks node ids, main keeps every account

The engine child receives the same table with `accountId` erased: in `packages/contracts/src/engine-protocol.ts` an `engineRouteNodeSchema` mirrors `routeNodeSchema` with the target arm carrying only `standing: targetStandingSchema`. `engineVirtualModelSchema.target` becomes `routing`, and `engineSpendRequestSchema` grows `routeNode: routeNodeIdSchema`. `SpendGrantFor` in `packages/engine/src/gateway-proxy.ts` gains the same parameter, and `apps/desktop/src/main/engine-host/spend-grant.ts` resolves `(slug, virtualModel, routeNode)` against the stored graph, minting one grant per attempted child.

The boundary holds because a route node id is a seat name, not an account: only main turns it into a credential, per attempt, ADR-0081 rule 4 verbatim. `engine-protocol.test-d.ts:152` keeps asserting no `accountId` on the child's view; the `keyof EngineVirtualModel` pin at line 144 changes from `target` to `routing`, legitimate since the type contract itself changes. A `missing-credential` grant becomes a per-child retryable outcome inside the walk rather than a terminal answer, delivering criterion 13: one cooling credential never poisons a sibling.

## 3. The classification table: data in contracts, consumed by a pure classifier

New file `packages/contracts/src/attempt-outcome.ts`, the one authoritative representation of the retryable / request-scoped / stream-committed rule:

```ts
type AttemptSignal =
  | { kind: 'transport-failure'; committed: boolean }
  | { kind: 'status'; status: number; quotaScoped: boolean; retryAt?: number }
  | { kind: 'stream-error'; committed: boolean; retryAt?: number }
  | { kind: 'grant-refused'; verdict: 'missing-credential' | 'missing-target' };

type AttemptOutcome =
  | { class: 'retryable'; retryAt?: number }
  | { class: 'request-scoped' }
  | { class: 'stream-committed' };

classifyAttempt(signal: AttemptSignal): AttemptOutcome
```

`committed` means first byte written downstream, never upstream 200, and forces `stream-committed` over everything else. `quotaScoped` splits the two 429s, resolved by the transports that already normalize errors (`packages/engine/src/plugin-abi.ts` retryable/httpStatus, `packages/engine/src/subscription/codex-errors.ts` retryAfterSeconds), so classification never reads a vendor body. A status-to-class table, checked total via `satisfies`, holds the rule as data. The type spec pins the three-arm outcome and that only `retryable` carries `retryAt`; the pure, mutate-listed classifier gets the property test plus its deterministic twin.

## 4. Round-robin and stateful continuations: refuse legibly

A turn forwarding a provider-held state reference (a raw `previous_response_id` the provider must resolve) under a round-robin router answers a new typed refusal, `stateful-continuation-unrouted` in `packages/engine/src/refusals.ts`, naming the router and the field. A turn the engine replays locally (the crossing already tells, via `responsesLite` and `replayScopeId`) carries its state and rotates freely.

Why refuse rather than pin: pinning is sticky mode #45 built ad hoc, an unversioned response-id-to-node map whose affinity key, TTL, and restart story would be invented here and re-cut when #45 defines them. Refusing keeps one representation of "who owns affinity" (nobody, yet), turns CLIProxyAPI#2594's silent `400 "No tool call found"` into a legible sentence, and leaves #45 the whole design space: sticky lands as a new `policy` arm plus runtime state, and the refusal stops firing under it. Failover serves chained turns in declared order while the first child is healthy; a mid-chain failover can still poison encrypted reasoning (#3189), a known limit deferred to #45.

## 5. Canvas and inspector: one identity end to end

Because the store already holds a flat id-keyed table, the canvas stops minting identity: `node-graph.ts` gains `{ id, kind: 'router', mode }` in `CanvasNode`, its id the stored route node id, model-prefixed as today. The traffic contract in `engine-protocol.ts` grows per-attempt truth, `attempts: { node, outcome }[]` beside the existing `request`. `NoteTraffic` in `packages/engine/src/gateway-traffic.ts` carries the node id, and `watchingTraffic` already collects one entry per grant ask, so each attempt notes its own cable: a request that rate-limits on target A and serves from B paints the A cable failed and the B cable served, both truthfully. `logRowSchema` already carries per-attempt `accountId` and `providerModel`, so criterion 17 costs no log change. The inspector's `routerBody` joins `subject-bodies.tsx` with the mode pill on the shared `SegmentedControl`.

## Build order

1. `attempt-outcome.ts`: signal, outcome, table, classifier, type spec, property plus twin.
2. `gateway-config.ts`: node table, graph validators, v2 to v3 migration, type specs.
3. `engine-protocol.ts`: routing view, `routeNode` on spend, `attempts` on traffic, both test-d suites.
4. Pure failover and round-robin policy functions over the resolved graph (ADR-0081 rule 5).
5. Serving path: attempt loop in `gateway-proxy.ts`, commit boundary in `gateway-stream-answers.ts`, the three refusals (empty router, exhausted router carrying the earliest `Retry-After`, stateful continuation).
6. Main: `stored-gateway.ts` erases accounts per node, `spend-grant.ts` resolves per node.
7. Canvas, inspector, layout, e2e.

## Seams deliberately cut wide

- `policy` as a discriminated union: each deferred mode is a new arm carrying its own config, no migration.
- Children as `{ node }` objects: #43 weight and #45 affinity hints attach as optional fields.
- `retryAt` on `AttemptOutcome`: #44 quota-aware reads a vocabulary that already exists.
- Route node identity on spend, traffic, and logs: #46 latency and #47 cost measure per node, zero protocol change.

## Self-scores

- Shipping speed: 5/10. Seven engine call sites, two test-d suites, and every stored-target reader change now; rival candidates ship smaller diffs.
- Correctness risk: 8/10. No recursive-schema hazard exists, validation is one walk, identity is shared end to end; residual risk sits in the call-site rewrites.
- Migration safety: 9/10. Target to one-node graph is mechanical and round-trip provable; no direct-or-graph union means no half-migrated document.
- Future-mode fit: 9/10. Five modes enter additively. Honest deduction: #45 still needs runtime affinity state nothing here pre-cuts, and the refusal choice makes sticky's arrival a behavior change clients will notice.
- Test cost: 4/10. Both protocol type-spec suites rewritten, a migration spec, classifier property plus twin, every call site's behavior spec touched: the largest test bill of the candidates, though each touch tracks a real contract change.
