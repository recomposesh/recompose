# 0097: The poll pace follows the surface, not the range

**Status**: Accepted
**Date**: 2026-08-13

## Context

Record 0096 moved every usage report poll to five seconds. It named the cost in its own Consequences: the pace runs wherever a surface reads a report, the gateway and provider cards among them. That reads as a small price until someone weighs the payload.

A card prints one sentence, `N requests in the last 24 hours`, and reads a whole 24-hour report to reach it. A report is one bucket per tuple per hour, so its weight follows the tuple space rather than the sentence:

| Setup                                     | Tuples | Buckets | Payload     | At five seconds |
| ----------------------------------------- | ------ | ------- | ----------- | --------------- |
| One gateway, two virtual models           | 2      | 48      | 17.9 KiB    | 3.6 KiB/s       |
| Three gateways, four models, two accounts | 24     | 576     | 214.3 KiB   | 42.9 KiB/s      |
| Six gateways, eight models, four accounts | 192    | 4,608   | 1,714.5 KiB | 342.9 KiB/s     |

The fold costs 1.31 ms at the widest shape, so the weight sits in the crossing rather than in the reading. A heavy profile standing on the Gateways screen therefore pays 1.7 MiB every five seconds for a sentence that moves once an hour.

Record 0096 read the pace off the data. The data isn't what sets it.

## Decision

**The pace follows the surface.** A person at the explorer sends a request and looks straight back, so the explorer polls at five seconds. A person reading a card wants a number that stands, so a summary polls at a minute. Neither pace is a property of the range or of the bucket width.

**Two named option sets, one key.** `usageReportQueryOptions` carries the minute a summary wants. `watchedUsageReportQueryOptions` spreads it and overrides the two freshness fields. The key stays the summary's own, so an explorer and a card mounted together share one cached read rather than opening two. The route loader warms through the watched options, so the warm read and the mounted read agree on freshness.

This supersedes record 0096's poll clause alone. Everything else it decided stands. A report still carries its open hour, and the calendar press still belongs to recompose.

## Alternatives

- **A `freshness` parameter on the one factory**: rejected. A caller passing a number says nothing about why, and the two paces are two named readings rather than one dial.
- **A narrower channel answering the card its one count**: rejected for now. It's the right shape if a card ever needs more than a count. A new contract, handler, and specs cost more than naming a second pace, and the minute already sat there before record 0096.
- **Dropping the card's poll entirely**: rejected. The query already reads again on mount and on focus, so a card would seldom be wrong. A screen standing open through a busy hour would still print a figure that never moved.
- **Leaving five seconds everywhere and watching for a complaint**: rejected. The measurement is the complaint.

## Consequences

**Good**: the explorer keeps the freshness that record 0096 gave it, and no other surface pays for it. The two paces read as two decisions with names rather than as one constant. The shared key means the cost of watching is the poll alone, never a second copy of the report.

**Bad**: a second exported options factory stands beside the first, and a reader has to know which surface wants which. Freshness now lives in two places rather than one, so a third surface with a third pace would want a better shape than a third export.
