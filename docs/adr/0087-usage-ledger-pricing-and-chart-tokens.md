# 0087: Usage ledger in main, LiteLLM pricing, poll-over-push, and the chart tokens

**Status**: Accepted
**Date**: 2026-08-12

## Context

The usage screen answers four questions at once: what the gateways served, what it cost, how fresh the reading is, and how the chart paints it. Record 0016 wrote usage logs into an engine-owned `node:sqlite` database, but the settled authority moved since then. Main's logs desk owns the final word on every row, including the interrupt rewrites the engine never sees. Prices, freshness, and chart colors had no decision at all. This record carries the four that the usage feature forced, and it amends record 0016's usage-log line rather than sitting beside it.

## Decision

**The ledger lives in main as hour buckets in one document.** Main owns `userData/usage.json`, tuple-keyed hour buckets under the shipped atomic-write and quarantine paths, no database dependency. The logs desk tells the ledger each row exactly once, at the moment the row settles. Bucketed accrual writes per flush, not per request, and retention prunes on every flush. If the tuple space grows the document past comfort, the recorded escape hatch is a per-month shard split.

**Prices come from the LiteLLM map with a vendored fallback.** The LiteLLM price map is the source, fetched from its raw GitHub address on a 24-hour refresh, cached in `userData`, with a vendored snapshot serving a first boot offline. Cost computes only in main, only at answer time, so a corrected price rewrites history on the next report. Issues #44, #47, and #33 name the same catalog, so this pipeline builds once and those issues consume it.

**Freshness polls, and no push channel exists.** Reports answer closed buckets, so nothing a push could carry changes faster than a bucket closes. TanStack Query polls with `staleTime` tied to the bucket width, and the renderer re-derives the live plane from its own row cache. The channel surface stays at three pull channels, and main keeps no subscription registry.

**The series and meter colors enter the design system as tokens, and the chart draws through `@tanstack/charts`.** Seven `light-dark()` tokens land in the theme before any component consumes them, beside the hatch geometry and a wider data measure. The seven: `--color-series-input`, `--color-series-cached`, `--color-series-output`, `--color-series-cost`, `--color-series-cost-equivalent`, `--color-series-errors`, and `--color-meter-fill`. Each clears 3:1 against `--color-surface-card` in both schemes, and each stands apart from the domain role tints. The values author in the recompose-design-system project first. The chart itself renders through `@tanstack/charts` with `@tanstack/charts-scales` and `@tanstack/react-charts`, pinned exact, by maintainer directive on 2026-08-11. The library carries the band and linear scales, implicit stacking, axes, the tooltip, and the retention-edge rule. The drop-oldest fold and the hatch pattern stay recompose's own code.

## Alternatives

- **The engine-owned `node:sqlite` store, as record 0016 wrote**: rejected because the accrual authority and the retention setting both live in main. A second store would fork the settled predicate.
- **Raw row persistence**: rejected as unbounded and needless when buckets answer every locked reading.
- **models.dev as the price source**: the standing alternative if LiteLLM's shape disappoints, not adopted now.
- **A hand-kept price table per release**: rejected because it forks the knowledge #47 says gets built once.
- **A `usage:changed` push per accrual**: rejected because the open bucket never rides an answer, so the push would mostly announce nothing a reader may draw.
- **Reusing the domain role tints for series**: rejected because every saturated theme token already carries a domain meaning, and a chart would overload it.
- **Hand-rolled SVG over `d3-scale`**: the solution design's own choice, superseded during implementation because the maintained library owns exactly the parts a chart gets wrong by hand, and the repository already trusts the TanStack family through Router, Query, Form, and Virtual. `d3-scale` left the dependency list with its types.

## Consequences

**Good**: one document under the shipped storage paths, no database dependency, and a restart replays nothing twice. Prices refresh daily, a first boot prices offline, and a corrected price rewrites history instead of freezing a wrong figure. The channel surface stays small and main keeps no push registry. The series colors serve every future chart with proven contrast in both schemes. The chart follows the Human Interface Guidelines (HIG) through named charts, printed descriptions, and the caption-and-twin reading path.

**Bad**: the tuple space can outgrow one document, and the shard split stays a hatch rather than shipped code. A wrong upstream price prints wrong money until its next refresh, and the vendored snapshot ages between releases. Polling means a closed bucket can sit up to one `staleTime` width before it draws. Three new dependencies enter the license sweep and the update treadmill, `MIT` licensed, at a `0.x` version whose API may still move.
