## Discovery brief: gateway routers (`openspec/changes/gateway-routers`, tier full)

### Scope and what I hold

Read from disk: the change's `proposal.md` and `specs/routers/spec.md`, `docs/adr/0081-router-engine-parity-is-deferred-with-a-source-map.md`, `packages/contracts/src/gateway-config.ts`, `packages/contracts/src/engine-protocol.ts`, `packages/engine/src/gateway-request-crossing.ts`, `packages/engine/src/refusals.ts`, `apps/desktop/src/main/engine-host/engine-spend.ts`, and the earlier brief at `openspec/changes/archive/2026-08-08-gateway-virtual-models/discovery/technical-research.md`. That earlier brief already covers alias prior art, the Claude Code gateway protocol contract, attribution headers, and weighted round-robin, so this one does not repeat it; treat the two as a pair.

Pinned versions in the tree: `zod` 4.4.3 (`packages/contracts/package.json:16`), `hono` 4.12.32 (`packages/engine/package.json:19`), `@xyflow/react` 12.11.2 (`apps/desktop/package.json:51`).

Stated gaps: I did not open `apps/desktop/src/renderer/src/pages/gateway-canvas/lib/tidy-layout.ts` or the inspector, so the canvas cost below is inferred from the node-kind union and file names rather than read line by line; and I did not confirm whether zod 4.4.3 fixes the recursive discriminated-union inference defect reported against 4.3.6 (see finding 2), which wants a ten-minute type spike before the contracts task is estimated.

---

### 1. The shape is prior art, not invention, and the two shipped modes match the field

Nesting a strategy inside a strategy is a shipped feature elsewhere, so the recursive child (a child is a target or another router) needs no defence in the design doc. Portkey's config object nests `fallback` inside `loadbalance` and the reverse, and its own cookbook walks the exact "load balance across accounts, each rung falling back" case this feature will get asked for ([Portkey config object](https://docs.portkey.ai/docs/api-reference/config-object), [Portkey cookbook](https://github.com/Portkey-AI/portkey-cookbook/blob/main/ai-gateway/resilient-loadbalancing-with-failure-mitigating-fallbacks.md)). Envoy AI Gateway expresses failover as a prioritized `backendRefs` list where `priority: 0` is primary and the retry policy decides when the next rung runs ([provider fallback](https://aigateway.envoyproxy.io/docs/0.4/capabilities/traffic/provider-fallback/)). LiteLLM keeps cooldown per deployment rather than per group and documents `simple-shuffle` as its default and recommended strategy ([LiteLLM routing](https://docs.litellm.ai/docs/routing)).

Two things the prior art says that the current spec does not yet:

- Envoy AI Gateway ties fallback to an explicit retry policy object rather than to an implicit rule. The spec's "retryable outcome" is doing that job; name the classification in one place (finding 4) so it is one table rather than a rule per provider.
- Nobody in the field lets a ladder walk forever. OpenRouter walks its `models[]` list once, and Envoy caps by retry count. The spec has no attempt cap. Recommend adding one requirement: a router attempts each eligible child at most once per request, and a nested chain attempts at most N targets total, so a five-deep chain over twenty accounts cannot turn one client request into twenty upstream calls.

### 2. Contracts: the recursive schema has a known zod hazard, and the migration slot already exists

`packages/contracts/src/gateway-config.ts` holds `GATEWAY_CONFIG_VERSION = 2`, a flat `targetSchema` of `{accountId, providerModel}`, `virtualModelSchema` with a required single `target`, and a `gatewayConfigMigrations` array already wired through `migrateDocument`. The v2 to v3 migration is therefore a one-entry addition of the same shape as the existing `from: 1` entry, wrapping the stored target into a single-child graph or leaving a direct target arm in the union.

