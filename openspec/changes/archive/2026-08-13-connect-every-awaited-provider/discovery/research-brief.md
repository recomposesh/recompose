# Research brief: every provider standing under a Soon badge

Every fact below was read from the vendor's own documentation or from a reference
implementation on disk, in August 2026. Where a vendor publishes nothing, the row says so
rather than guessing.

Two reference checkouts back the ported work:

- CLIProxyAPI at `v7.2.131`, read from `/private/tmp/cliproxyapi-reference`
- CC Switch at `main`, read from `/private/tmp/ccswitch-reference`

## How an origin is spelled here

The gateway joins a stored origin to a path the provider names. `providerPath` answers
`/v1/chat/completions` for anything that speaks Chat Completions, so a vendor documenting a
base URL of `https://host/v1` is stored as `https://host`. The one vendor whose documented
base URL puts the version before the compatibility segment is DeepInfra, and it names its
own path.

## Aggregators

| Row          | Serving origin                        | Dialect          | Credential header       |
| ------------ | ------------------------------------- | ---------------- | ----------------------- |
| Together AI  | `https://api.together.ai`             | Chat Completions | `Authorization: Bearer` |
| Fireworks AI | `https://api.fireworks.ai/inference`  | Chat Completions | `Authorization: Bearer` |
| Groq         | `https://api.groq.com/openai`         | Chat Completions | `Authorization: Bearer` |
| DeepInfra    | `https://api.deepinfra.com/v1/openai` | Chat Completions | `Authorization: Bearer` |
| Cerebras     | `https://api.cerebras.ai`             | Chat Completions | `Authorization: Bearer` |

DeepInfra documents `https://api.deepinfra.com/v1/openai` as the base an OpenAI client is
pointed at, so its turn lands on `/chat/completions` rather than `/v1/chat/completions`.

