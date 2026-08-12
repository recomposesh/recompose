# Brainstorm: locked decisions (2026-08-11)

Interactive brainstorm with the maintainer, folding the discovery briefs (research.md, code-map.md, cliproxyapi-research.md, mobbin-references.md). Each decision below is maintainer-confirmed.

1. **Tier: full** (upgraded from standard at this brainstorm). The feature spans engine → contracts → main → renderer with a new persisted store and widened contracts, which is the rubric's full definition. Candidate panel and rider-ledger arm run before the design document.

2. **Information architecture: single usage explorer + URL-carried scope filter.** The sidebar Usage page is the only full analytics surface: time-range picker, stat tiles, group-by time series, breakdown table following the domain hierarchy (gateway → virtual model → real model → provider → account). Gateway and provider surfaces get compact summary cards that deep-link into the pre-filtered Usage page via typed search params. No duplicated analytics surfaces.

3. **Persistence: bucketed usage ledger in the main process.** Usage accrues into hour/day buckets persisted through the existing JSON storage architecture (ADR-0016 lineage; per-bucket writes, not per-row). No database dependency. Raw rows stay in the existing in-memory ring.

4. **The settings log-retention control returns.** The parked retention row in settings becomes a live control in this change, wired to the new ledger's retention. The settings spec forbids a control nothing reads, so the control and the ledger land together.

5. **Cost ban narrows.** The gateway-telemetry ban ("no cost figure appears anywhere") narrows to the footer and log drawer in the delta. The usage screen becomes the single cost surface, at daily granularity only (mirrors Anthropic's own refusal to price finer than a day).

6. **Dual cost semantics.** API-key traffic shows real estimated cost from a synced price map. Subscription traffic shows an equivalent-cost figure ("what this would have cost via API") always marked with the approximation prefix. Totals keep the two distinguishable.

7. **Price source: LiteLLM price map** (`model_prices_and_context_window.json`, raw GitHub fetch with a bundled fallback), the ecosystem standard. models.dev noted as an alternative if LiteLLM's shape disappoints.

8. **Quota section shows everything derivable, honestly labelled.** Per-account 5-hour and weekly window burn derived from local logs, plus aggregator credit balance where a credential-scoped endpoint exists (OpenRouter credits, staleness-labelled). Every estimated figure carries the approximation prefix; no claim of official remaining quota, since no first-party API exists.

9. **Token split survives the IPC boundary.** The engine already parses input/output/cache-read/cache-write/reasoning tokens per dialect (provider-usage.ts); the row or aggregate contract widens so the split reaches the renderer instead of collapsing to one number.

10. **Charts: hand-rolled SVG + a scale package (d3-scale or @visx/scale), no chart framework.** Follows ADR-0086's headless principle and the ghost-graph precedent. Printed values double as the accessibility escape hatch (WCAG 1.4.11). Recharts rejected.

11. **Shared log-row shaping moves down before the page consumes it.** traffic-aggregates, footer-readings, and log-scope logic extract from pages/gateway-canvas to shared/entities layers as a preparatory refactor, keeping FSD's no-cross-import rule intact.

12. **Bucket-width ladder from vendor prior art.** Minute/hour/day widths with capped bucket counts (Anthropic's granularity ladder as reference), cached tokens broken out from uncached, request count beside token count.

13. **Approach: the synthesis** (maintainer-picked from the candidate panel, 2026-08-11). Approach C's screen (metric tiles doubling as chart selector, SVG chart with a data-table twin, hatch-textured equivalent-cost series, drill-down breakdown following the domain hierarchy, quota meters with the busiest-window denominator, two-plane live/ledger seam with closed-buckets-only reports) on approach A's data spine (single usage.json hour-bucket ledger with tuple-keyed buckets, three invoke channels, no push event, group-by folded in the renderer, day folded in main) hardened with approach B's correctness laws (settled-once accrual through an onRow observer on the logs desk, accruedThrough plus recentRowIds replay guard, conservation/order-independence/idempotence property laws with deterministic twins). Quota algebra computes in main. Latency ships as average only; histograms, TTFT, status maps, client-key views, push freshness, and monthly shards are recorded escape hatches, not v1 scope.
