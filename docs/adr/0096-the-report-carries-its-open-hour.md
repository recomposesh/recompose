# 0096: The report carries its open hour

**Status**: Accepted
**Date**: 2026-08-13

## Context

Record 0087 built the usage ledger around one rule. A report answers closed buckets, and the hour still filling never rides an answer. Two things followed. Freshness polled at the pace a bucket closes, a minute for the hour-wide ranges and five for the day-wide one. The renderer folded a live plane of its own for the `1h` view, and the seam between the two planes sat on the hour boundary.

That rule reads well and serves nobody. A person sends a request at 14:05 and looks at the explorer. Every window wider than the live hour reads as empty until 15:00. The record's own Consequences named a smaller version of this cost, that a closed bucket can sit up to one `staleTime` width before it draws. It missed the larger one. A bucket that hasn't closed can't draw at all.

One profile's ledger measures it. At 14:53 the ledger held seven requests, all in the 14:00 hour, and nothing else. `This week` and `This month` each folded zero buckets and zero requests. Both windows read as broken, and so did every range except the live hour.

The seam bought nothing in return. Only the `1h` view reads the renderer's live plane, and it never reads a report. No view has ever read both, so nothing was at risk of counting twice.

The window calendar carried a second defect of the same shape, a rule stated in the library's terms rather than the reader's. A settled window reached `react-day-picker` as a complete range. Its `addToRange` only ever moves one edge of a complete range. Pressing `Aug 20` on a window standing at `Aug 1` to `Aug 13` gave `Aug 1` to `Aug 20`.

## Decision

**A report carries its open hour.** `usage:report` answers every hour bucket inside the range, the filling one among them, and folds it onto the reader's day like any other. A settled row rides the next answer. The renderer's live plane stays where it stands for the `1h` view, which wants minute width rather than freshness. No view reads both planes.

**The poll stands at the pace of the question.** Five seconds, every range. A report is an in-memory fold behind one channel call. The interval runs only while a mounted surface reads the query, so leaving the explorer stops it. The old cadences described how fast the answer changed. This one describes how fast a person asks.

**What a calendar press means belongs to recompose.** The grid, its keyboard walk, its month navigation, and its day names stay the library's. The press rides out as the day it landed on, and a fold of this project's own decides the window. The first press on a settled window opens a new one over that day, and the second closes it. A press behind the opening edge reopens the window there. A third press starts over. Both edges keep the clock they already stood at.

## Alternatives

- **Merging the live plane into every window instead**: rejected. It reaches the same freshness through the renderer holding two sources per view. It also wants a second tuple-key vocabulary to reconcile, and a floor to keep the rolling hour off the last closed one. The ledger already holds the filling hour in memory, so reading it takes the shorter path.
- **Pushing report changes on accrual**: rejected under record 0087's reasoning, which still holds. A five-second poll of an in-memory fold costs less than a subscription registry in main.
- **Leaving the poll per range and only carrying the filling hour**: rejected. A minute is still long enough to read as broken to someone who just sent a request.
- **Passing the calendar a partial range so its own walk starts over**: rejected. The drawn window then has no closing edge to carry a clock, and the footer's two clock fields and the span wording all read one.

## Consequences

**Good**: the explorer answers the question a person is actually asking, which is what they just did. An empty window now means an empty window. The calendar draws the range pressed rather than the range the library inferred. The drawing rule sits in a fold with its own specs rather than inside a component.

**Bad**: a report's newest bucket is now partial by design, so a figure over the standing hour moves under a reader rather than settling. The five-second poll runs wherever a surface reads a report, the gateway and provider cards among them. Record 0087's poll-over-push decision stands, but its stated ground no longer does. The ground is now that a poll of an in-memory fold costs less than a push registry.
