# The explorer reads the hour it stands in

## Why

The explorer showed nothing all afternoon, and the calendar drew the wrong window.

A report answered closed hours only. The hour a person stands in never rode an answer. A request served at 14:05 therefore stayed invisible until 15:00. Every window wider than the live hour read as empty for as long as an hour after the traffic landed.

Replaying one profile's ledger against the shipped code proves it. At 14:53 the ledger held seven requests, all served into the 14:00 hour. `This week` and `This month` each folded zero buckets and zero requests. Both windows read as broken because the profile's only traffic sat in the hour the report refused to carry.

The poll made it worse rather than better. Freshness stood at the pace a bucket closes, a minute for the hour-wide ranges and five for the day-wide one. That's the pace of the answer rather than the pace of the question. A person watching the explorer sends a request and looks back at the screen within seconds.

The calendar drew a window nobody asked for. Both edges of a settled window reached the calendar library as a complete range, and a complete range is one the library only ever widens. Drawing `Aug 20` to `Aug 25` over a window standing at `Aug 1` to `Aug 13` gave `Aug 1` to `Aug 25`. The first press moved the closing edge instead of opening a window of its own.

## What changes

- A report carries the hour still filling beside the closed ones, so a request that just settled rides the next answer.
- The report poll stands at five seconds, and runs only while a surface reads it.
- The first day pressed on the calendar opens a window over itself, and the press after it closes that window. A third press starts over.

## Impact

- Affected specs: `usage`
- Affected code: `apps/desktop/src/main/usage`, `apps/desktop/src/renderer/src/shared/api/usage.ts`,
  `apps/desktop/src/renderer/src/pages/usage/lib`, `apps/desktop/src/renderer/src/pages/usage/ui`
