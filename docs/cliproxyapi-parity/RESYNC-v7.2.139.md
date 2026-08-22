<!-- vale off -->

# Resync register: v7.2.131 to v7.2.139

Upstream moved from `d757063c` (v7.2.131) to `0a14eb7` (v7.2.139 and four commits past it):
62 commits, no merges. Test inventory moved from 4,122 `Test*` functions to 4,502.
Reconciled here: **392 new rows**, against **12 rows that left upstream**.

Local comparison date: 2026-08-22. The engine gate at that date: 637 test files, 5,214 tests.

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

Sixty-two commits carry thirty-seven behavior changes inside the engine port. The rest move the
auth manager, the watcher, the config loader, the model registry, or the README, none of which
this project carries.

### Gaps this resync closed

| Upstream            | What it fixes                                             | Local answer                                                       |
| ------------------- | --------------------------------------------------------- | ------------------------------------------------------------------ |
| `ac0d188`           | strip `encrypted` from tool parameter schemas             | `antigravity-schema.ts` adds it to the unsupported names           |
| `aa5dccc` `8eb3ac2` | read the thought an answer carries, under either spelling | `chat-completions-reasoning.ts`, read by the answer and the stream |
| `62f5a27`           | a model-first conversation gains an empty opening turn    | `gemini-leading-turn.ts`, applied to Gemini, Vertex and AI Studio  |
| `b1c0005`           | a Responses text part names `annotations` and `logprobs`  | `responses-stream-done.ts` names both, holding none                |
| `4053c02`           | a `functionResponse` part carries no thought signature    | `gemini-response-signatures.ts`, on the same three targets         |

The reasoning gap ran deeper than the two upstream commits describe. The request side already read
`reasoning_content`; neither the answer nor the stream did, so a Claude client watching a compatible
provider think saw an answer arrive with nothing behind it. Both directions read it now, and both
accept the bare `reasoning` several vendors send instead.

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

### Where this project decides differently

| Upstream            | Upstream behavior                                      | This project                                                           |
| ------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------- |
| `1ecb7df` `7efe0a7` | silently keeps the last answer to a repeated tool call | refuses with `toolIdCollision`, since a silent drop hides a caller bug |
| `42d8e74` `a8f9814` | scopes a Fable-only rate limit away from the account   | the earliest reset window already wins, so no long stand-down forms    |

### Out of scope

`e424bfa` adds `$`-prefixed custom headers, a configuration surface this project does not offer.
`45c90e8` fixes a WebSocket-to-HTTP merge path this project does not carry. Every commit under
`sdk/cliproxy/auth`, `internal/watcher`, `internal/config` and `internal/registry` belongs to a
process this project runs itself rather than ports.

### Not yet read

Seventeen behavior commits remain unaudited: `4b9d404`, `556328c`, `20f84e7`, `79ef361`, `10afcc8`,
`616d1b1`, `85d2fad`, `8aa6868`, `788e9b7`, `aec70df`, `f1b0431`, `5fef17e`, `92f03e6`, `1d5b761`,
`a581838`, and the three `perf(translator)` commits. `9d6b5cd` is half read: the dialect already
treats `response.incomplete` as terminal, and whether the xAI WebSocket proxy should clear its
pending turn on one is still open.
