# CLIProxyAPI research: what its ecosystem teaches the usage screen

Session-run arm, maintainer-requested. Sources fetched 2026-08-11.

## What CLIProxyAPI is

Go proxy (MIT) that wraps CLI/subscription AI products (ChatGPT Codex, Claude Code, Grok Build, Antigravity/Gemini, Kimi) as OpenAI/Gemini/Claude-compatible API services, with OAuth per account and round-robin multi-account load balancing. Same problem space as recompose's gateway.

- Upstream: https://github.com/router-for-me/CLIProxyAPI
- Management API docs: https://help.router-for.me/management/api
- Built-in `/management.html` UI covers config editing, auth-file upload, OAuth flows, request/response logs, and Gemini quota checks. No charts, no cost, no usage statistics: https://knightli.com/en/2026/05/24/cliproxyapi-management-center/

## Architectural signal

Since v6.10.0 upstream REMOVED built-in usage statistics and delegates to companion dashboards fed by a Redis-compatible usage-event queue (`usage-statistics-enabled: true`). The ecosystem immediately grew four dashboards, which shows usage visibility is the most demanded capability around this kind of gateway. recompose ships a desktop app, so the usage screen belongs in-app; the lesson is the metric taxonomy, not the topology.

## Metric taxonomy (CPA Usage Keeper, the most complete companion)

https://github.com/Willxup/cpa-usage-keeper

- Per-request event: model, API key, source, result, tokens, cache usage, latency, TTFT, timestamp. Raw rows in `usage_events`, nightly archival past 90 days.
- Overview metrics: requests, tokens, cost, cache usage, success rate, RPM, TPM, latency; filterable by time range, model, API key, source, result.
- Analysis views: usage trends, cost composition, model/key/provider mix, hourly heatmaps, latency diagnostics.
- Per-credential (auth file) and per-provider views with health inspection and scheduled quota refresh.
- Scoped read-only usage view per API key.

## Other companions

- cliproxyapi-usage-dashboard: local-first SQLite collector, daily/recent windows by account and model, Codex 5h/7d quota remaining. https://github.com/zhanglunet/cliproxyapi-usage-dashboard
- CPA-Manager: request-level monitoring, cost estimates with editable model prices and one-click LiteLLM price sync, account-pool quota detection and cleanup suggestions.
- playful-proxy-api-panel: restored `/v0/management/usage`, cache hit rate, first-byte latency, average latency, TPS, per-model/per-API rollups. https://github.com/daishuge/playful-proxy-api-panel
- cliproxyapi-dashboard (Next.js): quota tracking per provider with Telegram alerts. https://github.com/itsmylife44/cliproxyapi-dashboard

## Cost: the off-the-shelf answer

The ecosystem standard is LiteLLM's price map, fetched from
https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json
(`input_cost_per_token`, `output_cost_per_token`, cache-token fields, per-model entries with `source` links to official pricing pages; auto-updated by CI). CPA-Manager syncs it one-click; LiteLLM itself fetches it at runtime with a bundled fallback and rejects tiny custom maps. recompose should consume this dataset rather than hand-maintaining a price table.
Docs: https://docs.litellm.ai/docs/completion/token_usage , https://docs.litellm.ai/docs/proxy/custom_pricing

## Ideas ranked for recompose

1. Usage explorer metrics: requests, input/output/cache tokens, cost, success rate, latency, TTFT; time-range + scope filters. (Ships in this feature.)
2. Subscription quota windows (5h/weekly fill + reset countdown) per account. (Locked into v1 scope at brainstorm.)
3. LiteLLM price-map sync for cost estimation, editable overrides later. (Locked: dual cost semantics.)
4. Hourly heatmap, latency diagnostics, per-client-key scoped views, CSV export. (Later riders.)
5. Account-pool health/cleanup suggestions. (Separate feature territory.)
