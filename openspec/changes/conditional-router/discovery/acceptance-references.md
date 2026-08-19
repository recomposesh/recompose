# Acceptance references for `conditional-router`

Scope: I mined vendor docs, issue trackers and community reports for the failure modes an LLM-judge router hits, then checked each against the code the change touches. Repository reads: `openspec/changes/conditional-router/proposal.md`, `openspec/changes/conditional-router/specs/routers/spec.md`, `packages/contracts/src/gateway-routing.ts`, `packages/engine/src/routing/attempt-walk.ts`, `packages/engine/src/routing/outcome-classification.ts`, `packages/engine/src/routing/cooldown-ledger.ts`, `packages/engine/src/routing/policies.ts`, `packages/engine/src/gateway-chained-turn.ts`, `apps/desktop/src/renderer/src/pages/gateway-canvas/lib/router-modes.ts`.

## 1. The mandatory else branch matches industry practice, and the judge must not be able to name it

Portkey's conditional strategy makes `conditions` **and** `default` required params, evaluates conditions sequentially, first match wins, and a missing key or a malformed condition evaluates false and moves to the next rather than erroring. n8n's Text Classifier offers "Discard Item" (default) or "Output on Extra, 'Other' Branch" for no clear match. In both, the sink is not a category the model can select. The spec's "permanent else branch" is therefore conformant, but two criteria are missing:

- **AC:** the label set handed to the judge MUST exclude `else`; an answer of `else` is a broken answer, not a selection. (Neither n8n's Other branch nor Portkey's `default` is selectable.)
- **AC:** branch order is part of the contract and evaluation is top to bottom, so two rules that both match resolve to the earlier branch. The designs already say "judged top to bottom"; the spec should state it as a MUST.

## 2. "A broken answer" needs a concrete taxonomy, because five distinct providers break it five ways

The spec says "a broken answer earns one retry". Sources say what broken looks like:

- **Multiple labels.** n8n issue #14337: the classifier output multiple classes even with the single-class option disabled. **AC:** an answer naming two or more branches is broken (no "first token wins" salvage) and earns the retry.
- **Empty output because reasoning ate the budget.** OpenAI's reasoning guide: `max_output_tokens` bounds reasoning plus visible output, so a small cap returns `status: incomplete`, `incomplete_details.reason = max_output_tokens` and no text at all. The brainstorm's "small max_tokens" is exactly the trigger. **AC:** the judge call MUST either suppress reasoning or reserve headroom; an empty completion is a broken answer that lands on else with a reason distinguishable from a timeout.
- **A hard 400, not a bad answer.** Anthropic enforces `max_tokens > thinking.budget_tokens` with a minimum budget of 1024, returning 400 `max_tokens must be greater than thinking.budget_tokens`; extended thinking also forbids assistant prefill and temperature changes, so the classic "prefill the label" trick is unavailable on a thinking-enabled judge. **AC:** a judge bound to a model whose settings make the classification call invalid MUST surface as a bound-but-unusable judge in the UI (screens 0 and 7 already have the amber satellite vocabulary), never as a silent permanent else.
- **Refusal and truncation.** OpenAI structured outputs: the model may refuse (`refusal` set) or be interrupted, and only an uninterrupted non-refusal reliably matches the schema. **AC:** refusal and truncation are broken answers, and both land on else after the single retry.
- **Normalization.** **AC:** label matching MUST be defined (trim, case folding, exact token equality) and specified once, since the judge may be any provider and only Gemini offers a true single-enum mode (`responseMimeType: "text/x.enum"`).

## 3. The 3-second timeout budget has two documented traps

- **First-call schema compilation.** OpenAI's own doc: "the first request you make with any schema will have additional latency as our API processes the schema", with community and vendor reports of under 10 seconds typically and up to a minute for complex schemas. Every branch add or rename changes the schema. **AC:** either the classification call avoids a per-branch-set strict schema (plain enumerated-label text, or a stable schema with labels in the prompt), or the first call after a branch edit is exempt from the budget. Otherwise the first request after every edit falls to else.
- **Where the clock starts.** LiteLLM issue #19909: `stream_timeout` was not enforced on the first chunk, so the timeout only fired after the delayed response arrived. **AC:** the judge budget MUST be measured from dispatch, covering the wait for the first byte, and MUST abort the in-flight call rather than merely stop waiting.

