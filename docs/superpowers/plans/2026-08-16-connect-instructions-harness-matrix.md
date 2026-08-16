# Connect instructions: the harness matrix

Internal execution artifact for the screen behind the book button in the gateway toolbar
(`widgets/gateway/toolbar/ui/toolbar-strip/toolbar-strip.tsx`, today a placeholder:
`glyph="book" label="Docs" waitsFor="the guide"`).

Researched 2026-08-16. Every row marked **verified** comes from that tool's own documentation or
repository; every row marked **secondary** comes from third-party guides and must be confirmed
against the tool's own source before the copy ships.

## What the gateway actually offers a client

Read off the engine rather than assumed.

| Fact                    | Value                                                                      | Source                       |
| ----------------------- | -------------------------------------------------------------------------- | ---------------------------- |
| Base URL                | `http://<bindAddress>:<port>`, a bare origin, no path                      | ADR 0056, `endpoint-box.tsx` |
| Anthropic Messages      | `POST /v1/messages`, `POST /messages`                                      | `gateway-route-paths.ts`     |
| Chat Completions        | `POST /v1/chat/completions`, `POST /chat/completions`                      | same                         |
| Responses               | `POST /v1/responses`, `POST /responses`                                    | same                         |
| Interactions            | `/v1/interactions`, `/v1beta/interactions`, `/interactions`                | same                         |
| Gemini                  | `POST /v1beta/models/<model>:generateContent` and `:streamGenerateContent` | `gateway-app.ts`             |
| Model listing           | `GET /v1/models`, one entry per virtual model (`id`, `display_name`)       | `gateway-discovery.ts`       |
| Health                  | `GET /health`, `GET or HEAD /healthz`, both unguarded                      | `gateway-app.ts`             |
| Token count             | `/v1/messages/count_tokens`, `/messages/count_tokens`                      | `gateway-route-paths.ts`     |
| Key spellings accepted  | `Authorization: Bearer`, `x-api-key`, `x-goog-api-key`, `?key=`            | ADR 0106                     |
| Key shape               | `rc-local-` + 32 random bytes, base64url, unpadded                         | ADR 0106, ADR 0047           |
| Model id a client sends | the virtual model's `id` (`modelAliasFromName`, keeps dots)                | `gateway-config.ts`          |

Two consequences the instructions have to carry:

1. **The `/v1` suffix belongs to the client, not to the gateway.** Claude Code and Gemini CLI want
   the bare origin; Codex, opencode, Zed, Cline and friends want `http://127.0.0.1:8397/v1`. One
   copy button per client, each with that client's own spelling, or people paste `/v1/v1`.
2. **The key field differs per client**, and the gateway reads four spellings, so a client that
   fills one field with a placeholder and carries the real key in another still works.

## Verified clients

### Claude Code, terminal

Anthropic Messages. Source: `code.claude.com/docs/en/llm-gateway-connect`.

```bash
export ANTHROPIC_BASE_URL=http://127.0.0.1:8397
export ANTHROPIC_AUTH_TOKEN=rc-local-…
export ANTHROPIC_MODEL=creative
```

- `ANTHROPIC_AUTH_TOKEN` sends `Authorization: Bearer`; `ANTHROPIC_API_KEY` sends `x-api-key`;
  an `apiKeyHelper` sends both. The gateway reads all of them.
- Same three keys work in the `env` block of `~/.claude/settings.json`, which also reaches
  background agents; a shell export does not reliably.
- `CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY=1` makes the CLI read the gateway's model list at
  startup and add the entries to `/model`, labelled `From gateway`. That reads our `GET /v1/models`.
- `ANTHROPIC_CUSTOM_HEADERS` carries extra headers, one `Name: Value` per line.
- Verify with `/status`: the `Anthropic base URL` line and the credential line.
- Known cost of pointing away from Anthropic: Remote Control and voice dictation go unavailable.

### Claude Desktop

Anthropic Messages, but **not** through environment variables. Source: the same page's desktop
section.

- Help → Troubleshooting → Enable Developer Mode, then Developer → Configure Third-Party Inference,
  and enter the base URL there.
- An administrator-distributed configuration takes precedence and makes the form read-only.
- With the gateway active, sessions run locally only; no SSH or cloud environments, no Remote
  Control.

### Codex CLI, Codex IDE extension, Codex in the ChatGPT desktop app

OpenAI Responses. All three read `~/.codex/config.toml`. Source: `learn.chatgpt.com/docs/config-file`.

```toml
model = "creative"
model_provider = "recompose"

[model_providers.recompose]
name = "recompose"
base_url = "http://127.0.0.1:8397/v1"
env_key = "RECOMPOSE_API_KEY"
wire_api = "responses"
```

