# Candidate: failure-first

Designed backwards from the shipped defects: CLIProxyAPI #2189, #2594, #3189, #3317 and LiteLLM #7091, #17729, #27823, #26015. Every mechanism below makes one of them impossible or immediately legible.

## 1. Stored shape

Minimum graph, in `packages/contracts/src/gateway-config.ts`:

```ts
const storedTargetSchema = z.strictObject({
  kind: z.literal('target'),
  nodeId: nonBlankString,
  accountId: nonBlankString,
  providerModel: nonBlankString,
});
type StoredRouter = {
  kind: 'router';
  nodeId: string;
  mode: 'failover' | 'round-robin';
  children: StoredNode[];
};
type StoredNode = z.infer<typeof storedTargetSchema> | StoredRouter;
```

`nodeId` is the load-bearing piece: cooldown, attempt records, refusals, and the traffic report all key on it. #3317's pool-wide 401 stays impossible only if failure state can never be keyed wider than one node. Health is runtime-only, in-memory, never stored: two of #3317's suspected causes (sticky cooldown, shared auth state) outlived their trigger, so a restart must flush everything.

The v2 to v3 migration wraps the flat target: `{accountId, providerModel}` becomes `{kind: 'target', nodeId: modelId + '.target', accountId, providerModel}` (per-model target ids are canon). No router is inserted; an unrouted model's serving read is unchanged. Contracts validate node-id uniqueness with a visited-set walk at parse, guarding zod's cyclic-input hang. If the discriminated-union spike fails on zod 4.4.3, `z.union` plus a hand-written type and a `*.test-d.ts`.

## 2. The attempt loop

The walk wraps the crossing-grant-forward pipeline in `proxyModelRequest` (`packages/engine/src/gateway-proxy.ts`), and `gateway-request-crossing.ts` resolves the graph instead of one target.

