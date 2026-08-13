# A card summary stops paying the explorer's pace

## Why

Record 0096 moved every report poll to five seconds. Its own Consequences named the cost: the pace runs wherever a surface reads a report, the gateway and provider cards among them. Those cards print one line, `N requests in the last 24 hours`, and read a whole 24-hour report to reach it.

Measuring the payload settles it. A report of 24 hours at three tuple shapes, priced and serialized the way the channel sends it:

| Setup                                     | Tuples | Buckets | Payload     | At five seconds |
| ----------------------------------------- | ------ | ------- | ----------- | --------------- |
| One gateway, two virtual models           | 2      | 48      | 17.9 KiB    | 3.6 KiB/s       |
| Three gateways, four models, two accounts | 24     | 576     | 214.3 KiB   | 42.9 KiB/s      |
| Six gateways, eight models, four accounts | 192    | 4,608   | 1,714.5 KiB | 342.9 KiB/s     |

A heavy profile therefore pushes 1.7 MiB across the channel every five seconds to keep one sentence on a card current. The fold itself costs 1.31 ms, so the weight is the crossing rather than the reading.

The pace belongs to the surface. A person at the explorer sends a request and looks straight back at the screen. A person reading a card wants a number that stands.

## What changes

- The report options keep the minute a card wants.
- The explorer reads through its own options at five seconds, under the summary's key, so the two share one cached read.

## Impact

- Affected specs: `usage`
- Affected code: `apps/desktop/src/renderer/src/shared/api/usage.ts`,
  `apps/desktop/src/renderer/src/pages/usage/model/use-window-buckets.ts`