- `wire_api = "responses"` is the only supported value and the default; Chat Completions is gone.
- `model_provider` and `model_providers` are ignored in a project-local `.codex/config.toml`; they
  must sit in the user-level file. Same for `openai_base_url` and `chatgpt_base_url`.
- `openai_base_url` alone repoints the built-in `openai` provider without defining a new one.
- Other fields: `http_headers`, `env_http_headers`, `query_params`, `requires_openai_auth`.

### opencode

Chat Completions (or Responses). Source: `opencode.ai/docs/providers`.

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "recompose": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "recompose",
      "options": {
        "baseURL": "http://127.0.0.1:8397/v1",
        "apiKey": "{env:RECOMPOSE_API_KEY}"
      },
      "models": { "creative": { "name": "Creative" } }
    }
  }
}
```

- `@ai-sdk/openai-compatible` for `/v1/chat/completions`; `@ai-sdk/openai` when the endpoint should
  answer `/v1/responses`; `@ai-sdk/anthropic` for the Messages dialect.
- Model keys must match exactly what the gateway accepts in `model`, so they are the virtual model
  ids.
- Credentials otherwise live in `~/.local/share/opencode/auth.json` through `/connect`.
- Selection reads `provider/model`, so `recompose/creative`.

### pi (earendil-works/pi)

Any of the four dialects. Source: `packages/coding-agent/docs/models.md`.

```json
{
  "providers": {
    "recompose": {
      "baseUrl": "http://127.0.0.1:8397/v1",
      "api": "openai-completions",
      "apiKey": "$RECOMPOSE_API_KEY",
      "models": [{ "id": "creative", "name": "Creative" }]
    }
  }
}
```

- File: `~/.pi/agent/models.json`. It reloads every time `/model` opens, so no restart.
- `api` accepts `openai-completions`, `openai-responses`, `anthropic-messages`,
  `google-generative-ai`, at provider or model level. That is a one-to-one match with our dialects.
- For `anthropic-messages` use the bare origin; for the OpenAI shapes use `/v1`.
- `compat.supportsDeveloperRole` and `compat.supportsReasoningEffort` exist for servers that refuse
  those; the gateway does not need them.
- An extension can register a provider programmatically (`pi.registerProvider`), but the JSON file
  is the copy-paste path.

### omp (oh-my-pi)

Any of the four dialects. Source: `can1357/oh-my-pi`, `docs/models.md` and `docs/providers.md`.

```yaml
# ~/.omp/agent/models.yml
providers:
  recompose:
    baseUrl: http://127.0.0.1:8397/v1
    api: openai-completions
    apiKey: RECOMPOSE_API_KEY
    authHeader: true
    models:
      - id: creative
        name: Creative
        contextWindow: 200000
        maxTokens: 8192
```

- `apiKey` is an environment variable name or a literal; a leading `!` runs the value as a command
  and takes stdout.
- `authHeader: true` puts the key in `Authorization: Bearer`.
- `discovery: {type: openai-models-list}` reads an OpenAI-style `GET /models`, which we serve.
  `discovery: {type: proxy}` wants `supported_endpoint_types` per model, which we do not emit, so
  the explicit `models:` list is the honest instruction.
- Selection reads `provider/model`, so `recompose/creative`.

### Kimi Code CLI

Anthropic, Chat Completions, Responses or Gemini, by `type`. Source:
`moonshotai.github.io/kimi-cli/en/configuration/providers`.

```toml
# ~/.kimi/config.toml
[providers.recompose]
type = "anthropic"
base_url = "http://127.0.0.1:8397"
api_key = "rc-local-…"

[models.creative]
provider = "recompose"
model = "creative"
max_context_size = 262144
```

- `type` accepts `kimi`, `openai_legacy`, `openai_responses`, `anthropic`, `gemini`, `vertexai`.
- A model block names the provider, so the virtual model id lands in `model`.

### DeepSeek Harness (dsh)

Chat Completions. Browser UI, not a terminal. Source: `deepseek-ai/deepseek-harness`,
`docs/user/guide/providers.md`.

- Settings → Models → **Add a custom provider**: lowercase provider id, base URL, API protocol,
  credential, at least one model. The provider id is permanent.
- The `/v1` suffix belongs in the base URL; the harness appends the operation path.
- **Fetch available models** calls the OpenAI-compatible `GET /models`, which we serve, so the model
  list fills itself.
- Equivalent file, `$DSH_HOME/settings.yaml`:

```yaml
llm-pi-ai:
  providers:
    recompose:
      apiKeyEnv: RECOMPOSE_API_KEY
      api: openai-completions
      baseURL: http://127.0.0.1:8397/v1
      models:
        - id: creative
          input: [text, image]