Context for the budget size: routing-layer overhead is conventionally held to tens of milliseconds, so a judge call is two orders of magnitude above normal router overhead. That is the argument for stickiness and for a small judge model, and it is worth a criterion that the judge's latency is visible per decision (the Alt C playground design already shows branch plus latency).

## 4. Cooling the judge after one failure spends a full minute of traffic on else

`createCooldownLedger` in `packages/engine/src/routing/cooldown-ledger.ts` plus `DEFAULT_COOLDOWN_MS = 60_000` in `packages/engine/src/routing/cooldown-signal.ts` means a single timeout stands the judge down for 60 seconds. LiteLLM's defaults are `allowed_fails = 3` inside a rolling one-minute window with `cooldown_time` of 30 seconds, that is, N failures before cooldown, not one. **AC (decision point):** state whether a single judge timeout cools the judge, and if it does, the UI MUST show the cooling state and its remaining window (design screen 7 covers it) so a minute of unjudged traffic is never invisible. My recommendation: a timeout skips that request without cooling, and only a provider-signalled limit or a repeated failure cools, because the else branch already absorbs the miss.

## 5. `classify()` today would hand a judge's 400 body to the caller

In `packages/engine/src/routing/outcome-classification.ts`, `verdictARefusalEarns` returns `{ verdict: 'answer', answer }` for any status outside `RETRYABLE_STATUSES` (408, 429, 500, 502, 503, 504, 529). A judge refused with 400 (see the Anthropic constraint above) or 401 would therefore become the client's response body if the judge is routed through the same table. **AC:** a judge reading MUST NOT produce a caller-facing answer under any status; every non-served judge reading resolves to else. This is the sharpest implementation trap I found and it is repo-backed, not inferred.

## 6. Stickiness: prefer a client-supplied session key over a content hash

The brainstorm keys the pin on "system prompt + first message". Two vendor gateways do it differently and one community report shows why the hash is fragile:

- LLMGateway resolves the session key in priority order: `x-session-id` header, `x-session-affinity` header, the `prompt_cache_key` body field, then the `user` body field; the session is pinned after the first request and only re-pinned when the provider drops below the uptime threshold or leaves the pool.
- Olla evaluates an ordered `key_sources` cascade (header, hash of the initial message bytes, Authorization header), expires a session after `idle_ttl_seconds` (default 600), and evicts least-recently-used entries at `max_sessions`. It also purges pinned entries when health marks a backend unhealthy.
- openclaw issue #19534 traced Anthropic cache reads of always 0 to "dynamic content in system prompts (timestamps, message IDs, session metadata, 'Current Date & Time' section) [that] changes every turn", with a cost blowup of 35 dollars against 9 expected.

**ACs:** (a) the fingerprint MUST prefer an explicit client key when the request carries one (`prompt_cache_key` or `user` on OpenAI-shaped requests) and fall back to a content hash only when it does not; (b) the hash MUST be taken over content that is stable across turns of one conversation, and a spec MUST cover a system prompt carrying a per-turn timestamp still pinning the same branch; (c) the pin store MUST be bounded with an idle TTL and LRU eviction, since it lives in-process like the cooldown store; (d) the TTL should be at least the provider cache TTL it exists to protect (Anthropic default 5 minutes with a 1-hour option, refreshed on read; OpenAI evicts after 5 to 10 minutes of inactivity, or an explicit 30-minute TTL on the newest family), because stickiness past the cache window buys only behavioral stability, not cache hits; (e) a collision criterion: two different conversations whose opening bytes match MUST NOT share a pin unless the key is genuinely the same conversation.

## 7. The rule text must demonstrably reach the judge

