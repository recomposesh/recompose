# 0090: The usage window, its filters, and the calendar that draws it

**Status**: Accepted
**Date**: 2026-08-12

## Context

Record 0087 built the usage explorer around a range and a drill. Four preset ranges answered from the ledger. A breakdown table narrowed the view one hierarchy level at a time.

The `Usage v2` frames in `designs/recompose.pen` replace both. A person picks the gateways and the connected providers they care about, from menus that carry what each member served. A window that reaches back a fixed width becomes one a person draws on a calendar. The readings under those controls stop choosing what the chart draws.

Two of those changes reach past the renderer. A window narrower than its range's own bucket width can't read from folded days. A day folded at Coordinated Universal Time (UTC) midnight is the wrong day for everyone the ledger didn't happen to serve from Greenwich.

## Decision

**Filters replace the drill, and a provider is a connected account.** The address carries `gateways` and `providers`. Each is a list, and each stands empty while its filter stands on everything. A menu lists the members the standing window served under the _other_ filter, so narrowing one never hides what a person could still reach for. `providers` holds account ids, because a provider in this app is an account a person connected: the sidebar says so and the catalog says so. The scope path, the drill-down breakdown table, and the five-level `ScopeLevel` vocabulary leave with the drill.

**The tiles read, and the chart chooses.** Five faces headline the window. The requests face compares its window against the one standing before it. The errors face reads as a share of the requests beside it. What the chart draws moves to the chart's own control, so a figure and a series each move for their own reason. The application menu offers the four measures that control offers, because a menu item naming a series the chart can't draw is a dead pick.

**A report ask carries a width and the reader's own day boundary.** `usage:report` takes `{ range, bucketWidth?, dayOffsetMinutes? }`. A window spanning two days or less asks for hours even where the range would fold days. Every folded day breaks at the reader's midnight. A reader that names no offset still gets UTC, so a caller with no reader behind it keeps its old answer. Each view asks the narrowest range reaching over its window _and the one before it_. The requests tile compares the two, which is why the read reaches back twice.

**The calendar comes from `react-day-picker`, pinned exact.** The grid, its keyboard walk, its month nav, and its accessible day names belong to the library. Only the paint is recompose's. The library's own tokens point at theme tokens on the calendar root, and the day, weekday, and caption parts take theme classes beside the library's own.

**The new folds join the mutation gate.** Every fold the explorer reads through carries node specs. The desktop mutate list and the pipeline's diff glob both name them, which is what record 0089 asks of a fold that lives in a `lib` segment with node tests.

## Alternatives

- **Keeping the drill beside the filters**: rejected because two ways to narrow one window disagree the moment a person uses both, and the design carries only one.
- **`providers` holding provider kinds rather than accounts**: rejected because the deep link from a key row narrows to one account, and a kind would widen it without saying so.
- **A hand-built calendar grid**: written first, then replaced. A range calendar owns keyboard walking, month boundaries, outside days, and localized day names. Every one of those is a thing a hand-built grid gets wrong.
- **Sending every report as hour buckets and folding days in the renderer**: rejected because a month of hours multiplied by the tuple space rides the channel every minute.
- **Leaving day folding at UTC and saying so in the caption**: rejected because the reading serves the person at the machine, and their midnight is the one their day breaks at.

## Consequences

**Good**: one way to narrow a window, filters that read what they can reach, and a window a person draws. Days break where the reader lives. The calendar's keyboard and screen-reader behavior follows an upstream release rather than a local fix. The new folds are gate-covered, so a weakened test surfaces as a survivor rather than as silence.

**Bad**: a fourteenth dependency enters the license sweep and the update treadmill, `MIT` licensed. A view asks for twice its own window so the comparison figure stands, which doubles the buckets a report carries for the sub-day windows. The library's stylesheet joins the base layer. Its variables need re-pointing on the calendar root rather than on the wrapper, because the library sets its own defaults there.
