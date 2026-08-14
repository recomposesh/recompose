# Session spikes

Two open questions the discovery arms flagged, resolved in the session by running the code rather than by reading about it. The scratch file was deleted after the run.

## The zod recursion spike

Ran against the pinned `zod` 4.4.3 in `packages/contracts`, with a router node whose `children` getter returns an array of the recursive union.

**`z.discriminatedUnion` fails on this repository's version.** The defect the technical research cites against 4.3.6 reproduces unchanged: `tsc --noEmit` raised ts7023 on the getter, ts7022 on the union constant, ts2615 on the circular mapped-type property, and ts2345 because the router variant no longer satisfies `$ZodTypeDiscriminable`. Annotating the variant does not rescue it, since `z.ZodType<T>` is not a discriminable type.

**`z.union` with a hand-written recursive type passes.** The working shape:

```ts
type RouterNode = { kind: 'router'; mode: RouterMode; children: Routable[] };
type Routable = TargetNode | RouterNode;

const routerNodeSchema: z.ZodType<RouterNode> = z.strictObject({
  kind: z.literal('router'),
  mode: routerModeSchema,
  get children() {
    return z.array(routableSchema).min(1);
  },
});

const routableSchema: z.ZodType<Routable> = z.union([targetNodeSchema, routerNodeSchema]);
```

`tsc --noEmit` passes clean across the package. At runtime the schema parses a two-level graph, refuses an empty `children` array, and refuses an unknown mode.

Cost of the fallback: no discriminator short-circuit, so a parse failure reports against every variant instead of the matching one, and the type is hand-written rather than inferred. That is what makes the `*.test-d.ts` load-bearing here rather than decorative.

## The flat table restores the discriminated union

A second spike ran after the solution design proposed the id-keyed table, because the table's whole claim is that it escapes the defect above. It does. With children held as string references, nothing recurses, so `z.discriminatedUnion('kind', ...)` typechecks clean across the package and the `z.union` fallback is unnecessary.

The `superRefine` walk was exercised at runtime too. It parses a two-level graph, and it refuses a node naming itself, a child that names a missing node, and a node reached from two parents. The walk is iterative, so no input reaches the stack limit the next section records.

## Cyclic input crashes the parse

Feeding the same schema a value whose `children` array contains the node itself raises `RangeError: Maximum call stack size exceeded`. Zod's own documentation warns of the infinite loop; this confirms it as a crash rather than a slow parse.

Where it can and cannot reach:

- **Not from disk.** A stored gateway document is JSON, and `JSON.parse` cannot produce a cycle. `loadGatewayConfig` is safe from this by construction.
- **From the renderer.** Electron IPC carries structured clone, which preserves cycles, so `gateways:save` and `gateways:update` are the reachable path. A canvas bug, not an attacker, is the realistic source.

The cheap guard bounds the recursion rather than searching for cycles: a maximum nesting depth refuses at the cap, so a cyclic value refuses instead of exhausting the stack. The same bound answers the attempt-budget requirement the technical research asks for, since depth times children caps how many targets one request can touch.

## AIMock answers both verifications the design deferred

The router design put two checks on AIMock before merge. Both ran against `@copilotkit/aimock` 1.38.0 in a scratch install, driving `LLMock` on an ephemeral port and reading the responses.

- **A 429 carries `Retry-After`.** `nextRequestError(429, ...)` answers `429` with `retry-after: 1`. The header isn't accidental: `ErrorResponseOptions.retryAfter` is typed and documented as "Override the Retry-After header value (seconds). Default: 1. Only applied on 429."
- **The 400 malformed shape matches.** It answers `{"type":"error","error":{"type":"invalid_request_error","message":"..."}}`, which is the Anthropic error envelope the classification table reads. A 529 answers the same shape with `overloaded_error`, so the retryable row has its overload case too.

One constraint the docs don't state: `nextRequestError(status, errorBody?)` takes no retry time, so the header always reads 1 second through that path. A scenario that needs a named retry time, such as the exhausted refusal carrying the earliest cooldown, drives `mount()` with a handler calling `writeErrorResponse(res, 429, body, { retryAfter })` instead.

## Two gaps the acceptance-references arm left open

**A downstream `/v1/responses` route exists.** `packages/engine/src/gateway-route-paths.ts:9` registers `/v1/responses` and `/responses` in `MODEL_ROUTES`, and `packages/engine/src/dialect/responses-request-options.ts:7` reads and forwards `previous_response_id`. So the stateful-continuation criterion is live rather than conditional: a Codex client chaining turns through this gateway is the exact configuration that broke on the pinned upstream.

**The refusal envelope is a rendered union, and it carries no headers.** `packages/engine/src/refusals.ts` holds `TranslationRefusal` as a discriminated union of reasons, and `renderRefusal(dialect, refusal)` returns `RenderedRefusal`, which `packages/engine/src/refusal-wire.ts:43` defines as `{status, body}`. Adding an empty-router and an exhausted-router reason is a two-arm extension of an established pattern. Carrying `Retry-After` on the exhausted-router refusal is not: `RenderedRefusal` has no header slot, so either that type widens or the header is set where the refusal becomes a `Response`.
