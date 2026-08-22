<!-- vale off -->

# Resync register: v7.2.131 to v7.2.139

Upstream moved from `d757063c` (v7.2.131) to `0a14eb7` (v7.2.139 and four commits past it):
62 commits, no merges. Test inventory moved from 4,122 `Test*` functions to 4,502.
Reconciled here: **392 new rows**, against **12 rows that left upstream**.

Local comparison date: 2026-08-22. The engine gate at that date: 639 test files, 5,223 tests.

The pin in a document header moves only once that document is reconciled, so a stale
header is the truth about that document rather than an oversight.

## New rows by family

| Family                                        | Rows | Document                        |
| --------------------------------------------- | ---: | ------------------------------- |
| `internal/runtime/executor`                   |  116 | per-provider executor documents |
| `sdk/cliproxy/auth`                           |   98 | `auth.md`                       |
| `internal/runtime/executor/helps`             |   25 | `runtime-executor.md`           |
| `internal/util`                               |   24 | `util.md`                       |
| `sdk/api/handlers`                            |   15 | `api.md`                        |
| `internal/translator/gemini/openai/responses` |   11 | `translator-gemini.md`          |
| `sdk/api/handlers/openai`                     |   10 | `api.md`                        |
| `internal/api/handlers/management`            |    8 | `api.md`                        |
| `internal/watcher/synthesizer`                |    7 | `watcher.md`                    |
| `internal/config`                             |    7 | `config.md`                     |
| `internal/translator/openai/gemini`           |    7 | `translator-openai.md`          |
| `internal/translator/antigravity/gemini`      |    6 | `translator-antigravity.md`     |
| `internal/translator/openai/openai/responses` |    6 | `translator-openai.md`          |
| Twenty-four smaller families                  |   52 | their own documents             |

## What the behavior commits mean here

Sixty-two commits carry thirty-seven behavior changes inside the engine port. Every one of them is
read below. The rest move the auth manager, the watcher, the config loader, the model registry, or
the README, none of which this project carries.

### Gaps this resync closed

| Upstream            | What it fixes                                             | Local answer                                                       |
| ------------------- | --------------------------------------------------------- | ------------------------------------------------------------------ |
| `ac0d188`           | strip `encrypted` from tool parameter schemas             | `antigravity-schema.ts` adds it to the unsupported names           |
| `aa5dccc` `8eb3ac2` | read the thought an answer carries, under either spelling | `chat-completions-reasoning.ts`, read by the answer and the stream |
| `62f5a27`           | a model-first conversation gains an empty opening turn    | `gemini-leading-turn.ts`, on Gemini, Vertex and AI Studio          |
| `b1c0005`           | a Responses text part names `annotations` and `logprobs`  | `responses-stream-done.ts` names both, holding none                |
| `4053c02`           | a `functionResponse` part carries no thought signature    | `gemini-response-signatures.ts`, on the same three targets         |
| `788e9b7`           | `advisor_` and `agent_toolset_` are Anthropic-operated    | `claude-tools.ts` stops aliasing them as caller tools              |
| `79ef361`           | a tool image nests inside the answer it belongs to        | `antigravity-tool-images.ts`, binding to the nearest answer        |

The reasoning gap ran deeper than the two upstream commits describe. The request side already read
`reasoning_content`; neither the answer nor the stream did, so a Claude client watching a compatible
provider think saw an answer arrive with nothing behind it. Both directions read it now, and both
accept the bare `reasoning` several vendors send instead.

`788e9b7` also restores `tool_search_tool_result` references across 110 lines of executor request
handling. Only its two-prefix half is answered here.

### Behavior the port already carried

| Upstream  | Why it needed nothing here                                                              |
| --------- | --------------------------------------------------------------------------------------- |
| `3230e37` | `max_completion_tokens` already stands beside `max_tokens` in the request fields        |
| `4ac37ed` | the hub carries stop sequences as a list, so a single one was never written bare        |
| `497673b` | `video_url` is already a media part both directions of the compatible codec know        |
| `68e96c2` | one hub sampling field feeds every target, so no pair needs its own mapping             |
| `2005788` | `prompt_cache_retention` already stands in the removed Codex fields                     |
| `3db591e` | the Gemini answer decoder already carries `thoughtSignature` onto the thinking block    |
| `5b232e3` | tool call ids already fall back to a sequential `call_<index>` rather than a random one |
| `20f84e7` | `responses-tool-result.ts` already reads string, parsed, and mixed array outputs alike  |
| `92f03e6` | a stream dying before any byte hands the turn to a sibling, which upstream does not do  |

### Where this project decides differently

| Upstream            | Upstream behavior                                      | This project                                                           |
| ------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------- |
| `1ecb7df` `7efe0a7` | silently keeps the last answer to a repeated tool call | refuses with `toolIdCollision`, since a silent drop hides a caller bug |
| `42d8e74` `a8f9814` | scopes a Fable-only rate limit away from the account   | the earliest reset window already wins, so no long stand-down forms    |

### Gaps left open on purpose

Three are real and cost more than a fix each. They are named here rather than claimed.

- `85d2fad` carries `X-Claude-Code-Agent-Id`, `X-Claude-Code-Parent-Agent-Id`, the two
  `X-Claude-Remote-` headers, `X-Client-App` and `X-Anthropic-Additional-Protection` from the caller
  to Anthropic. `Crossing` already holds `requestHeaders`, but the subscription chain drops them
  five calls earlier, so the fix threads a field through `reachSubscription`, `SubscriptionScope`,
  `claudeReachRequest`, `claudeProviderRequest` and `claudeWireHeaders`.
- `1d5b761` reads token usage off a plugin executor's answer. Here a plugin executor answers through
  `locallyAnswered`, which never meets `providerUsageFrom`, so those turns record no usage at all.
  Moving them onto the observed path changes what the traffic rows carry.
- `10afcc8` propagates `environment_id` and `agent_config` through the Interactions adapters. The
  hub models neither, so carrying them widens the hub contract rather than fixing a translation.

### Out of scope

`e424bfa` and `5fef17e` add `$`-prefixed custom headers, a configuration surface this project does
not offer. `aec70df` and `f1b0431` add a `fingerprint-profile` setting, likewise. `8aa6868` handles
a 403 from a profile call this project never makes, because identity is read from the stored
credential. `4b9d404` adds opt-in Codex stream buffering where failover already lives in the router.
`45c90e8` fixes a WebSocket-to-HTTP merge path this project does not carry. `a581838` and the three
`perf(translator)` commits are internal serialization work. Every commit under `sdk/cliproxy/auth`,
`internal/watcher`, `internal/config` and `internal/registry` belongs to a process this project runs
itself rather than ports.

### Still unread

`556328c` adds namespace-aware Responses tool resolution across 694 lines. `616d1b1` centralizes
tool-call id generation and hardens signature sanitization. `9d6b5cd` is half read: the dialect
already treats `response.incomplete` as terminal, and whether the xAI WebSocket proxy should clear
its pending turn on one is still open.