Sources: [Together](https://docs.together.ai/docs/openai-api-compatibility),
[Fireworks](https://docs.fireworks.ai/tools-sdks/openai-compatibility),
[Groq](https://console.groq.com/docs/openai),
[DeepInfra](https://docs.deepinfra.com/chat/overview),
[Cerebras](https://inference-docs.cerebras.ai/api-reference/chat-completions).

## Key providers

| Row             | Serving origin                                   | Dialect          | Credential header       |
| --------------- | ------------------------------------------------ | ---------------- | ----------------------- |
| Gemini API      | `https://generativelanguage.googleapis.com`      | Gemini           | `x-goog-api-key`        |
| Mistral         | `https://api.mistral.ai`                         | Chat Completions | `Authorization: Bearer` |
| xAI Grok        | `https://api.x.ai/v1`                            | Responses        | `Authorization: Bearer` |
| DeepSeek        | `https://api.deepseek.com`                       | Chat Completions | `Authorization: Bearer` |
| Moonshot AI     | `https://api.moonshot.ai`                        | Chat Completions | `Authorization: Bearer` |
| Qwen            | `https://dashscope.aliyuncs.com/compatible-mode` | Chat Completions | `Authorization: Bearer` |
| Custom endpoint | the person's own                                 | the person's own | `Authorization: Bearer` |

Gemini and xAI already carry an origin, a dialect and a header in the engine. Neither ever
stood in the catalog, so both connect on catalog rows alone.

DeepSeek documents `https://api.deepseek.com` and states that `https://api.deepseek.com/v1`
reaches the same service for OpenAI compatibility. Moonshot moved its console to
`platform.kimi.ai` and keeps `https://api.moonshot.ai/v1` as the endpoint.

Sources: [Mistral](https://docs.mistral.ai/api),
[DeepSeek](https://api-docs.deepseek.com/),
[Moonshot](https://platform.kimi.ai/docs/api/chat),
[Model Studio](https://www.alibabacloud.com/help/en/model-studio/compatibility-of-openai-with-dashscope).

## Local runtimes

A look asks the runtime's own path rather than a shared one, so a different server on the
port reads as another server rather than as the runtime.

| Row                 | Documented port  | Identity path    | Version read from |
| ------------------- | ---------------- | ---------------- | ----------------- |
| Ollama              | 11434            | `/api/version`   | `version`         |
| LM Studio           | 1234             | `/api/v0/models` | nothing published |
| llama.cpp           | 8080             | `/props`         | `build_info`      |
| vLLM                | 8000             | `/version`       | `version`         |
| Custom local server | the person's own | `/v1/models`     | nothing published |

LM Studio publishes no version anywhere in its REST surface, and a list of models is not a
version. vLLM's route was read from its own source at `v0.11.0`, where `show_version`
answers `{"version": …}`.

Sources: [LM Studio](https://lmstudio.ai/docs/developer/rest/endpoints),
[llama-server endpoints](https://mvysny.github.io/llama-server-endpoints/),
[vLLM](https://docs.vllm.ai/en/latest/serving/online_serving/openai_compatible_server/).

## Subscriptions

### Kimi Code signs in, and a tool recompose already runs owns the flow

Kimi Code authenticates through the OAuth 2.0 device authorization grant. CLIProxyAPI
implements the whole flow in `internal/auth/kimi/`, and its server accepts `--kimi-login`
beside the `--antigravity-login` recompose already runs. So Kimi Code costs one row in the
subscription provider table rather than a new sign-in.

Its device authorization endpoint is `https://auth.kimi.com/api/oauth/device_authorization`
and its turns land on `https://api.kimi.com/coding`, which the engine already serves.

### GitHub Copilot signs in, and nothing on the machine owns the flow

Copilot authenticates through GitHub's device flow, then trades the GitHub token for a
Copilot token that expires and is refreshed a minute before it does. CC Switch implements
it in `src-tauri/src/proxy/providers/copilot_auth.rs`, which is what the ported flow follows.

| Step               | Endpoint                                           |
| ------------------ | -------------------------------------------------- |
| Device code        | `https://github.com/login/device/code`             |
| Token poll         | `https://github.com/login/oauth/access_token`      |
| Copilot token      | `https://api.github.com/copilot_internal/v2/token` |
| Signed-in identity | `https://api.github.com/user`                      |
| Turns              | `https://api.githubcopilot.com`                    |

The client identity is Visual Studio Code's own, `Iv1.b507a08c87ecfe98`, which is what every
shipped Copilot bridge uses because GitHub registers no other for a terminal.

### Three coding plans hand over a token and offer no sign-in

Qwen's OAuth ended on 15 April 2026. Z.ai and MiniMax never published one. All three sell a
monthly plan whose credential is a token a person pastes, against an endpoint speaking the
Anthropic dialect.

| Row                 | Serving origin                                         | Dialect   |
| ------------------- | ------------------------------------------------------ | --------- |
| GLM Coding Plan     | `https://api.z.ai/api/anthropic`                       | Anthropic |
| Qwen Coding Plan    | `https://coding.dashscope.aliyuncs.com/apps/anthropic` | Anthropic |
| MiniMax Coding Plan | `https://api.minimax.io/anthropic`                     | Anthropic |

CC Switch stores all three the same way, as a base URL beside an auth token, which is what
`src/config/claudeProviderPresets.ts` records for each.

Sources: [Z.ai](https://docs.z.ai/devpack/quick-start),
[MiniMax](https://docs.openclaw.ai/providers/minimax),
[Qwen authentication](https://deepwiki.com/QwenLM/qwen-code/2.2-authentication-setup).

## Key shapes

A hint is offered only where the vendor documents one opening. Groq documents `gsk_`, xAI
documents `xai-`, and Google documents `AIza`. Cerebras, Mistral, DeepSeek, Together,
Fireworks, DeepInfra and Moonshot publish bearer authentication and no shape, so their
fields stay unhinted rather than hinted wrongly.
