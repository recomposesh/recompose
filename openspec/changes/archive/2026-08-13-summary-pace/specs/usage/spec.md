# usage Specification

## MODIFIED Requirements

### Requirement: Reports carry the hour still filling, and the live plane folds in the renderer

The `usage:report` channel MUST answer one range of hour buckets, the hour still filling among them, folded to day width where the ask asks for days. A settled row MUST ride the next answer rather than wait for its hour to close. The ask MUST carry the range, an optional bucket width, and the reader's own day offset. A window spanning two days or less MUST ask for hour buckets. Every folded day MUST break at the reader's midnight, and an ask naming no offset MUST fold at Coordinated Universal Time (UTC). Each view MUST ask the narrowest range reaching over its window and the window standing before it, because the tiles compare the two. The renderer MUST fold the trailing hour into minute buckets from its own log-row cache, through the same accrual rule the ledger uses. Only the live-hour view MUST read that plane. No view may read both planes, which is what keeps a request from counting twice across them. Freshness MUST poll rather than push, and the pace MUST follow the surface rather than the range. The explorer MUST poll at the pace a person watching it sends requests at. A surface reading the same report for a one-line summary MUST poll a great deal slower, because a whole range of buckets crosses the channel on every poll. Both MUST read under one key, so the two never open two reads. A poll MUST run only while a surface reads the report.

#### Scenario: a request just served rides the next answer

- Given the explorer standing over a window wider than the live hour
- When a gateway serves a request into the hour still filling
- Then the next report carries it and every reading over that window counts it

#### Scenario: a card summary never pays the explorer's pace

- Given a gateway card printing what its gateway served today
- When the card stands on screen without the explorer
- Then the report crosses the channel at the summary's own slower pace

#### Scenario: a short window asks for hours

- Given a month of served history
- When the person stands the window at the last 24 hours
- Then the ask names hour buckets and the caption says so

#### Scenario: a folded day breaks where the reader lives

- Given a reader whose midnight stands hours off Coordinated Universal Time (UTC)
- When the explorer folds a window into days
- Then each day holds the traffic of that reader's own day

#### Scenario: the live hour never reads from the ledger

- Given a person watching the 1h range
- When a request settles
- Then the reading moves from the renderer's own row cache without a ledger read
