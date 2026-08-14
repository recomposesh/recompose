# Candidate: minimal (smallest shippable diff)

One structural claim drives everything below: **do not ship nested routers in this slice.** The spec line "a child is a target or another router" has no scenario exercising it and no issue demanding it; both shipped modes are fully useful flat. Nesting exists to compose modes, a third feature wearing the clothes of the first two. Cutting it deletes the zod recursion hazard, the acyclicity guard, the canvas cycle guard, the variable-depth layout, the attempt-budget machinery, and chain-keyed cursor identity. Amend `specs/routers/spec.md` to "a child is a target"; nesting waits with the modes in #33 to #47. Everything else ships as written.

## 1. Stored shape

Flat, in `packages/contracts/src/gateway-config.ts`:

```ts
export const routerModeSchema = z.enum(['failover', 'round-robin']);

export const routerSchema = z.strictObject({
  mode: routerModeSchema,
  children: z.array(targetSchema).refine(uniqueByAccountAndModel, 'duplicate router child'),
});

export const bindingSchema = z.union([targetSchema, routerSchema]);
```

`virtualModelSchema.target` becomes `bindingSchema`. Both arms are `strictObject` with disjoint keys, so plain `z.union` is unambiguous with no discriminator field, and use sites narrow with `'mode' in target`. `children: []` stays parseable because the empty-router refusal happens at serve time.

**The zod hazard is not mitigated here, it is deleted.** colinhacks/zod#5991 bites recursive getter unions under `z.discriminatedUnion`. A flat schema has no recursion, so there is no spike and no fallback plan to write.

Migration, beside the existing `from: 1` entry:

```ts
const directTargetsKeepTheirShapeInsideTheUnion: Migration = {
  from: 2,
  migrate: (doc) => ({ ...doc, schemaVersion: 3 }),
};
```

Identity plus a version stamp: a stored direct target is already a valid `bindingSchema` arm, so nothing rewrites and `gateway-config-migration.test.ts` proves the round trip trivially. `GATEWAY_CONFIG_VERSION = 3`. The union earns a `*.test-d.ts` beside `gateway-config-targets.test.ts`.

## 2. Where routing decides

**The engine child picks the child. Main keeps custody per attempt.** ADR-0081 rule 4 verbatim. The retry loop must live where the upstream `Response` is held and classified, `packages/engine/src/gateway-proxy.ts`, so selection in main would cost one IPC round trip per outcome for nothing.

Seam changes in `packages/contracts/src/engine-protocol.ts`:

```ts
const targetStandingSchema = z.discriminatedUnion('standing', [
  z.strictObject({ standing: z.literal('bound'), providerModel: nonBlankString }),
  z.strictObject({ standing: z.literal('removed') }),
  z.strictObject({
    standing: z.literal('routed'),
    mode: routerModeSchema,
    children: z.array(z.strictObject({ childId: nonBlankString, providerModel: nonBlankString })),
  }),
]);
```

`engineSpendRequestSchema` gains `childId: nonBlankString.optional()`, and `SpendGrantContext` in `gateway-proxy.ts` carries it through the existing optional parameter, so `SpendGrantFor` keeps its arity.

`childId` is an opaque token main mints per `(accountId, providerModel)` pair when `apps/desktop/src/main/engine-host/stored-gateway.ts` builds the engine view, held in a childId-to-Target table beside that snapshot and swapped atomically with it, so a config edit can never misresolve a stale id. `apps/desktop/src/main/engine-host/spend-grant.ts` resolves the table entry instead of re-finding the single target. One token does double duty: custody lookup in main and cooldown identity in the child. The `engine-protocol.test-d.ts:152` assertion that the child never sees `accountId` stands untouched.

The seven side paths (`gateway-count-tokens.ts`, `gateway-images.ts`, videos, compaction, xai-websocket) get one rule, one helper: a non-serving path resolves the first declared child. Recorded once in the ADR.

## 3. The classification table

One pure module, `packages/engine/src/router-attempt-outcome.ts`, in the engine, not contracts: it has exactly one consumer, and contracts placement buys a hypothetical second reader (YAGNI). Its deterministic table spec plus property twin pins it as hard as a type-level spec would.

```ts
type AttemptSignal = {
  httpStatus?: number;
  transportFailed: boolean;
  errorType?: string;
  retryAfter?: string;
  firstByteForwarded: boolean;
};

type AttemptOutcome =
  | { kind: 'retryable'; coolForMs?: number }
  | { kind: 'request-scoped' }
  | { kind: 'stream-committed' };
```