n8n issue #14072 (filed 2025-03-20, closed not planned): "the category descriptions are nowhere used in the prompt. This causes the classifier being much less accurate." The user filled in descriptions that the node silently dropped. **AC:** a spec MUST assert that each branch's free-text rule appears in the classification request alongside its label, and that editing a rule changes the request. This is the acceptance criterion happy-path docs never write.

## 8. Judge bias makes label naming and order load-bearing

The LLM-as-judge literature reports position bias and token bias in selection tasks, with the mitigation guidance that classification labels should be abstract and non-ordinal rather than semantically loaded ordinals ("Response 1/2"). Anthropic's own routing guidance (Building effective agents, 2024-12-19) says routing works "where classification can be handled accurately". **ACs:** the inspector MUST state that order matters; label text is part of the prompt and a rename can change routing, so a rename MUST be treated as a semantic edit (invalidate pins, or state explicitly that it does not); and the judge prompt MUST NOT number the branches in a way that invites ordinal bias.

## 9. Prompt injection can steer the branch

The request tail is untrusted input flowing into a decision prompt, which is OWASP LLM01 directly ("treat user inputs as untrusted and keep them separate from system-level instructions"). **AC:** a request whose body contains an instruction to pick a specific branch MUST still be classified only from the enumerated label set, and an answer outside that set is broken. A negative-path spec with an injected "route this to `premium`" line is cheap and is the kind of criterion a reviewer will ask for.

## 10. The decision must land before the first byte reaches the client

LiteLLM's fallback tracker shows what happens when the fallback point sits after streaming starts: fallbacks missing entirely for streaming with deferred-HTTP providers (#22296), `disable_fallbacks` ignored during mid-stream fallback (#19077), and a mid-stream fallback request carrying an assistant prefill block that breaks targets which reject it (#27967). **ACs:** the judge call resolves before any bytes are committed to the client; and the else child MUST receive the caller's original request unmodified, with no judge-side prompt residue.

## 11. Graph invariants the new variant needs, from the repo's own validator

`packages/contracts/src/gateway-routing.ts` already refuses a node with more than one parent (`eachNodeAnswersToOneParent`), an unreachable node, and a router past `ROUTER_DEPTH_LIMIT = 4`. Adding a judge binding raises questions those rules will answer by accident unless specified:

- **AC:** the judge MUST NOT appear in the router's `children`, so traffic can never be routed into the judge.
- **AC:** whether two routers may share one judge is a decision the one-parent rule currently forbids if the judge is modeled as a route node; state the answer.
- **AC:** `notesOfTheWalk` in `packages/engine/src/routing/attempt-walk.ts` builds refusal notes from `targetsInDeclaredOrder`, so the judge MUST NOT show up in a client-facing refusal as a candidate that could have served.
- **AC:** judge calls MUST NOT consume the caller's `ATTEMPT_LIMIT = 8` budget (a broken answer plus its retry would otherwise eat two slots).
- **AC:** the else branch and its child count toward the depth limit like any child, and validation MUST refuse a conditional router with a missing else, a duplicate label, a blank label, or a label equal to `else`.
- **AC:** when the judge names a branch whose subtree cannot serve (all children cooling or attempted), the request goes to else rather than refusing; the async picker still consults `subtreeCanServe` from `packages/engine/src/routing/policies.ts`.

## 12. Cost and attribution

Every request buys an extra completion. The openclaw report above (35 dollars against 9 expected from cache misses) is the community shape of this complaint. **AC:** judge tokens MUST be recorded and attributable per decision, and MUST NOT be folded into the usage the caller sees without being stated.

## Recommendation

Add criteria 1 (else not selectable, order is contract), 2 (broken-answer taxonomy with the reasoning-budget and 400 cases), 3 (clock from dispatch, schema-compile exemption), 5 (no judge reading ever becomes a caller answer), 6 (client key precedence, stable hash, bounded TTL store), 7 (rule text reaches the judge), 9 (injection cannot escape the label set) and 11 (graph invariants) to `openspec/changes/conditional-router/specs/routers/spec.md`. Criteria 4 and 6d are decision points that want a maintainer answer before scenarios get written; criterion 4 in particular changes user-visible behavior for a whole minute per judge hiccup.

