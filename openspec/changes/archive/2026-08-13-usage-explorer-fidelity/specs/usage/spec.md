# usage Specification

## MODIFIED Requirements

### Requirement: One explorer answers every usage question

The usage screen MUST stand as one explorer: a filter bar over the window, five metric tiles reading it, one chart, and three breakdown panels. The explorer MUST fill the surface it stands on rather than a reading column. A chart and three panels read as one grid only at the width the window gives them. The panels MUST fold by gateway, by virtual model, and by target. The tiles MUST read rather than steer, and the chart MUST carry its own measure and stacking controls. The requests tile MUST compare its window against the window standing before it, and the errors tile MUST read as a share of the requests beside it. The chart MUST draw one slot for every bucket the window opens over, whether it served anything or nothing, so a quiet day keeps its place between two busy ones. The chart MUST draw its columns without a value axis, which is width the columns take instead. The chart MUST also pace its bucket labels to a reading few, while still naming its newest bucket. Every reading MUST also exist as printed text: the legend prints each series' window total, and the View menu opens a table printing every bucket the chart draws. The caption MUST name the bucket width and say that days break at the reader's local midnight. The whole view MUST live in typed search params, so a reload lands on the same view and a summary link deep-links through the same address.

#### Scenario: the chart moves without moving the tiles

- Given the tiles headline the standing window
- When the person picks tokens on the chart's own measure control
- Then the chart draws tokens and every tile figure stands unchanged

#### Scenario: a reload lands on the same view

- Given the person filtered to one gateway with the window at 7 days
- When the screen reloads
- Then the same filters, window, measure, and stacking stand

#### Scenario: the table twin prints every reading as text

- Given a drawn chart standing without its table
- When the person ticks the data table in the View menu
- Then every bucket the chart draws prints as a row of text values, and ticking it again takes the table away

#### Scenario: the axis stands for the window rather than for the buckets that carry traffic

- Given a window drawn from one date to another, where only one day inside it served anything
- When the chart draws it
- Then every day between the edges keeps its own slot, and the busy day stands as one column among them

#### Scenario: a window that folded to nothing reads as quiet rather than as broken

- Given a profile that has served requests before
- When the standing window folds to nothing
- Then the chart prints the quiet over its own axis, each panel prints No Data, and one act offers the filters back or the next window up

#### Scenario: a profile that has never served says so in its own words

- Given a profile where no gateway has served a request
- When the usage screen opens
- Then the quiet reads as nothing served yet, and it offers no window to widen

#### Scenario: a day of hour buckets names a reading few

- Given a window a day wide drawn in hour buckets
- When the chart draws its axis
- Then a label stands every fourth bucket and the newest bucket keeps its own

## REMOVED Requirements

### Requirement: The quota strip claims only what local logs can prove

**Reason**: No frame draws the strip. The `Usage v2` frames redraw the whole explorer as a filter bar, five tiles, one chart, and three panels, and none of the six carries a burn gauge. The strip stood above the tiles in the build alone, where it pushed the drawn grid down the screen. The window fold and its record marker stay in main behind `usage:quota-windows`, ready for a drawing that gives the reading a home.

### Requirement: An aggregator balance is a reading at a moment

**Reason**: No frame draws the credits card either, and it followed the strip off the explorer. The cached reading, its read-at stamp, and the refusal sentence stay in main behind `usage:balances`. An account's own surface is where the reading belongs once a frame draws it.
