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

## Cyclic input crashes the parse

Feeding the same schema a value whose `children` array contains the node itself raises `RangeError: Maximum call stack size exceeded`. Zod's own documentation warns of the infinite loop; this confirms it as a crash rather than a slow parse.

Where it can and cannot reach:

- **Not from disk.** A stored gateway document is JSON, and `JSON.parse` cannot produce a cycle. `loadGatewayConfig` is safe from this by construction.
- **From the renderer.** Electron IPC carries structured clone, which preserves cycles, so `gateways:save` and `gateways:update` are the reachable path. A canvas bug, not an attacker, is the realistic source.

The cheap guard bounds the recursion rather than searching for cycles: a maximum nesting depth refuses at the cap, so a cyclic value refuses instead of exhausting the stack. The same bound answers the attempt-budget requirement the technical research asks for, since depth times children caps how many targets one request can touch.

## Two gaps the acceptance-references arm left open

**A downstream `/v1/responses` route exists.** `packages/engine/src/gateway-route-paths.ts:9` registers `/v1/responses` and `/responses` in `MODEL_ROUTES`, and `packages/engine/src/dialect/responses-request-options.ts:7` reads and forwards `previous_response_id`. So the stateful-continuation criterion is live rather than conditional: a Codex client chaining turns through this gateway is the exact configuration that broke on the pinned upstream.

**The refusal envelope is a rendered union, and it carries no headers.** `packages/engine/src/refusals.ts` holds `TranslationRefusal` as a discriminated union of reasons, and `renderRefusal(dialect, refusal)` returns `RenderedRefusal`, which `packages/engine/src/refusal-wire.ts:43` defines as `{status, body}`. Adding an empty-router and an exhausted-router reason is a two-arm extension of an established pattern. Carrying `Retry-After` on the exhausted-router refusal is not: `RenderedRefusal` has no header slot, so either that type widens or the header is set where the refusal becomes a `Response`.