Commit boundary, in bytes: an attempt is committed when the first byte is enqueued to the downstream response body. The walk pipes every answer through a TransformStream owning a `CommitLatch { committed: boolean }` flipped on first chunk enqueue. Upstream 200 means nothing. On SSE the walk holds relay until the first upstream event classifies: `event: error` before any forwarded byte is a pre-commit refusal and the walk continues; the first content event forwards and flips the latch. Holding one event is not buffering, so the protocol rule holds. After the latch flips: forward the stream error verbatim, close downstream, record the failed attempt, never loop (#26015 pinned a core by looping here; closing is the criterion).

Budget: a request-scoped visited set of leaf `nodeId`s plus a hard cap of 8 leaf attempts. Each leaf attempts at most once per request across any nesting, and the graph is acyclic by contract, so termination is structural (#7091's loop was a counter that reset; a visited set cannot).

Per-child credentials: `SpendGrantFor` gains the `nodeId`; a `missing-credential` grant or a post-refresh 401 becomes an attempt outcome against that node, cooling it alone, and the walk continues. It reaches the caller only inside the exhausted-router enumeration. Grants resolve per attempt, no cache keyed by virtual model, so one bad credential spends one attempt slot, never a sibling's health.

## 3. The classification table

One pure module, `packages/engine/src/routing/attempt-outcome.ts`, pinned by a type-level spec and a deterministic twin per property.

```ts
type AttemptOutcome =
  | { kind: 'transport' }
  | { kind: 'grant-refused'; nodeId: string }
  | { kind: 'refused'; status: number; retryAt?: Date; quotaExhausted?: boolean }
  | { kind: 'stream-error'; beforeCommit: boolean; errorType: string }
  | { kind: 'answered' };
type Disposition = 'next-child' | 'answer-caller' | 'committed';
```

Rows: `transport` is always `next-child`. `grant-refused` is `next-child` and cools its node. `refused` with 408, 500, 502, 503, 504, 529, or a rate-limit 429 is `next-child`, with `retryAt` from `Retry-After` (delay-seconds or HTTP-date, both parsed) or the anthropic reset headers. A 429 whose body says quota or billing, plus 400, 401 after one refresh, 403, 404, 413, 422, context length, invalid tool schema, and thinking signature, is `answer-caller`, forwarded byte-identical. `stream-error` maps its error type through the same rows when `beforeCommit`, else `committed`.

#2189's no-status failure is unmissable by construction: upstream's bug was a status allowlist a status-less failure matched nothing in. Here classification consumes a sum type; a thrown fetch, a null body, an empty stream, and a reset all construct the `transport` arm before any status logic runs, and exhaustiveness is compiler-checked. `reachedUpstream`'s catch-and-null (`gateway-proxy.ts:256`) becomes construct-the-transport-outcome. Inputs reuse `plugin-abi.ts` `{retryable, httpStatus}` and `codex-errors.ts` `retryAfterSeconds`.

## 4. Round-robin and stateful continuations

Rule: a chained turn never rotates, under either mode. The guard sits in the walk above mode selection, because #3189 is failover-shaped poisoning (reselection after cooling), not a round-robin bug.

Detection at the crossing: `previous_response_id` on the responses dialect, or replayed encrypted reasoning and thinking signatures on anthropic. Mechanism: a bounded in-memory LRU from minted `response_id` to serving `nodeId`, written per answered attempt. An eligible hit serves that child; a cooling hit or a miss (restart, eviction) answers a typed `broken-continuation` refusal naming the router and telling the caller to start a fresh thread.

Defense: ignoring reproduces #2594 and #3189 verbatim. Refusing always ships round-robin dead for Codex CLI, which chains every turn. Pin-with-legible-refusal keeps the mode alive, and the map cannot poison because its failure modes are refusals, never guesses: a miss refuses, a restart flushes to refusals. The state #3317 warns about reroutes; this state only narrows to one child or stops. Cost admitted: the LRU prebuilds a corner of sticky routing (#45), and the refusal needs a spec delta and maintainer signoff.

## 5. Legibility

The exhausted-router refusal, a new `TranslationRefusal` arm in `packages/engine/src/refusals.ts`:

```ts
{
  reason: 'exhausted-router';
  routerId: string;
  attempts: { nodeId: string; providerModel: string; outcome: string; retryAt?: string }[];
  earliestRetryAt?: string;
}
```

Rendered as 429 with a delay-seconds `Retry-After` when every child carries a retryAt, else 502; the body enumerates every child and its reason. That closes #27823 (typed wait, not prose) and #17729 (never "no fallback for the fallback") by shape.

Every attempt, failed or answering, writes a log row: `logRowSchema` already carries `accountId` and `providerModel`; add `nodeId` and the outcome class. `NoteTraffic` gains target identity so the canvas paints per cable: one request touching two targets flashes the failed child's cable in the failure tint with its outcome label while the answering child's pulses success, and a cooling card counts down from its retryAt. The canvas then tells #3317's real story, one card cooling while siblings serve, not a pool-wide mystery.

## Build order

1. `attempt-outcome.ts` table, pure, properties with deterministic twins.
2. Contracts: graph, `nodeId`, v3 migration, acyclicity, type specs.
3. Protocol seam: `nodeId` on the spend request and grant resolver; target identity on traffic and log rows.
4. The walk: commit latch, visited set, per-child grants, empty-router and exhausted-router refusals.
5. Continuation guard and `broken-continuation` refusal, after the spec delta lands.
6. Canvas: router node, cooling badge, per-cable attempt painting.

## Proof scenarios

- #2189: upstream closes the socket before any byte, no status; the second child answers.
- #2594: turn two carries a `previous_response_id` minted by child A; A serves it; after eviction the caller gets `broken-continuation`, never child B.
- #3189: a replayed encrypted-reasoning turn under failover while its child cools; typed refusal, no reselection.
- #3317: child A 401s after one refresh; A cools alone while B serves the same request; both failing yields the enumerated refusal.
- #7091: nested routers over shared leaves; property: attempts never exceed min(leaves, 8), no leaf repeats.
- #17729, #27823: every child cooling; one refusal naming each child, typed earliest retryAt, `Retry-After` header.
- #26015: mid-stream 429 after the first downstream byte, healthy sibling available; error forwarded verbatim, stream closed, no second attempt.

## Self-scores

- Shipping speed: 6. The commit latch, continuation guard, and spec delta are scope the minimum spec never asked for.
- Correctness risk: 9. The design is the defect list; the residue is the zod spike and latch plumbing.
- Migration safety: 8. A single-node wrap with canonical ids; the recursive-schema spike is the shared risk.
- Future-mode fit: 7. `nodeId` keying and the outcome type serve weighted, quota-aware, and latency modes; the LRU may collide with sticky's eventual design (#45).
- Test cost: 5. Streaming latch tests, graph properties with twins, and seven defect scenarios are this angle's bill.