## Conflicts and gaps

- The schema-compile latency figure conflicts across sources: OpenAI's doc says "additional latency" without a number, a community thread reports under 10 seconds typically and up to a minute, and a third-party blog claims 200 to 400 ms. Treat the ordering (first call is slower, later calls are not) as the finding and the magnitude as unknown.
- LLMGateway's docs describe no time-based session expiry while Olla defaults to 600 seconds idle, so "sticky sessions expire after 10 minutes" is Olla's number, not a shared standard.
- I found no vendor that ships an LLM-judge router with per-wire natural-language rules, so criteria 1, 3 and 6 are transferred from metadata-condition routers (Portkey), workflow classifiers (n8n) and session-affinity gateways (Olla, LLMGateway) rather than from a like-for-like product. No prior art contradicts the design; there is simply less of it than the other sections.
- Not checked inside the read budget: how `packages/engine/src/gateway-proxy.ts` commits the first byte, and whether `refusals.ts` already has vocabulary for a judge-caused fallback. Both matter for criteria 5 and 10 and should be confirmed by the implementer.

Sources:

- [Conditional Routing, Portkey docs](https://portkey.ai/docs/product/ai-gateway/conditional-routing)
- [Text Classifier node, n8n docs](https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.text-classifier)
- [n8n issue #14337, multiple classes despite single-class setting](https://github.com/n8n-io/n8n/issues/14337)
- [n8n issue #14072, category descriptions never reach the prompt](https://github.com/n8n-io/n8n/issues/14072)
- [Structured model outputs, OpenAI docs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [Reasoning models, OpenAI docs](https://developers.openai.com/api/docs/guides/reasoning)
- [Prompt caching, OpenAI docs](https://developers.openai.com/api/docs/guides/prompt-caching)
- [Conversation state, OpenAI docs](https://developers.openai.com/api/docs/guides/conversation-state)
- [Structured outputs, Gemini API docs](https://ai.google.dev/gemini-api/docs/structured-output)
- [Extended thinking, Claude docs](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)
- [Prompt caching, Claude docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- [Building effective agents, Anthropic, 2024-12-19](https://www.anthropic.com/engineering/building-effective-agents)
- [LiteLLM issue #19909, stream timeout not enforced on the first chunk](https://github.com/BerriAI/litellm/issues/19909)
- [LiteLLM issue #22296, streaming fallback broken for deferred-HTTP providers](https://github.com/BerriAI/litellm/issues/22296)
- [LiteLLM issue #19077, disable_fallbacks ignored mid-stream](https://github.com/BerriAI/litellm/issues/19077)
- [LiteLLM issue #27967, mid-stream fallback injects a prefill block](https://github.com/BerriAI/litellm/issues/27967)
- [Router load balancing, LiteLLM docs](https://docs.litellm.ai/docs/routing)
- [Sessions, LLMGateway docs](https://docs.llmgateway.io/features/sessions)
- [Sticky sessions, Olla docs](https://thushan.github.io/olla/concepts/sticky-sessions/)
- [openclaw issue #19534, Anthropic cache reads always zero from volatile system prompts](https://github.com/openclaw/openclaw/issues/19534)
- [LLM01:2025 Prompt Injection, OWASP GenAI](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)
- [Judging the Judges: bias mitigation in LLM-as-a-judge pipelines](https://arxiv.org/pdf/2604.23178)
- [CalibraEval: selection bias in LLMs-as-judges](https://arxiv.org/pdf/2410.15393)
- [OpenAI community: reasoning tokens consume the whole completion budget](https://community.openai.com/t/o4-mini-returns-empty-response-because-reasoning-token-used-all-the-completion-token/1359002)
- [OpenAI community: schema grammar compilation cost on first request](https://community.openai.com/t/structured-output-why-does-creating-a-cfg-take-a-decent-amount-of-time/1130348)
