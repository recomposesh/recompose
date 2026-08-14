# Acceptance references for `gateway-routers`

**Scope note and gap, up front.** Repository claims below come from ten reads: `openspec/changes/gateway-routers/proposal.md`, `openspec/changes/gateway-routers/specs/routers/spec.md`, `openspec/changes/gateway-routers/README.md`, `docs/adr/0081-router-engine-parity-is-deferred-with-a-source-map.md`, `openspec/changes/archive/2026-08-08-gateway-virtual-models/discovery/acceptance-references.md`, plus targeted greps over `packages/engine/src/` and `packages/contracts/src/`. Two things I did not resolve inside the read budget: (a) whether recompose exposes `/v1/responses` **downstream** to clients (the greps prove only that subscription transports speak the Codex Responses shape **upstream**, in `packages/engine/src/subscription/`), and (b) the exact shape of the existing typed-refusal envelope beyond the two exported functions in `packages/engine/src/gateway-answers.ts`. Criterion 14 and criterion 6 depend on (a) and (b) respectively and need a reconciling read before they become spec text.

---

## 1. The finding that outranks everything else: "has begun streaming" needs a byte-level definition, not a status-code one

The spec already carries the rule (`openspec/changes/gateway-routers/specs/routers/spec.md`: "Once the answer has begun streaming to the caller, the router MUST NOT begin another child"), and ADR-0081 item 9 states it too. The gap is that the rule is unfalsifiable until "begun streaming" is pinned, and every field failure in this area sits precisely in that ambiguity.

Anthropic's own contract makes the upstream 200 meaningless as a success signal:

