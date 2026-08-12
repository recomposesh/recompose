# Mobbin references: usage screen

Session-run Mobbin arm. Query: "API usage dashboard with token consumption chart and cost breakdown by model" (web).

## Screens

| App              | Pattern worth copying                                                                                                                                                                                                | Link                                                            |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| OpenAI Platform  | Single Usage page: daily spend bar chart, monthly budget progress, total-token sparkline, per-capability breakdown cards, tooltip splits input/output tokens, secondary tabs for Users/API Keys                      | https://mobbin.com/screens/823e5612-9a3c-4730-b39c-406a66b583b8 |
| Grok             | Usage explorer: Total/Average/Peak stat row above cost bar chart, group-by pivot "Usage breakdown" table with per-day columns, date-range pager                                                                      | https://mobbin.com/screens/3712e4c5-f433-484b-bedc-5d3037e75217 |
| Cursor           | Cumulative spend area chart stacked by model over the billing period, group-by dropdown (By Model / Spend), 1d/7d/30d chips, CSV export, request-level table (date, type, model, tokens, cost)                       | https://mobbin.com/screens/aab19640-0c58-40f8-a349-f7f81943900b |
| ElevenLabs       | Clickable stat tiles double as metric selector for the main chart (credits, characters, cost, duration, avg cost/request, billable requests), group-by + granularity + cumulative controls, TTFB latency chart below | https://mobbin.com/screens/e7f2ccad-19e6-422a-aecc-a2f2b5608d87 |
| StackAI          | Master-detail breakdown: ranked top-models list on the left, selected model's tiles (total/input/output tokens) and trend charts on the right                                                                        | https://mobbin.com/screens/f8036549-dfca-47ba-ba1f-44d41785a60d |
| Firecrawl        | Quota framing: progress meters per pool (credits, tokens) with "resets on" copy, current-billing-cycle section above historical usage                                                                                | https://mobbin.com/screens/4aa89c74-3071-4189-ae9a-1b1bef2007cb |
| Google AI Studio | Overview cards pairing request count with success-rate line on a dual axis; errors card beside it; project + time-range filters                                                                                      | https://mobbin.com/screens/d1d95ce0-c8cf-4e79-8f83-2e63b9271789 |
| Cohere           | Billing & Usage: big subtotal number, endpoint filter, flat per-row usage table with units                                                                                                                           | https://mobbin.com/screens/8d161d80-93a3-4ccc-8a3e-539f95175901 |
| WRITER           | Token usage by category as stacked bars, token usage by model as horizontal ranked bars                                                                                                                              | https://mobbin.com/screens/f9487f47-07b7-4189-aa89-f4fc5bb88858 |
| Exa              | Activity vs Spend tabs, per-capability small-multiple cards                                                                                                                                                          | https://mobbin.com/screens/6d75dd84-e20f-49e8-a4fd-3f6521787e20 |

## Dominant pattern

Mature platforms concentrate analytics on ONE usage explorer (time range, stat tiles, group-by time series, breakdown table) instead of scattering full stats across entity pages. Drill-down happens through filters/group-by, not separate surfaces. Quota meters live as a distinct section or page region with reset countdowns.

## Locked with maintainer (brainstorm)

1. Single explorer + URL-carried scope filter; gateway/provider surfaces get compact summary cards that deep-link into the pre-filtered Usage page.
2. Subscription quota-window section ships in v1 (per-account window fill bar + reset countdown), derived from local logs.
3. Dual cost semantics: API-key traffic shows real estimated cost (LiteLLM price map), subscription traffic shows equivalent cost with a distinct ≈ label; totals keep the two distinguishable.
