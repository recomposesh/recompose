# 0091: The explorer conforms to its drawings

**Status**: Accepted
**Date**: 2026-08-13

## Context

Record 0090 built the usage explorer from the `Usage v2` frames in `designs/recompose.pen`. The built screen and those frames then read differently. Measured from the running window at the frames' own 1440 by 900, the content column stood 960 wide against the drawing's 1152. The two filters sat 90 pixels inside the surface against the drawing's 16. The chart carried a value axis, a label under all 24 of its hour buckets, and a disclosure row the frames never draw.

Frames 20, 21, and 22 are the reference the maintainer reads the screen against, so the differences read as faults rather than as license.

## Decision

**The explorer fills its surface.** The page drops `max-w-data-column` and its centering, and stands at `--spacing-explorer-top`, 62 pixels, which is what frame 20 insets its title by. The reading column stays where a reading column belongs: settings and providers keep `max-w-column` and `--spacing-page-top`. A grid of five tiles, one chart, and three panels isn't prose, and it reads as one grid only at the width the window gives it.

**The window strip clears the traffic lights only while they cover it.** The leading acts take `ps-window-controls-width` when the sidebar has gone and nothing otherwise, because the controls sit over the sidebar while it stands.

**The chart drops its value axis and paces its labels.** `labelledSlots` prints a label every `ceil(count / 7)` slots and always names the newest one. That lands a day of hours on the drawing's own seven labels, and a month of days on seven as well. The band padding falls from 0.2 to 0.1, which is the drawing's 5-pixel gap over a 42-pixel column, and a column crowns at 2 pixels. Every figure the axis stops printing still prints in the legend and in the table twin.

**The printed twin stands on the View menu alone.** The disclosure under the drawing goes. The menu tick that already opened and closed the table is now the only thing that does. The frames draw no trigger there, and the twin's promise is that every reading exists as text, not that a control for it sits under the chart.

**What no frame draws, the explorer stops drawing.** The quota strip and the credits card come off the screen. A scan of every frame in `designs/recompose.pen` finds neither one. No burn gauge, no read-at stamp, no "Derived from local logs" line, in the v1 usage frame or in any of the six `Usage v2` frames. Above the tiles they pushed the drawn grid down the window, which is what made the screen read as a different design rather than a late one. The window fold, the record marker, the balance cache, and both channels stay in main. A frame that gives either reading a home gets it back without rebuilding the machinery.

**The window picker draws its own month step.** Record 0090 gave the library the month nav along with the grid, the keyboard walk, and the accessible day names. The nav comes back to the app. `hideNavigation` turns the library's off, and a step button stands at each end of the centered span the frames put above both months. That span is where a person reads the window they're drawing. The grid, the keyboard walk, the day names, and the range logic stay the library's. Outside days stop printing, because a person can't pick one.

## Alternatives

- **Keeping the reading column and widening it**: rejected because the frames fill the window, and any cap re-opens the same argument at the next window size.
- **Keeping the disclosure and taking the frames as approximate**: rejected. The frames are the contract for this screen, and the twin keeps its home on the menu.
- **Restyling the library's nav into the span row**: tried first through CSS. The library renders its nav inside the months block, so only absolute positioning fakes the row. The buttons then stay in the accessibility tree twice, once a hand-drawn row exists beside them.
- **Taking the drawing's type as well, at 20 pixels for a tile figure and a 1.2 line height throughout**: rejected. 20 isn't a size macOS sets a text style at, and the type-scale gate holds the scale. The tighter line heights are the drawing tool's default rather than a decision, since the v1 frames set 1.45 explicitly.
- **Thinning the axis labels by collision instead of by count**: rejected because 24 labels at 11 pixels don't collide in 1124 pixels. They fit, and still read as a wall.
- **Keeping the quota strip and the credits card on the explorer as readings the frames merely forgot**: rejected once a scan proved no frame ever drew them, in either drawing generation. A reading with no drawn home is a reading looking for one, not a reading the newest drawing left out by accident.
- **Deleting the quota fold and the balance desk along with their two surfaces**: rejected because the laws behind them, the window fold and the cached reading, cost a cycle to get right and nothing about the explorer's width says they were wrong.

## Consequences

**Good**: the screen the maintainer reads against the frames now measures against them: 1152 of content, filters at the leading edge, and the chart's columns at the drawn slot. The label rule is one pure function with its own spec, so the pacing is provable rather than eyeballed. The picker prints only days a person can pick.

**Bad**: two shipped readings leave the screen with nowhere else to stand. A subscription's burn and an account's credits reach no surface until a frame draws one, and main keeps folding both for a reader who can't see them. The twin also loses its visible affordance. A person who never opens the View menu never learns the table exists, and the menu is the only place that says so. The month step now belongs to this codebase, including its labels and its focus ring, which is the cost record 0090 paid the library to avoid. The chart's tallest column also stands short of the drawn 150 pixels, because the value scale still rounds its domain up while the drawing scales to its own maximum.