```

- A hand-entered model is text-only until `input: [text, image]` says otherwise.
- Keys live write-only in `$DSH_HOME/.credentials.yaml`.

### Gemini CLI

Gemini. Source: `google-gemini/gemini-cli`, `docs/reference/configuration.md`.

```bash
export GOOGLE_GEMINI_BASE_URL=http://127.0.0.1:8397
export GEMINI_API_KEY=rc-local-…
```

- The variable applies to `gemini-api-key` authentication and requires HTTPS **unless** the host is
  `localhost`, `127.0.0.1` or `[::1]`, which is exactly our case.
- The SDK sends `x-goog-api-key`, one of the four spellings the gateway accepts.
- `GOOGLE_VERTEX_BASE_URL` is the Vertex sibling; `GOOGLE_GENAI_API_VERSION` pins the version
  segment.

## Secondary sources, confirm before shipping

| Client                     | Dialect           | Shape                                                                                                                     | Confirm                            |
| -------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Cline, Roo Code, Kilo Code | Chat              | Provider → **OpenAI Compatible**, base URL `…/v1`, key, model id typed by hand                                            | each extension's own docs          |
| Cursor                     | Chat              | Settings → Models → OpenAI key → Override OpenAI Base URL; verify whether a loopback host is reachable for every feature  | Cursor docs                        |
| Zed                        | Chat              | `language_models.openai_compatible.recompose.{api_url, available_models[]}`, key in the keychain, env `RECOMPOSE_API_KEY` | zed.dev docs                       |
| Crush                      | Chat              | provider entry `"type": "openai-compat"`, `base_url`, `api_key`, `models`                                                 | charmbracelet/crush                |
| Aider                      | Chat              | `OPENAI_API_BASE=…/v1`, `OPENAI_API_KEY`, `aider --model openai/creative`                                                 | aider.chat/docs/llms/openai-compat |
| Goose                      | Chat              | OpenAI provider with `OPENAI_HOST` plus `OPENAI_BASE_PATH`                                                                | block/goose docs                   |
| Droid (Factory)            | Chat or Anthropic | `~/.factory/settings.json` → `customModels[]` with `model`, `baseUrl`, `apiKey`, `provider`                               | docs.factory.ai                    |
| Qwen Code                  | Chat              | `OPENAI_BASE_URL`, `OPENAI_API_KEY`, `OPENAI_MODEL`                                                                       | QwenLM/qwen-code                   |

The ChatGPT desktop app's own chat surface takes no custom endpoint; only its Codex side does,
through `~/.codex/config.toml`.

## By hand

Every dialect on one port, so the sheet can end with a curl block per dialect:

```bash
curl http://127.0.0.1:8397/v1/messages \
  -H "Authorization: Bearer rc-local-…" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"creative","max_tokens":16,"messages":[{"role":"user","content":"ping"}]}'
```

```bash
curl http://127.0.0.1:8397/v1/models -H "Authorization: Bearer rc-local-…"
```

## What the screen has to carry, per client

1. **Dialect**, because it decides which paths the client will call.
2. **Base URL spelling**, bare origin or `/v1`, because that is the single most common mistake.
3. **Where the key goes**, and which header it lands in.
4. **Where the model id goes**, and the ids this gateway actually serves.
5. **Where the setting lives**, shell versus config file, and whose file it is.
6. **How to tell it worked**: the gateway sees the request. The engine already watches traffic
   (`gateway-traffic-watch.ts`), so the screen can turn a waiting dot green on the first request
   instead of asking people to guess.

## Designs

Three alternatives, light and dark, in `designs/recompose.pen`, gathered on their own board:
the top-level frame `Connect · Three ways in` at 2020, 17260, below every other screen row. Each
column holds one alternative, its caption, and the light and dark frames:

| Column | Frames                                              |
| ------ | --------------------------------------------------- |
| A      | `Gateway · Connect sheet · Rail · Light` / `· Dark` |
| B      | `Gateway · Connect drawer · Light` / `· Dark`       |
| C      | `Gateway · Connect page · Light` / `· Dark`         |

- **A, sheet with a client rail.** A 1000 by 722 modal over the canvas: searchable rail of clients
  grouped by kind on the left, steps with copy blocks on the right, a waiting-for-first-request
  strip at the foot. Closest to the existing `Sheet` component, so the cheapest to build.
- **B, docked drawer.** A 400-wide panel beside the canvas, one client at a time, with a
  Shell / Config file / curl segmented control and a field box of the three facts. The canvas stays
  usable while wiring, matching the logs drawer and inspector already on that toolbar.
- **C, connect page.** The book button swaps the canvas for a full page: endpoint strip, filter
  chips, a grid of client cards that expands in place, and a sidebar carrying the virtual models,
  the dialect-to-path map, and the first-request card. The only shape with room for two dozen
  clients without scrolling a rail.
