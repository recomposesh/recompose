# usage Specification

## MODIFIED Requirements

### Requirement: One explorer answers every usage question

The usage screen MUST stand as one explorer: a filter bar over the window, five metric tiles reading it, one chart, and three breakdown panels. The explorer MUST fill the surface it stands on rather than a reading column. A chart and three panels read as one grid only at the width the window gives them. The panels MUST fold by gateway, by virtual model, and by target. The tiles MUST read rather than steer, and the chart MUST carry its own measure and stacking controls. The requests tile MUST compare its window against the window standing before it, and the errors tile MUST read as a share of the requests beside it. The chart MUST draw its columns without a value axis, which is width the columns take instead. The chart MUST also pace its bucket labels to a reading few, while still naming its newest bucket. Every reading MUST also exist as printed text: the legend prints each series' window total, and the View menu opens a table printing every bucket the chart draws. The caption MUST name the bucket width and say that days break at the reader's local midnight. The whole view MUST live in typed search params, so a reload lands on the same view and a summary link deep-links through the same address.

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

#### Scenario: a day of hour buckets names a reading few

- Given a window a day wide drawn in hour buckets
- When the chart draws its axis
- Then a label stands every fourth bucket and the newest bucket keeps its own
