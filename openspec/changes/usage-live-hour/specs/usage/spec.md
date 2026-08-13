# usage Specification

## MODIFIED Requirements

### Requirement: Reports carry the hour still filling, and the live plane folds in the renderer

The `usage:report` channel MUST answer one range of hour buckets, the hour still filling among them, folded to day width where the ask asks for days. A settled row MUST ride the next answer rather than wait for its hour to close. The ask MUST carry the range, an optional bucket width, and the reader's own day offset. A window spanning two days or less MUST ask for hour buckets. Every folded day MUST break at the reader's midnight, and an ask naming no offset MUST fold at Coordinated Universal Time (UTC). Each view MUST ask the narrowest range reaching over its window and the window standing before it, because the tiles compare the two. The renderer MUST fold the trailing hour into minute buckets from its own log-row cache, through the same accrual rule the ledger uses. Only the live-hour view MUST read that plane. No view may read both planes, which is what keeps a request from counting twice across them. Freshness MUST poll rather than push, at the pace a person watching the explorer sends requests at. The poll MUST run only while a surface reads the report.

#### Scenario: a request just served rides the next answer

- Given the explorer standing over a window wider than the live hour
- When a gateway serves a request into the hour still filling
- Then the next report carries it and every reading over that window counts it

#### Scenario: a short window asks for hours

- Given a month of served history
- When the person stands the window at the last 24 hours
- Then the ask names hour buckets and the caption says so

#### Scenario: a folded day breaks where the reader lives

- Given a reader whose midnight stands hours off Coordinated Universal Time (UTC)
- When the explorer folds a window into days
- Then each day holds the traffic of that reader's own day

### Requirement: The window either reaches back a fixed width or takes drawn edges

The range control MUST offer the live hour, the last 24 hours, the last 7 days, the last 30 days, and a custom window. A custom window MUST come from a calendar a person draws a range on, with a clock field at each edge. The first day pressed on a settled window MUST open a new window over that day rather than move either standing edge. The press after it MUST close that window. A press behind the opening edge MUST reopen the window there. A press on a window already drawn MUST start a new one. Both edges MUST keep the clock they already stood at. The calendar MUST also offer the standing presets, including this week and this month, which land as custom windows over the reader's own week and month. The calendar grid, its keyboard walk, its month navigation, and its accessible day names MUST come from a library rather than a hand-built grid. The control MUST render segments wider than the retention window inert, with the window named as the reason.

#### Scenario: a drawn range moves every reading

- Given a month of served history
- When the person draws a two-day range on the calendar and applies it
- Then every reading stands over those two days and the header prints both edges

#### Scenario: a window drawn ahead of the standing one replaces it

- Given the window stands over the first half of the month
- When the person presses a day late in the month and then a later one still
- Then the drawn window opens and closes on the two days pressed, and neither standing edge survives

#### Scenario: this week lands on the reader's own week

- Given the window stands at the last 24 hours
- When the person picks This week
- Then the window opens at the local week start and reaches the present