> "When receiving a streaming response over server-sent events (SSE), an error can occur after the API returns a 200 response. In that case, error handling doesn't follow these standard mechanisms."
> ([Claude API errors](https://platform.claude.com/docs/en/api/errors), fetched 2026-08-14)

And the wire shape of that mid-stream error is documented exactly:

```sse
event: error
data: {"type": "error", "error": {"type": "overloaded_error", "message": "Overloaded"}}
```

> "during periods of high usage, you may receive an `overloaded_error`, which would normally correspond to an HTTP 529 in a non-streaming context"
> ([Streaming messages](https://platform.claude.com/docs/en/build-with-claude/streaming#error-events), fetched 2026-08-14)

So a rate limit or an overload can arrive as the **first event** of a 200 stream that has not yet carried a single content delta. OpenRouter, which runs this exact failover problem in production, draws the line at the downstream commit point rather than the upstream status:

> "once the first token has been written to the client, the HTTP 200 OK status and headers are already committed ... If an error occurs before any tokens are written, even on a streaming request, OpenRouter can still retry with a backup provider transparently."
> ([OpenRouter failover](https://openrouter.ai/blog/insights/reliability-failover/), published 2026-06-12; see also [errors and debugging](https://openrouter.ai/docs/api_reference/errors-and-debugging))

The counter-constraint is already recorded in this repo's prior brief: Anthropic's gateway protocol reference says "a gateway that buffers complete responses before relaying them stalls the client" (quoted in `openspec/changes/archive/2026-08-08-gateway-virtual-models/discovery/acceptance-references.md`, section 2). Holding the stream until the first upstream event is classified is not buffering the complete response, and the two rules are compatible only if the criterion says so explicitly.

**Consequence for the spec:** the scenario "a failure after streaming began never moves target" must be split into two, because today's wording collapses them.

## 2. Do not attempt mid-stream continuation, and the vendor docs say why

LiteLLM does attempt mid-stream fallback, by re-prompting the fallback target with the partial output. The resulting defect list is the strongest available argument for recompose's no-resume rule:

- Mid-stream fallback injects an assistant prefill block, which breaks on targets that reject prefill ([litellm#27967](https://github.com/BerriAI/litellm/issues/27967)).
- The continuation prompt is not customizable or disableable ([litellm#18229](https://github.com/BerriAI/litellm/issues/18229)).
- `disable_fallbacks` is ignored on the mid-stream path ([litellm#19077](https://github.com/BerriAI/litellm/issues/19077)).
- Streaming fallback behaves differently from non-streaming fallback under the same key-level config ([litellm#25843](https://github.com/BerriAI/litellm/issues/25843)); streaming fallback was broken for 429 and absent for deferred-HTTP providers ([litellm#22296](https://github.com/BerriAI/litellm/issues/22296)); fallbacks never fire for custom LLM streaming endpoints ([litellm#10972](https://github.com/BerriAI/litellm/issues/10972)); critical errors reported inside the stream do not trigger fallback at all on the Responses endpoint ([litellm#15910](https://github.com/BerriAI/litellm/discussions/15910)).

Anthropic confirms that correct resumption is model-version-specific, which is knowledge a router must not carry: for Claude 4.5 and earlier you resume by placing the partial response in an assistant message, and for 4.6 and later you must instead "add a user message that instructs the model to continue" ([Streaming messages, Error recovery](https://platform.claude.com/docs/en/build-with-claude/streaming), fetched 2026-08-14). Prefill against 4.6+ returns `400 invalid_request_error`: "This model does not support assistant message prefill" ([Claude API errors](https://platform.claude.com/docs/en/api/errors)). A router that resumed would have to know the model generation of every target.

Also note the failure mode when the router simply has nowhere to go mid-stream: LiteLLM pinned a core at 100% in an infinite async generator loop on a mid-stream 429 with no fallbacks configured ([litellm#26015](https://github.com/BerriAI/litellm/issues/26015)). Termination is a criterion, not an implementation detail.

## 3. The retryable/request-scoped split, from first-party text

The spec says a "retryable outcome" passes to the next child and a "request-scoped outcome" ends the attempt, without enumerating either. First-party sources give the enumeration:

- Anthropic status/type table: `400 invalid_request_error`, `401 authentication_error`, `402 billing_error`, `403 permission_error`, `404 not_found_error`, `409 conflict_error`, `413 request_too_large`, `429 rate_limit_error`, `500 api_error`, `504 timeout_error`, `529 overloaded_error` ([Claude API errors](https://platform.claude.com/docs/en/api/errors)). The same page states what the official SDKs treat as transient: "connection errors, rate limits, and 5xx server errors ... honoring the `retry-after` header when present."
- A 429 on Anthropic always carries timing: "you will get a 429 error describing which rate limit was exceeded, along with a `retry-after` header indicating how long to wait", and `retry-after` is documented as "The number of seconds to wait until you can retry the request. Earlier retries will fail." Reset headers (`anthropic-ratelimit-*-reset`) are RFC 3339 timestamps ([Rate limits](https://platform.claude.com/docs/en/api/rate-limits), fetched 2026-08-14).
- Two different 429s on the OpenAI side must not be treated alike: a traffic-pressure rate limit is retryable, while `insufficient_quota` / billing / account-state 429s are not resolved by waiting, and the body is the only discriminator (summarized across [ofox.ai on 429 semantics](https://ofox.ai/blog/429-too-many-requests-rate-limit-exceeded-when-to-retry-2026/) and [yingtu.ai](https://yingtu.ai/en/blog/openai-api-rate-limit); these are secondary sources, flagged in section 7).
- `Retry-After` is `delay-seconds` **or** an HTTP-date per RFC 9110 section 10.2.3 ([MDN Retry-After](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Retry-After)). A parser that assumes integers silently yields a zero cooldown on a date-valued header.
- LiteLLM validates the split by splitting its config three ways: generic `fallbacks` for "all remaining errors" (429, 500), plus separate `context_window_fallbacks` for `ContextWindowExceededError` and `content_policy_fallbacks` for `ContentPolicyViolationError` ([LiteLLM fallbacks](https://docs.litellm.ai/docs/proxy/reliability)). ADR-0081 item 8 already forbids fallback for context length; the LiteLLM shape is evidence that context-window failures are a _third_ category (a different target with a bigger window could serve them) rather than simply request-scoped. Worth an explicit "out of scope for this change" line so the omission reads as a decision.

Repository anchors that already carry half of this: `packages/engine/src/plugin-abi.ts` exposes `PluginRPCErrorShape` with `retryable: boolean` and `httpStatus: number`, and `packages/engine/src/subscription/codex-errors.ts` already computes `retryAfterSeconds(status, value, now)` and sets a `retry-after` header on usage-limit 429s. The router consumes signals that exist; ADR-0081 says they had no consumer until now.

## 4. Broken expectations from the field, on the pinned upstream

ADR-0081 pins CLIProxyAPI as the source map. Its open bug list is the acceptance matrix for what to avoid:

- **Silent upstream failures skip failover entirely.** With three relay endpoints configured for redundancy, an empty stream / "context canceled" / connection close before any SSE data matched none of the retriable statuses (403, 408, 500, 502, 503, 504), so no sibling was ever tried; the reporter proved the machinery works only by forcing a well-formed "invalid API key" error ([CLIProxyAPI#2189](https://github.com/router-for-me/CLIProxyAPI/issues/2189), opened 2026-03-17, v6.8.55). **A transport-level failure with no status code is the single most common real-world trigger and must be classified as retryable-before-first-byte.**
- **Round-robin destroys stateful continuations.** Turn 1 lands on account A and returns `response_id: resp_abc`; turn 2 carrying `previous_response_id` lands on account B and fails with "No tool call found for function call output", which the reporter describes as rendering "Codex CLI completely unusable with round-robin when multiple accounts are configured" ([CLIProxyAPI#2594](https://github.com/router-for-me/CLIProxyAPI/issues/2594), opened 2026-04-08). OpenAI's own docs confirm the state lives server-side: `previous_response_id` "lets you chain responses and create a threaded conversation", with response objects "saved for 30 days by default" ([conversation state](https://developers.openai.com/api/docs/guides/conversation-state), fetched 2026-08-14).
- **Reselecting an account mid-conversation poisons encrypted reasoning.** A resumed turn routed through a different auth returns `400` "encrypted content could not be verified" / "Encrypted content could not be decrypted or parsed", and retries fail identically, forcing a restart ([CLIProxyAPI#3189](https://github.com/router-for-me/CLIProxyAPI/issues/3189), opened 2026-05-02, open). ADR-0081 already lists thinking-signature failures as non-fallback; this is the same class one layer up.
- **One exhausted credential poisoned the whole pool.** After the first key hit quota, every request returned `401 "Invalid API Key"` including for keys that were fine, and the same keys worked when used directly; suspected causes were exponential cooldown, session-affinity binding, shared auth state, and a round-robin index that failed to wrap ([CLIProxyAPI#3317](https://github.com/router-for-me/CLIProxyAPI/issues/3317), opened 2026-05-10, closed as not planned, no maintainer diagnosis).

And on the LiteLLM side, the router-state failures:

- Fallback loops: alternating primary/fallback forever with wrong keys, where "setting `num_retries` or `max_fallbacks` does not solve the issue" ([litellm#7091](https://github.com/BerriAI/litellm/issues/7091), fix attempt [PR#7751](https://github.com/BerriAI/litellm/pull/7751)); infinite retry on an unmapped parameter ([litellm#23546](https://github.com/BerriAI/litellm/issues/23546)); fallback resetting the retry cycle so fallback models execute repeatedly ([litellm#19985](https://github.com/BerriAI/litellm/issues/19985)).
- Illegible exhaustion: when both primary and fallback are unhealthy the error claims no fallback exists for the fallback ([litellm#17729](https://github.com/BerriAI/litellm/issues/17729)); and when every deployment is cooling, the 429 carried the wait only inside a prose message, with no `Retry-After` header, forcing clients to string-parse ([litellm#27823](https://github.com/BerriAI/litellm/issues/27823), filed 2026-05-13 against v1.83.0, closed via PR#30098).
- Cooldown model worth copying deliberately: `allowed_fails` (failures per minute before cooldown) and `cooldown_time` (seconds), both settable per deployment and overriding the router-level value ([LiteLLM routing](https://docs.litellm.ai/docs/routing), [config settings](https://docs.litellm.ai/docs/proxy/config_settings)).
- Cost consequence of rotating accounts, first-party: "Cache entries are scoped to a specific API key and organization. Different API keys maintain separate caches, even if the content is identical" ([Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching), fetched 2026-08-14). Round-robin over N accounts is an N-way cache miss on a Claude Code workload, and Anthropic notes cache reads do not count toward ITPM, so rotation also _lowers_ effective rate-limit headroom rather than raising it ([Rate limits](https://platform.claude.com/docs/en/api/rate-limits)). This is the single most likely user complaint after ship: "round-robin made everything slower and more expensive."

## 5. Candidate acceptance criteria, in the house spec voice

**The commit boundary**

1. The router MUST define "begun streaming" as the first byte written to the downstream response, never as the upstream returning 200. An upstream `event: error` carrying `overloaded_error` or a rate limit that arrives before any downstream byte MUST be treated as a pre-stream refusal and MUST be eligible for the next child.
2. The router MUST NOT buffer a complete upstream response in order to classify it; it may hold only until the first upstream event is classified, and it MUST relay every subsequent event as it arrives.
3. After the first downstream byte, the router MUST forward the provider's stream error verbatim, MUST NOT begin another child, MUST NOT synthesize a continuation prompt or an assistant prefill, and MUST terminate the downstream stream rather than looping.

**Classification**

4. A transport failure with no HTTP status (connection reset, empty body, upstream close before any SSE data, cancelled context) that occurs before the first downstream byte MUST count as retryable and MUST advance to the next child.
5. `429` MUST NOT be classified by status alone. A rate limit or capacity refusal is retryable; a quota, billing, or account-state refusal is request-scoped and MUST end the attempt. `400`, `401` after one refresh, `403`, `404`, `413`, context-length, invalid tool schema, and thinking-signature failures MUST end the attempt. `500`, `502`, `503`, `504`, `529`, and `408` MUST be retryable before the first byte.

**Refusal fidelity**

6. A refusal that originated upstream MUST reach the caller byte-identical, with no router envelope added, because Claude Code's retry logic matches on upstream error wording (constraint recorded in `openspec/changes/archive/2026-08-08-gateway-virtual-models/discovery/acceptance-references.md`, section 2). Only a refusal recompose itself originates (empty router, exhausted router, unresolvable virtual model) may carry the recompose shape, and the spec MUST say which of the two a reader is looking at. The existing entry points are `unreachableTargetAnswer` and `unreachableTargetMessage` in `packages/engine/src/gateway-answers.ts`, called from `packages/engine/src/gateway-proxy.ts`.
7. The exhausted-router refusal MUST name every child attempted and why each refused, and MUST carry a `Retry-After` header derived from the soonest child cooldown, not only a prose sentence. `Retry-After` MUST be emitted as delay-seconds, and MUST be parsed as either delay-seconds or an HTTP-date on the way in.

**Attempt budget and graph safety**

8. Each child MUST be attempted at most once per request, across nested routers, and the total attempt count MUST be bounded independently of nesting depth, so no configuration can produce an unbounded attempt sequence.
9. The stored graph MUST be validated for acyclicity and for dangling child references in contracts, not only in the canvas (ADR-0081 item 3). A gateway whose router names a deleted target MUST still load, list, and render.
10. A router holding no child MUST refuse before any request leaves the machine, and the refusal MUST name the empty router (already in the spec; retained here because criterion 9 makes "empty after validation" reachable).

**Health, cooldown, and credentials**

11. Cooldown duration MUST be derived from the provider's own signal (`retry-after`, or the `anthropic-ratelimit-*-reset` RFC 3339 timestamps) when one is present, and MUST fall back to a configured default only when absent.
12. Health and cooldown MUST be keyed by the resolved chain plus target identity (account and real model), never by the client-sent alias (ADR-0081 item 6). This preserves the `Domain hierarchy` keying the repo already uses for target cards.
13. A `401` on a subscription target MUST trigger exactly one credential refresh before any router decision (ADR-0081 item 7), and MUST cool only that target. A credential failure on one child MUST NOT mark any sibling unavailable, and MUST NOT be observable as a pool-wide `401` ([CLIProxyAPI#3317](https://github.com/router-for-me/CLIProxyAPI/issues/3317)).

**Round-robin specifics**

14. Round-robin MUST NOT move a stateful continuation to a different account. If recompose serves a stateful endpoint downstream (a request carrying `previous_response_id`, or one replaying encrypted reasoning or thinking signatures), the change MUST either pin the continuation to the originating target or refuse legibly; silently rotating produces `400 "No tool call found for function call output"` ([CLIProxyAPI#2594](https://github.com/router-for-me/CLIProxyAPI/issues/2594)) and `400 "encrypted content could not be verified"` ([CLIProxyAPI#3189](https://github.com/router-for-me/CLIProxyAPI/issues/3189)). **This criterion is conditional on the unresolved gap named in the scope note.**
15. The distribution counter MUST be keyed by the resolved router identity, MUST wrap correctly when a child is cooling or removed, and adding or removing a child MUST NOT starve any remaining child. The behavior across an app restart and across a config edit MUST be stated, either as "resets" or as "persists", and MUST be specified rather than emergent.
16. Every child cooling MUST answer the typed exhausted-router refusal rather than picking one anyway (already in the spec), and that refusal MUST satisfy criterion 7.

**Observability and honesty**

17. Every attempt, including each failed one, MUST be recorded against the target that served it, so a person can see that a request cost two attempts. OpenRouter's own failover page concedes that "some users have reported cases where error 429 consumed credits, or where partial outputs were counted despite an error" ([OpenRouter failover](https://openrouter.ai/blog/insights/reliability-failover/), 2026-06-12); a router that hides failed attempts hides real spend.
18. The round-robin control MUST state the prompt-cache consequence at the point of choice, because cache entries are per-API-key and per-organization and do not survive rotation ([Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)).

**Migration**

19. Every gateway stored under the current version MUST keep serving exactly what it serves today after migrating a direct target into the graph. The precedent to extend lives in `packages/contracts/src/gateway-config.ts` with its round-trip spec `packages/contracts/src/gateway-config-migration.test.ts`, and the requirement it modifies is "A virtual model maps to one target" in `openspec/specs/virtual-models/spec.md`.

## 6. Recommendation

Rewrite the streaming scenario in `openspec/changes/gateway-routers/specs/routers/spec.md` into three, before implementation starts: an upstream `event: error` arriving before the first downstream byte (fails over), an upstream failure after the first downstream byte (forwards verbatim, terminates), and a transport failure with no status at all (fails over). Those three are where every cited failure actually lives, and the current single scenario cannot distinguish them.

Take the classification table (criteria 4 and 5) into contracts as data rather than into the engine as branches, so the retryable/request-scoped decision has one authoritative representation and a type-level spec can pin it. The provider transports already normalize the inputs (`packages/engine/src/plugin-abi.ts`, `packages/engine/src/subscription/codex-errors.ts`); ADR-0081 says this feature is the first consumer.

Ship criterion 14 as an explicit refusal rather than as sticky routing. Session affinity is issue #45 and ADR-0081 defers it; but shipping round-robin with no answer at all for stateful continuations reproduces a defect that has sat open on the pinned upstream since April 2026. A legible refusal is in scope; sticky selection is not.

Resolve the two named gaps with one read each before the spec freezes: whether a downstream `/v1/responses` route exists, and the current refusal envelope shape in `packages/engine/src/gateway-answers.ts`.

## 7. Weakest evidence, flagged

The OpenAI `insufficient_quota` versus rate-limit split in criterion 5 rests on secondary write-ups, not on a first-party page I opened; the official error-codes page needs a direct fetch before that clause becomes spec text. CLIProxyAPI issues #2189, #3189, and #3317 carry no maintainer diagnosis (and #3317 closed as not planned), so they evidence user expectation and failure symptom, not a confirmed mechanism. The claim that CLIProxyAPI's retriable set is exactly {403, 408, 500, 502, 503, 504} comes from the issue text and a DeepWiki summary rather than from the pinned source files ADR-0081 lists; verify against `sdk/cliproxy/auth/cooldown_state.go` at the pinned commit before quoting it as upstream behavior. Finally, the LiteLLM cooldown defaults (`allowed_fails`, one-minute failure TTL) are documented but version-sensitive; treat the shape as prior art, not the numbers.
