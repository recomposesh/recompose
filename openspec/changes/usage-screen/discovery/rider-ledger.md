# Rider ledger scan for usage-screen

Source command, run 2026-08-11:

```
gh issue list --repo recomposesh/recompose --label rider --state all --limit 100 --json number,title,state,body
```

The call succeeded and returned 29 riders, which is the whole label (the `--limit 100`
ceiling was never approached). Relevant riders: 4. Every claim below cites the issue
number it comes from.

Search terms applied against every rider title and body: usage, telemetry, token, cost,
spend, pricing, quota, credit, balance, retention, persistence, chart, statistic,
aggregator, log, dashboard, screen, surface.

## #140 — Mock the upstream with AIMock for serving-path integration and e2e (OPEN)

Relevance: the usage numbers this feature displays are produced by proxied upstream
traffic, and #140 is the ledger's only entry on how to drive that traffic in CI without
spending money (record-and-replay fixtures with SSE for OpenAI Chat Completions, OpenAI
Responses, and Anthropic Messages), so any end-to-end proof of token or spend figures
depends on the decision #140 parks.

## #153 — rider: flaky candidates and the test-infra decisions #151 made under way (OPEN)

Relevance: #153 records the standing test-infra settings a new screen inherits, including
the Playwright visual baseline tolerance moved to `maxDiffPixelRatio: 0.015` and the
`fileParallelism: false` plus `retry: 1` vitest lanes, which govern how a chart-bearing
screen's snapshots and browser specs behave under CI load.

## #123 — subscriptions:activate stands without a surface since the menu prune (OPEN)

Relevance: #123 keeps the `subscriptions:activate` channel alive on the explicit promise
that a later account-switching surface owns it, so a usage screen that shows per-account
statistics sits next to that gap and must neither grow an activate control that claims the
rider by accident nor leave a reader thinking the usage surface answered it.

## #108 — Home is a blank dotted surface when the remembered gateway has gone (CLOSED)

Relevance: #108 is the ledger's precedent that a screen state which paints nothing (no
heading, no copy, nothing for a screen reader) is a defect and that closing it needed new
screen copy treated as a frozen-set amendment the maintainer approves, which is exactly
the shape of the usage screen's no-traffic-yet state.

## Outside the rider label, flagged for duplication risk

These are open issues without the `rider` label, so they are not ledger entries. They are
named here only because they claim work this feature could collide with.

- #44 (OPEN, quota-aware routing mode) states in its Dependencies that it "needs
  per-account usage tracking in the engine (shared with any future usage dashboard)", and
  its open questions ask whether per-account usage state lives in memory per gateway
  process or is persisted across restarts. That is the same persistence question a usage
  screen has to answer.
- #47 (OPEN, cost-based routing mode) claims the model pricing catalog (input and output
  per-token rates, with user override for unknown or local models) and asks whether to
  ship a static table per release or fetch it dynamically; #47 also says the catalog is
  shared with #33 and "should be built once and consumed by both".
- #33 (OPEN, auto routing mode) is the second declared consumer of that same catalog
  according to #47.

## Not relevant

155, 154, 138, 137, 136, 130, 126, 122, 121, 120, 119, 118, 117, 113, 111, 110, 109, 106,
104, 103, 100, 99, 93, 92, 90.

## Conclusion

The ledger carries almost no debt in this feature's own domain: no rider mentions charts,
data-visualization tokens, log retention or persistence, credits, balance, aggregator
spend, or a pricing catalog, and the one color-token rider that could have touched chart
palettes (#90) is already closed as completed. The only rider this feature could
plausibly absorb is #140, and absorbing it is a commitment rather than a freebie, because
#140 binds itself to the parked serving path and asks for an adopt-versus-extend-the-stub
decision with an ADR either way; taking it on means owning that decision here. #153 is not
absorbable at all, it is a standing record to obey while writing the screen's browser and
visual specs, and #108 is closed, so its value is the precedent (an empty state gets copy,
and new copy is an amendment) rather than a rider to retire. What this feature must not
duplicate is clearer than what it can absorb: #123's `subscriptions:activate` channel
belongs to the account-switching surface and must stay unclaimed by a per-account usage
view, and the per-account usage tracking plus pricing catalog named by #44 and #47 are
engine-side assets those issues already claim, so building either inside the usage screen
would fork knowledge that #44 explicitly says is shared with "any future usage dashboard".
