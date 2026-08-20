## Technical research brief: conditional router (openspec/changes/conditional-router, tier full)

Scope covered: prior art for LLM-judged routing in gateway products, the standard for forcing a one-label answer out of a model, the standard for a mandatory default branch, stickiness precedent, and the security exposure. Every repository claim below was read on local disk; every third-party claim carries a link.

---

### 1. The three locked decisions each have official prior art. None of them is novel.

**Routing as a workflow pattern.** Anthropic's own engineering guide names "routing" as one of five workflow patterns: "Routing classifies an input and directs it to a specialized followup task," and it works "where classification can be handled accurately, either by an LLM or a more traditional classification model." Their worked example is exactly this feature's pitch: "Routing easy/common questions to smaller, cost-efficient models like Claude Haiku 4.5 and hard/unusual questions to more capable models." ([Anthropic, Building Effective AI Agents](https://www.anthropic.com/engineering/building-effective-agents))

**The same feature in the same product category.** LiteLLM's Auto Router ships an LLM-classifier mode: a small model (their example is `claude-haiku-4-5-20251001`) called with structured output, `timeout_ms: 2000`, and a `classifier_fallback` setting for when the classifier times out, errors, returns nothing, or names a tier that is not configured. It also ships `session_affinity: true` with `session_affinity_ttl_seconds: 3600`, which "pins the first turn's model choice for the session, skipping reclassification on subsequent turns" to preserve prompt caches. ([LiteLLM Auto Routing](https://docs.litellm.ai/docs/proxy/auto_routing), [Auto Router v2 blog](https://docs.litellm.ai/blog/autorouter-v2))

**Stickiness by message fingerprint is the shipped norm, not an invention.** OpenRouter's Auto Router "remembers the model a conversation landed on and prefers it on later turns," identifying the conversation "from an explicit `session_id`, or from a fingerprint of your messages if you don't send one." It also states the else-branch principle verbatim: "If classification or rankings are ever unavailable, the router degrades gracefully to a default model set. A request never fails because routing infrastructure hiccuped." ([OpenRouter Auto Router docs](https://openrouter.ai/docs/guides/routing/routers/auto-router)) OpenAI's prompt-caching guide describes the same fingerprint mechanic from the provider side: requests route to an inference engine on "a hash of the first ~256 tokens of the prompt," combined with `prompt_cache_key` to increase routing stickiness, and one customer's hit rate moved from 60% to 87% once they set the key. ([OpenAI prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching))

**The word "conditional" and the mandatory default.** Portkey's gateway already uses `strategy.mode: "conditional"` with an ordered `conditions` array and a `default` target for when nothing matches, and warns that condition order is significant. ([Portkey Conditional Routing](https://portkey.ai/docs/product/ai-gateway/conditional-routing)) Note the difference worth stating in the ADR: Portkey's conditions read request metadata, not the request content, so recompose's judge-driven variant is a superset rather than a copy.

**Precedent for making the else branch impossible to delete.** Two designs bracket the choice. n8n's Text Classifier makes the no-match branch opt-in: "When No Clear Match" defaults to "Discard Item," with "Output on Extra, 'Other' Branch" as the alternative. ([n8n Text Classifier](https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.text-classifier)) Amazon States Language makes `Default` optional on a Choice state and punishes its absence at runtime with a `States.NoChoiceMatched` error. ([Amazon States Language spec](https://states-language.net/spec.html), [AWS Step Functions ASL docs](https://docs.aws.amazon.com/step-functions/latest/dg/concepts-amazon-states-language.html)) The spec's mandatory else is the strictest of the three and the only one that cannot produce a dropped request, so it is defensible on the record. Recommendation: model else as its own named field on the policy (Portkey's `default`) rather than "the last child," so the Zod schema enforces its presence and no edit can remove it.

---

### 2. Forcing exactly one branch label is a solved, per-dialect problem. Use enum-constrained decode, not prompt discipline.

The spec requires "the judge MUST answer with exactly one branch label" with one retry. Every major dialect now offers a hard constraint, but each spells it differently, and recompose owns all three encoders already.

| Dialect                             | Mechanism                                                                                                                                   | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OpenAI Chat Completions / Responses | `response_format: { type: "json_schema", ... strict: true }` with a single string property carrying `enum`                                  | Docs state the model will not "hallucinate an invalid enum value" under strict mode ([OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs))                                                                                                                                                                                                                                                                        |
| Anthropic Messages                  | `output_config.format` with `type: "json_schema"`. Now GA; the `structured-outputs-2025-11-13` beta header is deprecated but still accepted | Two constraints that matter here: first use pays a grammar-compilation latency penalty, compiled grammars are cached 24 hours and invalidate on schema change, and an extra system prompt is injected. Complex types in enums are disallowed, plain string enums are fine ([Anthropic structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs))                                                                       |
| Gemini                              | `response_mime_type: "text/x.enum"` plus a `STRING` schema with an `Enum` array                                                             | Tightest fit for this feature: the response is a bare label, no JSON to parse, and the docs present it as the classification mode. Practical ceiling reported around 120 enum values ([Gemini structured outputs](https://ai.google.dev/gemini-api/docs/structured-output), [Vertex controlled generation with enum](https://cloud.google.com/vertex-ai/generative-ai/docs/samples/generativeaionvertexai-gemini-controlled-generation-response-schema-4)) |
| Anthropic fallback                  | `tool_choice: {"type": "tool", "name": ...}` forces one specific tool and suppresses any prose before the tool_use block                    | Useful for older models or subscription channels that reject `output_config` ([Claude tool use](https://docs.claude.com/en/docs/agents-and-tools/tool-use/overview))                                                                                                                                                                                                                                                                                       |

Repository bearing: `response_format` handling already exists in `packages/engine/src/dialect/chat-completions-request-options.ts`, `packages/engine/src/dialect/responses-request-options.ts`, and `packages/engine/src/dialect/interactions-request-options.ts`, so the encoders are in place. I found no `output_config` anywhere under `packages/engine/src` (grep for `output_config|output_format|response_format` returns 20 files, none carrying `output_config`), so Anthropic's GA parameter name is not yet modelled. That is a concrete gap the judge work either fills or routes around by using forced tool use on the Anthropic path.

**Design consequence to flag:** the judge binding is "an account plus a provider model," and recompose's accounts include subscription channels (`packages/engine/src/subscription/*`) as well as keyed providers. The constrained-decode mechanism therefore varies by which channel the chosen judge account uses, and some subscription transports may strip or reject these fields. The retry-then-else path in the spec absorbs that, but the inspector should not offer a judge model whose channel cannot constrain output without saying so.

---

### 3. Sharpest finding: the judge binding as written in the proposal breaks a documented invariant in contracts.

`proposal.md` line 7 says `routerPolicySchema` grows a conditional variant "carrying the judge binding (`accountId` plus `providerModel`)". But `packages/contracts/src/engine-routing.ts` mirrors the router policy **whole** into the engine's view of the table (`policy: routerPolicySchema`, line 24) while deliberately stripping account identity from targets. Its docstring is explicit:

> "The stored target names the account paying for it, and that name never crosses the lane. The parent resolves custody per attempt against live storage, so the child holds a route node id and nothing it could spend."

Putting `accountId` inside `routerPolicySchema` puts an account id on the engine side of that boundary, which is the one thing the file exists to prevent. Two ways out:

1. **Recommended: the judge is a route node, referenced by id from the policy.** This matches the spec's own words ("resolved with the same custody, cooling, and health rules as any target"), matches the settled design where the judge is a satellite node on the canvas (screens 0 to 7 in `designs/recompose.pen`, per `BRAINSTORM-NOTES.md`), and makes the cooling requirement free: `packages/engine/src/routing/attempt-walk.ts` keys cooling by `RouteNodeAddress` (`addressOf`, line 73), so a judge with a route node id gets a cooldown entry and the "cooling judge sends the request down else" scenario needs no new machinery.
2. Split the engine mirror so the policy crosses the lane with the judge's account stripped. This costs a second union and breaks "a router mirrors whole," so I would only take it if option 1 proves unworkable.

If option 1 is chosen, four readers must learn that a judge reference is not a routing child, and one of them is a live hazard:

- `packages/contracts/src/gateway-routing.ts`: `childrenOf` (line 92), `inboundReferences` (line 106), and `reachedFromEntry` (line 154). A judge referenced only from `policy` would be reported "unreachable from the entry" by the existing `superRefine`.
- `packages/engine/src/routing/route-table.ts`: `nodesInDeclaredOrder` (line 23) walks `node.children` only. **`firstDeclaredTarget` (line 69) is the hazard**: its docstring says "Counting tokens, drawing an image, and preparing a socket each need one account and one provider model," and they all call it. If a judge node ever enters declared order, token counting can silently bill and query the judge model instead of the serving model. `targetsInDeclaredOrder` also drives the notes in every refusal, so a judge leaking into it would put the judge into user-visible refusal text.

---

### 4. Two questions the spec leaves open in the walk, both cheap to settle now.

**How many judge calls per request?** The requirement says "For each decision the router MUST make one constrained classification call" plus one retry. But `PICK_BY_MODE` is invoked from `stepTheWalkTakesNext` (line 135 of `packages/engine/src/routing/attempt-walk.ts`), which runs once per attempt inside the `while (walking.attempted.size < ATTEMPT_LIMIT)` loop. With `ATTEMPT_LIMIT = 8`, a naive async conditional picker can issue up to eight classification calls for one request when branch children keep failing. Recommendation: memoize the branch decision for the lifetime of one walk, so the classification is at most one call plus one retry per request regardless of how many attempts the walk needs, and a failing branch subtree falls through the existing `ChildCanServe` predicate (`subtreeCanServe`, line 84) to else rather than re-asking the judge.

**What happens to a server-state turn with no remembered branch?** The spec pins the server-state case only for a conversation that already earned a branch. `wouldRotate` (line 122) currently returns a `chained-turn` verdict for round-robin, which is a refusal. For conditional, a refusal contradicts "routing trouble never drops a request." Recommendation for the design phase: an unremembered server-state turn goes to else without a classification call, and `wouldRotate` is renamed to reflect that it now answers for two modes with two different outcomes.

---

### 5. Timeout budget: the repository already has the shape, and 3s is on the generous side of the field.

Convention on disk is a named bound plus `AbortSignal.timeout`: `packages/contracts/src/local-runtimes.ts` holds `runtimeLookBoundMs = 3_000`, `modelListBoundMs = 10_000`, `keyProbeBoundMs = 10_000`, `proxyFetchBoundMs = 600_000`, consumed as `AbortSignal.timeout(keyProbeBoundMs)` in `packages/engine/src/provider/key-probe.ts` and siblings. A `judgeBoundMs` belongs beside them.

For the number itself, LiteLLM's shipped default for the same call is 2000ms ([LiteLLM Auto Routing](https://docs.litellm.ai/docs/proxy/auto_routing)). Secondary sources put LLM-classifier overhead at roughly 200 to 1500ms against milliseconds for embedding routing ([Aurelio semantic-router](https://www.aurelio.ai/semantic-router), [vLLM Semantic Router](https://vllm.ai/blog/2025-09-11-semantic-router)). The brainstorm's ~3s therefore sits above the field's default, which is the right call given Anthropic's documented first-use grammar-compilation penalty inflates the p99 of the very first judged request per schema. **Sources conflict on concrete per-model latency and I am not reporting a number as a finding:** an Artificial Analysis comparison surfaced time-to-first-token near 0.38s for Gemini 2.5 Flash-Lite and 0.98s for Claude Haiku 4.5, but the same result set reported 88 to 102s for GPT-5 nano, which is not a plausible TTFT and reads as a misparsed or reasoning-inclusive figure. Measure the judge path locally rather than citing these.

---

### 6. Security: the judge reads attacker-controlled text, so treat its answer as untrusted input.

The classification call hands the judge "the tail of the request," which is user-controlled, making this OWASP LLM01 territory: a prompt injection that alters model behavior in unintended ways ([OWASP LLM01:2025 Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/), [OWASP Prompt Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html)). The documented attack against routers specifically is steering the decision, either inflating cost by forcing an expensive branch or degrading answers by forcing a cheap one ([survey of prompt injection attacks](https://www.sciencedirect.com/org/science/article/pii/S1546221826001384)).

Three mitigations that cost nothing here and are worth writing into the requirement rather than discovering later: the closed enum means an injected label outside the branch set cannot be honored and lands on else by construction; the branch labels and rules should be clearly delimited from the request tail in the classification prompt, which is the cheat sheet's "separate and clearly denote untrusted content"; and the request tail must not be logged into traffic rows, because the judge prompt would otherwise become a second copy of user content in a new place.

---

### 7. Off-the-shelf check, per the project rule to search for the built-in solution first.

Three candidates exist and all three lose on the same ground.

- **Aurelio semantic-router** (embedding similarity against reference utterances) and **vLLM Semantic Router** solve a different problem: they need reference embeddings, an embedding model, and tuned thresholds ([Aurelio](https://www.aurelio.ai/semantic-router), [vLLM blog](https://vllm.ai/blog/2025-09-11-semantic-router)). The locked V1 scope is user-written natural-language rules, which is precisely the case embeddings handle worst. Worth keeping in the file for the deferred judge-less "rule router" mode, where keyword and embedding matching is the right tool.
- **RouteLLM** routes between a strong and a weak model from learned preference data, not from user-authored branch rules, so it answers a cost question rather than this feature's question ([RouteLLM lineage summarized in the vLLM semantic router papers](https://arxiv.org/pdf/2510.08731)).
- **LiteLLM / Portkey / OpenRouter** ship the feature, but as the gateway. recompose _is_ the gateway, and adopting one would mean handing over the credential custody boundary that `packages/contracts/src/engine-routing.ts` exists to hold. Read them as specification, not as dependency.

No new runtime dependency is warranted. The pieces needed are a per-dialect constrained-output field, one bounded outbound call, and a decision cache. The engine already originates its own credentialed provider calls with per-provider URL shapes in `packages/engine/src/provider/native-token-count.ts` and `packages/engine/src/provider/key-probe.ts`, which is the closest existing pattern for where the judge call should live.

---

### 8. Stickiness storage: the spec names the behavior but not the bounds.

The requirement says a conversation "MUST key each conversation by a fingerprint" and keep its branch, with no word on eviction. An unbounded fingerprint-to-branch map in a long-running desktop process grows without limit. The field's answers: LiteLLM bounds it at `session_affinity_ttl_seconds: 3600`; OpenRouter re-ranks every turn and reuses the remembered pick "only while that model is still one of the top candidates." Anthropic's prompt cache, the thing stickiness protects, has a minimum lifetime of 5 minutes standard or 1 hour extended ([Anthropic prompt caching](https://docs.claude.com/en/docs/build-with-claude/prompt-caching)), so a TTL far beyond an hour buys no cache benefit and only prolongs a stale decision. Recommendation: a bounded, TTL-expiring map keyed the way `RotationCursors` and the cooldown store already key per-router state by `RouteNodeAddress` in `packages/engine/src/routing/`, with the TTL a named constant beside the other bounds.

---

### 9. Naming note

The industry term for this component is "classifier" or "router"; "LLM-as-a-judge" conventionally means output evaluation, not input routing ([Anthropic routing pattern](https://www.anthropic.com/engineering/building-effective-agents), [LiteLLM's `llm-classifier` signal name](https://docs.litellm.ai/docs/proxy/auto_routing)). The design has locked "judge" for the canvas and it reads well on a satellite node, so this is not a request to change it, only a flag that ADR and docs prose should say what the judge does (classifies the request into one branch) so a reader arriving from other tools is not looking for an evaluator.

---

### Recommendation, in order

1. Model the judge as a route node referenced by id from the conditional policy. Keep `accountId` out of `routerPolicySchema`, and extend `childrenOf`, `inboundReferences`, `reachedFromEntry`, and `nodesInDeclaredOrder` to know a judge reference is not a routing child. Guard `firstDeclaredTarget` with a spec that proves token counting never resolves to the judge.
2. Give else its own named field on the policy so Zod enforces it, following Portkey's `default` rather than a positional convention.
3. Constrain the classification with the dialect's own enum mechanism, one string enum of branch labels. Prefer Gemini's `text/x.enum`, OpenAI's strict `json_schema`, Anthropic's `output_config.format` with forced tool use as the fallback for channels that reject it.
4. Memoize the branch decision per walk so `ATTEMPT_LIMIT` cannot multiply judge calls, and add `judgeBoundMs` to `packages/contracts/src/local-runtimes.ts`.
5. Bound the stickiness map with a TTL in the 5-minute to 1-hour range that the provider prompt caches actually reward, keyed like the existing per-router state.
6. Write the injection posture into the requirement: closed enum, delimited untrusted tail, request tail never logged.

### Gaps I am naming rather than filling

- `openspec/changes/conditional-router/manifest.md` went unread inside the read budget, so any constraint stated only there is missing here.
- `designs/recompose.pen` is encrypted and reachable only through the pencil MCP tools, so screens 0 to 7 are cited from `BRAINSTORM-NOTES.md` and the proposal rather than inspected.
- I did not read `packages/engine/src/routing/cooldown-ledger.ts` beyond its exported surface (`CooldownLedger`, `createCooldownLedger`), so whether a cooling entry needs a new reason for "judge refused" is unverified.
- Per-model judge latency figures conflict across sources, as noted in section 5, and should be measured locally rather than cited.

Sources:

- [Anthropic, Building Effective AI Agents](https://www.anthropic.com/engineering/building-effective-agents)
- [LiteLLM Auto Routing](https://docs.litellm.ai/docs/proxy/auto_routing)
- [LiteLLM Auto Router v2](https://docs.litellm.ai/blog/autorouter-v2)
- [OpenRouter Auto Router](https://openrouter.ai/docs/guides/routing/routers/auto-router)
- [Portkey Conditional Routing](https://portkey.ai/docs/product/ai-gateway/conditional-routing)
- [n8n Text Classifier node](https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.text-classifier)
- [Amazon States Language spec](https://states-language.net/spec.html)
- [AWS Step Functions, Amazon States Language](https://docs.aws.amazon.com/step-functions/latest/dg/concepts-amazon-states-language.html)
- [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [OpenAI prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching)
- [Anthropic structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- [Anthropic tool use overview](https://docs.claude.com/en/docs/agents-and-tools/tool-use/overview)
- [Anthropic prompt caching](https://docs.claude.com/en/docs/build-with-claude/prompt-caching)
- [Gemini structured outputs](https://ai.google.dev/gemini-api/docs/structured-output)
- [Vertex AI controlled generation with enum](https://cloud.google.com/vertex-ai/generative-ai/docs/samples/generativeaionvertexai-gemini-controlled-generation-response-schema-4)
- [OWASP LLM01:2025 Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)
- [OWASP LLM Prompt Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html)
- [Prompt injection attacks survey](https://www.sciencedirect.com/org/science/article/pii/S1546221826001384)
- [Aurelio AI Semantic Router](https://www.aurelio.ai/semantic-router)
- [vLLM Semantic Router](https://vllm.ai/blog/2025-09-11-semantic-router)
- [When to Reason: Semantic Router for vLLM](https://arxiv.org/pdf/2510.08731)