The hazard is the schema itself. Zod 4 defines recursion with getters rather than `z.lazy` ([Zod API, recursive objects](https://zod.dev/api?id=recursive-objects)), but `z.discriminatedUnion` eagerly resolves every variant shape, so a mutually recursive getter union infers `any` and raises ts7022/ts2615. That is open as [colinhacks/zod#5991](https://github.com/colinhacks/zod/issues/5991) (opened 2026-05-13, reported against zod 4.3.6 with TypeScript 5.9.3); the earlier [#4264](https://github.com/colinhacks/zod/issues/4264) (2025-04-23, closed) is the runtime "Cannot access before initialization" form of the same collision. The workaround in both threads is `z.union` in place of `z.discriminatedUnion`, paying a parse-time cost and losing the discriminator short-circuit.

Recommendation: spike the getter form with `z.discriminatedUnion` on 4.4.3 first, since the repository is a minor ahead of the reported version, and fall back to `z.union` with a hand-written recursive type if inference collapses. Either way the router node type is load-bearing and derived, so it earns a `*.test-d.ts` spec under the house rule, and the spike's outcome belongs in the ADR's Alternatives section rather than in a comment.

Zod also warns that "passing cyclical data into Zod will cause an infinite loop" ([same page](https://zod.dev/api?id=recursive-objects)). That converts ADR-0081's rule 3 from a nicety into a safety requirement: acyclicity must be checked in contracts before or during parse, not only on the canvas. Since the stored shape is a tree with a single parent per child rather than a free graph, the cheapest guard is a node-id uniqueness plus visited-set walk at load, not a general cycle search.

### 3. The seam this feature must cut: the child never learns which account it is spending

This is the largest finding and the one most likely to be missed in planning.

`packages/contracts/src/engine-protocol.ts` gives the child a credential-free virtual model: `engineVirtualModelSchema` carries `target` as a two-arm union of `{standing: 'bound', providerModel}` and `{standing: 'removed'}`. `packages/contracts/src/engine-protocol.test-d.ts:144` pins `keyof EngineVirtualModel` to exactly `'id' | 'displayName' | 'target'`, and line 152 asserts the type has no `accountId`. The child asks for custody per turn with `engineSpendRequestSchema`, which carries only `{slug, virtualModel}`, and `apps/desktop/src/main/engine-host/engine-spend.ts:3` types the resolver as `SpendGrantFor = (slug: string, virtualModel: string) => Promise<SpendGrant>`.

So today the parent picks the account, and the child cannot. A router inverts that: the child must choose a child node, then ask for custody of that specific choice, then possibly ask again for the next one. Three consequences:

1. `EngineSpendRequest` grows a target identity, and `SpendGrantFor` grows a third argument. Both are contract changes with type specs attached.
2. The graph crossing to the child needs stable per-node identity. Two options. Carry opaque node ids and keep `accountId` in the parent, which preserves the existing type spec and the ADR-0081 rule 4 custody boundary; or carry `accountId` into the engine, which contradicts `engine-protocol.test-d.ts:152` and widens what a compromised child can enumerate. Recommend opaque node ids. `accountId` is not a credential, but the assertion exists as a boundary marker and there is no behaviour that needs it broken.
3. `SpendGrant` already has a `missing-credential` arm. Under a router, a missing credential on one child is a retryable, per-child condition rather than a request-ending one, so the failover walk must treat a grant refusal as an attempt outcome, not as a terminal answer. ADR-0081 rule 7 (refresh an unauthorized subscription target once before deciding) lives at this same seam.

Also note the fan-out: `gateway.virtualModels.find(...)` followed by a read of `.target` appears in at least seven engine call sites, including `packages/engine/src/gateway-request-crossing.ts:42`, `gateway-count-tokens.ts:117`, `gateway-images.ts:165`, `gateway-videos.ts:46`, `gateway-codex-compact.ts:71`, `gateway-codex-alpha-search.ts:30`, and `provider/xai-websocket-prepare.ts:33`. Each of those resolves a single `providerModel` today. A router turns "read the target" into "choose a target", so either every site routes or the non-serving sites (token counting, image and video paths, compaction) need a documented rule for which child they resolve against. Deciding that once, in the design, is cheaper than seven ad hoc answers.

### 4. Failover triggers: the classification already half exists in this repository

The spec's split of "retryable outcome" against "request-scoped outcome" matches the settled field taxonomy: retry on 429, 500, 502, 503, 504, and Anthropic's 529 overloaded, never on a malformed 400, context length, or invalid tool schema (ADR-0081 rule 8 says the same, and the earlier brief cites Anthropic's error table and Portkey's `on_status_codes` default of `[429, 500, 502, 503, 504]`).

Two existing pieces to reuse rather than reinvent:

- `packages/engine/src/plugin-abi.ts:27` already normalizes a plugin error to `{retryable: boolean, httpStatus: number}` and parses `http_status` off the wire at line 54. That is the vocabulary the router wants for every transport, not only plugins.
- The subscription path already turns a provider usage limit into a 429 carrying `Retry-After` (`packages/engine/src/gateway-proxy-codex-subscription.test.ts:254` asserts exactly that, and `gateway-proxy-antigravity.test.ts:140` covers a rate-limit body with a reset delay). ADR-0081 permits normalizing those signals now while forbidding acting on them; this feature is the consumer that unblocks them.

One parsing trap worth a scenario: RFC 9110 section 10.2.3 defines `Retry-After` as `HTTP-date / delay-seconds`, so the value is either an integer or an absolute date, and treating it as always-seconds is the common bug ([MDN Retry-After](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Retry-After)). The cooldown clock must accept both forms.

### 5. Cooldown: keep the spec's refusal, but carry the retry time

The spec says every child cooling produces a typed refusal naming the exhausted router rather than picking one anyway. That is a deliberate divergence from Envoy, whose panic threshold defaults to 50 percent and, once healthy hosts fall below it, disregards health and sends traffic to all hosts anyway to stop failure cascading ([Envoy panic threshold](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/load_balancing/panic_threshold), [outlier detection](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/outlier)). Envoy's own escape hatch is that a 0 percent threshold never panics and returns "503 no healthy upstream" instead, which is precisely the recompose behaviour. Recommend keeping the refusal and recording the divergence in the ADR: a cooling account here means a real provider rate limit on a named credential, not a probabilistically unhealthy replica, so spraying at it wastes the user's quota rather than saving the cluster.

The refusal should carry the retry time. LiteLLM shipped this exact repair: [BerriAI/litellm#27823](https://github.com/BerriAI/litellm/issues/27823) (opened 2026-05-13, closed via PR #30098) reports that when every deployment is cooling the router returns 429 with the wait only in the message text, forcing clients to string-parse, and the fix lifts `cooldown_time` onto a `Retry-After` header. The upstream reference ADR-0081 pins does the same thing internally: its scheduler holds a `cooldownQueue` ordered by `nextRetryAt` and synthesizes a `modelCooldownError` carrying the earliest `nextRetryAt` when every candidate is cooling ([CLIProxyAPI `sdk/cliproxy/auth/scheduler.go` at the pinned commit](https://github.com/router-for-me/CLIProxyAPI/blob/8392b180ce3789eba9fd06ebc812b4fc237876e1/sdk/cliproxy/auth/scheduler.go)). So the exhausted-router refusal should name the router and carry the earliest cooldown expiry, as a header and as a typed field.

Cooldown duration numbers to argue from: LiteLLM defaults to `allowed_fails: 3` per minute and `cooldown_time: 5` seconds, with a per-error-type `AllowedFailsPolicy` ([LiteLLM routing](https://docs.litellm.ai/docs/routing)); Envoy escalates `base_ejection_time` by the ejection count. Recommend: no failure counting for the first release. A provider-stated `Retry-After` sets the cooldown exactly, and a failure without one gets a single fixed cooldown. Counting thresholds are the extension, not the requirement (YAGNI), and the spec asks for none.

### 6. Round-robin: decide where the cursor lives and whether skipping advances it

The upstream reference advances a cursor as `(start + offset) % len(flat)` over a filtered ready view, keys the cursor per priority bucket for a single provider and per a `provider1,provider2:modelKey` string for mixed ones, and filters ineligible candidates through a predicate before selection rather than after ([scheduler.go, pinned commit](https://github.com/router-for-me/CLIProxyAPI/blob/8392b180ce3789eba9fd06ebc812b4fc237876e1/sdk/cliproxy/auth/scheduler.go)). Two decisions fall out that the spec leaves open:

- Cursor key. ADR-0081 rule 6 already answers it: key by the resolved router chain and target identity, never by the client alias. Write it into the spec so a second virtual model pointing at the same router does not share or reset the other's rotation by accident.
- Skip semantics. Filtering before selection (upstream's approach) means a cooling child does not consume its turn, so the remaining children still alternate evenly. Filtering after means a cooling child wastes a slot. The spec's "spreads eligible requests evenly" wording implies filter-first; make it explicit, because it is the difference between two live targets alternating and one target taking two in a row.
- Cursor durability. Nothing in the spec says the rotation survives an engine restart. Recommend explicitly that it does not, since the engine child is a `utilityProcess` and a fresh cursor costs one uneven request.

Cost to state in the design: round-robin across accounts destroys prompt-cache reuse, which for Claude Code traffic dominates cost. The earlier brief already sourced this ([LiteLLM#6784](https://github.com/BerriAI/litellm/issues/6784) and the KV-cache routing literature) and noted `x-claude-code-session-id` as a free affinity key. Sticky routing is issue #45 and out of scope, but the round-robin node's inspector copy should say what it trades.

### 7. Streaming boundary and request replay

The spec's "no second child once streaming has begun" is the right rule and matches the Claude Code gateway protocol's no-buffering requirement cited in the earlier brief. The good news from the code: replay costs nothing. `packages/engine/src/gateway-request-crossing.ts:39` already reads the body with `readJsonBody(c)` into a plain object and builds `crossing.raw` from it, so a second attempt re-serializes a value the process already holds. There is no consumed-once stream to clone, which is the usual failover blocker on `fetch`-based proxies.

What still needs a named boundary is the response side: the router must commit at the moment the first byte is forwarded downstream, not at the moment the upstream response object arrives. An upstream that answers 200 and then emits an in-band SSE `error` event is retryable up to the first forwarded byte and terminal after it. That seam has shipped bugs in vendor SDKs ([anthropic-sdk-python#1258](https://github.com/anthropics/anthropic-sdk-python/issues/1258)), so it earns a dedicated spec scenario, which the change already has.

### 8. Attribution: the log row is ready, the traffic report is not

`packages/contracts/src/engine-logs.ts:56` already carries optional `accountId` and `providerModel` on `logRowSchema`, so per-attempt rows can name which target answered without a contract change. `packages/engine/src/gateway-traffic.ts:24` types `NoteTraffic = (slug, virtualModel, request) => void`, which keys the canvas cable state to the virtual model only. With a router, one request can touch two targets with two different outcomes, so the traffic report needs the target identity or the canvas cannot light the rung that failed and the rung that answered. Treat this as a required contract change, not a follow-up: the canvas is in scope per the proposal.

The renderer's node union in `apps/desktop/src/renderer/src/pages/gateway-canvas/lib/node-graph.ts:19` currently spans `gateway`, `virtual-model`, and `target`, and `lib/log-scope.ts:7` mirrors those three as log subjects. A `router` kind adds a fourth to both, plus a variable-depth layout in `lib/tidy-layout.ts` where the tree is currently three levels.

For the canvas cycle guard, `@xyflow/react` 12.11.2 ships the recipe: `isValidConnection` plus `getOutgoers` with a depth-first walk that rejects a connection whose source is already reachable from its target ([React Flow prevent cycles](https://reactflow.dev/examples/interaction/prevent-cycles)). Use it, and still validate acyclicity in contracts, because the engine loads a document no canvas guarded (ADR-0081 rule 3, and finding 2's infinite-loop warning).

### 9. Libraries: build the two policies, and here is why the credible candidates lose

No new runtime dependency is justified for this slice.

- `cockatiel` 3.2.1 and `opossum` 9.0.0 are the two real Node resilience candidates ([cockatiel on npm](https://www.npmjs.com/package/cockatiel), [opossum](https://github.com/nodeshift/opossum)). Both model resilience around one call to one resource: a breaker wraps a function, a retry policy re-runs it. Neither owns "choose among N named children, each with its own cooldown, and tell the canvas which one is cooling". Wrapping one child each would leave the selection, the cursor, and the exhausted-router refusal to be written anyway, and would put the health state inside a library object rather than in a value the IPC snapshot can carry to the renderer.
- `@portkey-ai/gateway` remains the only off-the-shelf config match and remains unverified for license and embeddability, exactly as the earlier brief recorded. Nothing this session changed that.
- The two shipped modes are small: failover is a fold over a list with an outcome classifier, round-robin is a modulo over a filtered list. ADR-0081 rule 5 already orders them as pure policy functions before any mutable runtime state, which is also what makes them property-testable with a deterministic twin per the house mutation rule.

### 10. Recommendation, in the order I would build it

1. Pure policy functions in the engine over an in-memory child list, with the outcome classifier as their only input vocabulary (`{retryable, requestScoped, streamCommitted}` plus an optional retry time). No IO, no schema, no canvas. This is ADR-0081 rule 5 and it is where the property tests live.
2. Contracts: the recursive router node, the v2 to v3 migration entry beside the existing one in `packages/contracts/src/gateway-config.ts`, the acyclicity and node-id uniqueness guard, and a `*.test-d.ts` recording whichever union form survives the zod spike.
3. The protocol seam: target identity on `EngineSpendRequest`, the third argument on `SpendGrantFor`, and target identity on the traffic report. Do this before the serving path, because every later task depends on the shape.
4. Serving path: the attempt loop, the stream-commit boundary, and the two new refusals (empty router, exhausted router with its earliest retry time).
5. Canvas and inspector: the fourth node kind, the mode pill, the `isValidConnection` cycle guard, the variable-depth layout.

### Where the evidence is thin or conflicting

- Zod 4.4.3 against the open inference defect reported at 4.3.6 is unverified. Spike it; do not plan around either outcome.
- The upstream scheduler I read is the commit ADR-0081 pinned (v7.2.121). The repository's parity work has since resynced to a later upstream version, so the pinned scheduler may no longer match upstream head. ADR-0081 names this drift as a risk and requires a fresh audit rather than mixing revisions. I did not run that audit here.
- Envoy's panic threshold and the spec's refusal genuinely disagree about what to do when everything is unhealthy. I recommend the spec's answer, with the reasoning above written into the ADR, rather than presenting the field as unanimous.
- Cooldown durations in the field are configuration defaults, not measured optima. LiteLLM's five seconds and Envoy's thirty are chosen for replica fleets, not for a person's metered account. Prefer the provider's own `Retry-After` wherever one arrives, and treat any fixed number the project picks as a decision to record, not a number to cite.

Sources:

- [Zod API, recursive objects](https://zod.dev/api?id=recursive-objects)
- [colinhacks/zod#5991, discriminatedUnion breaks inference for recursive getter schemas (open, 2026-05-13)](https://github.com/colinhacks/zod/issues/5991)
- [colinhacks/zod#4264, v4 recursive types with discriminated unions (closed, 2025-04-23)](https://github.com/colinhacks/zod/issues/4264)
- [Portkey gateway config object](https://docs.portkey.ai/docs/api-reference/config-object)
- [Portkey cookbook, resilient load balancing with fallbacks](https://github.com/Portkey-AI/portkey-cookbook/blob/main/ai-gateway/resilient-loadbalancing-with-failure-mitigating-fallbacks.md)
- [Envoy AI Gateway provider fallback](https://aigateway.envoyproxy.io/docs/0.4/capabilities/traffic/provider-fallback/)
- [LiteLLM router, strategies and cooldowns](https://docs.litellm.ai/docs/routing)
- [BerriAI/litellm#27823, no Retry-After when all deployments cool](https://github.com/BerriAI/litellm/issues/27823)
- [BerriAI/litellm#6784, round-robin against prompt caching](https://github.com/BerriAI/litellm/issues/6784)
- [Envoy panic threshold](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/load_balancing/panic_threshold)
- [Envoy outlier detection](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/outlier)
- [CLIProxyAPI scheduler at the ADR-0081 pinned commit](https://github.com/router-for-me/CLIProxyAPI/blob/8392b180ce3789eba9fd06ebc812b4fc237876e1/sdk/cliproxy/auth/scheduler.go)
- [MDN Retry-After, RFC 9110 section 10.2.3 forms](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Retry-After)
- [React Flow prevent cycles example](https://reactflow.dev/examples/interaction/prevent-cycles)
- [cockatiel on npm](https://www.npmjs.com/package/cockatiel)
- [opossum](https://github.com/nodeshift/opossum)
- [anthropic-sdk-python#1258, mid-stream SSE error status](https://github.com/anthropics/anthropic-sdk-python/issues/1258)