Rows: `firstByteForwarded` wins over everything (stream-committed). No status at all is retryable (CLIProxyAPI#2189's silent-failure trap). 408, 5xx, 529, and rate-limit 429 are retryable; 429 with a quota or billing `errorType` is request-scoped, as are 400, 401 after main's one refresh, 403, 404, 413, context length, and signature failures. `retryAfter` parses delay-seconds or HTTP-date (RFC 9110). Inputs arrive normalized by `plugin-abi.ts` and `subscription/codex-errors.ts`; this module consumes, it does not re-parse transports.

Cooldown: `Retry-After` when present, otherwise one fixed default; no failure counting. An in-memory `Map` in the child keyed `(slug, childId)`, which is target identity per ADR-0081 rule 6 because equal pairs share a token. The round-robin cursor keys `(slug, virtualModel.id)`, which in a flat world is the router instance. Both reset on engine restart, costing one uneven request.

## 4. Round-robin and chained turns

**Refuse legibly, round-robin only.** A responses-dialect request carrying top-level `previous_response_id` under a round-robin router gets a typed refusal naming the router and the remedy (bind failover or a direct target, or start a fresh thread). Detection is one property read on `crossing.raw`, already parsed in `gateway-request-crossing.ts`.

Why not the alternatives. Ignoring reproduces CLIProxyAPI#2594, an open defect the acceptance brief disqualifies. Pinning requires harvesting `response_id` from streamed answers into a response-to-target memory, which is sticky routing, which is issue #45, explicitly deferred. Refusal is stateless, honest, and forward-compatible: a refusal can become a pin later without breaking any caller, while silent rotation cannot become anything without a behavior change.

Failover does not refuse: it moves only on real failure, where the alternative was no answer, and the provider's 400 on a moved chain forwards verbatim, same as today. Encrypted-reasoning misroutes (#3189) stay request-scoped in the table so they never cascade. Both residuals go in the ADR.

## 5. Canvas and inspector

Fourth node kind `router` in `node-graph.ts` and `log-scope.ts`. The card borrows `target-node` shape and shows the mode as a pill. Flat means `tidy-layout.ts` adds one fixed column (gateway, model, router, target), not variable depth, and no `isValidConnection` cycle walk exists because the schema cannot express a cycle. `drop-picker.tsx` offers "router" as the third thing a released cable meets; a cable dragged from a router opens the existing account-then-model picker. Inspector: `routerBody` in `subject-bodies.tsx` with the shared `SegmentedControl` for mode, the child list in declared order with up and down buttons, and one sentence of round-robin copy naming the prompt-cache cost. Per-attempt cable lighting is not built: `logRowSchema` already carries `accountId` and `providerModel`, so failed attempts stay legible in the log drawer without touching `NoteTraffic`.

## Build order

1. Contracts: binding union, v3 migration, engine-protocol routed arm plus `childId`, type specs.
2. Pure policies: `router-attempt-outcome.ts`, failover fold, round-robin pick; property tests with deterministic twins.
3. Main: childId table in `stored-gateway.ts`, per-child resolution in `spend-grant.ts`.
4. Serving path: attempt loop in `gateway-proxy.ts`, first-event hold and first-downstream-byte commit at the `gateway-stream-answers.ts` seam, the three refusals in `refusals.ts`, first-child helper for side paths.
5. Canvas: node, pill, picker arm, layout column, stories, e2e.

## Not building, and why

- **Nested routers**: no exercising scenario; deletes the zod spike, acyclicity, cycle guard, depth layout, attempt caps. A later v4 widens `children`; flat is a strict subset of the tree.
- **Attempt budget**: a flat router attempts each child at most once by construction.
- **Cursor or cooldown persistence**: restart costs one uneven request.
- **Failure-count thresholds**: the spec asks for none.
- **`NoteTraffic` target identity and per-rung cable lighting**: log rows already attribute attempts.
- **Classification table in contracts**: one consumer.
- **Sticky, weighted, quota, latency, cost modes**: ADR-0081 defers them.
- **Canvas drag-reorder of children**: inspector buttons.

## Self-scores

- **Shipping speed: 9.** Roughly half the surface of the tree design; the migration is two lines.
- **Correctness risk: 7.** Flat deletes whole bug classes, but the hard parts stay hard: the first-byte commit boundary and 429 body discrimination are where this feature actually fails, and both remain.
- **Migration safety: 9.** Identity migration; a stored direct target never rewrites.
- **Future-mode fit: 5.** The honest loss. Nesting later costs a v4 migration and a layout rework, and the README sells "composable routing"; if composition is product identity rather than roadmap, this candidate under-delivers it. The deferred modes themselves all fit a flat child list, so the loss is composition, not modes.
- **Test cost: 8.** Fewer surfaces; policies stay pure and property-testable; no recursive-schema fuzzing. The stream-commit e2e is the one expensive suite and no candidate escapes it.
