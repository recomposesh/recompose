# 0092: The axis stands for the window, and a quiet window says so

**Status**: Accepted
**Date**: 2026-08-13

## Context

The usage chart drew the buckets the ledger returned, and nothing else. A window a person drew from August 5 to August 12 came back as one column filling the plot. One day carried traffic, and the band scale inferred its domain from that single datum. The axis printed one label. Nothing said the other seven days stood quiet, so the drawing read as a week of traffic rather than as one busy day inside a quiet week.

A window that folded to nothing read worse. The tiles printed zeros, the chart drew an empty box, and all three panels stood as empty cards. Frames 26 to 29 in `designs/recompose.pen` answer that state. The maintainer picked frame 29. It follows what Apple's own apps do: a symbol in secondary ink, a short title, one sentence, and a plain text link rather than a filled button.

## Decision

**The chart draws every slot the window opens over.** `windowSlots` names each slot between the window's edges, at minute, hour, or day width. The fold pads its bars across them. A quiet slot keeps its place and its label, and adds nothing to any total. A day slot breaks at the reader's own midnight, which is where the report folds its days.

**The band scale takes a configured domain rather than an inferred one.** `SeriesChart` hands the scale an instance whose domain is every drawn slot. A factory would let the marks re-infer the domain from the data that materialized, which is what collapsed a week into one column.

**A window that folded to nothing prints one reading in place of the drawing.** `QuietReading` stands in the middle of the plot, over the axis the chart still draws. It carries a bar symbol in tertiary ink, a title, one sentence, and at most one act. Each breakdown panel prints `No Data` in place of its rows. The tiles keep their zeros, because zero is the reading.

**The two silences carry different words.** A profile that has never served a request reads `No Requests Yet`, and says a request through a gateway collects here. It offers no act, because no window is wide enough to find traffic that never ran. A window that served nothing reads `No Requests` and names the window in the reader's own words. It offers exactly one way out: the filters come back first where any stand, and otherwise the window widens one step. The widest range the ledger keeps offers nothing.

**The promise state leaves the view model.** A first launch is a readings view whose fold came back empty rather than a fourth state. The tiles, the chart, and the panels then stand in every case that has an answer to draw.

## Alternatives

- **Padding the report in main instead of the renderer**: rejected because the ledger stores what a gateway served, and a channel returning fabricated empty buckets makes every caller carry them. The window belongs to the view.
- **Emitting zero-valued rows so the scale infers the whole window**: rejected because a zero row is a mark the tooltip and the table twin would both have to hide again.
- **Keeping the promise card as its own state**: rejected because the frames draw one grid, and a state that replaces the whole body hides zeros a first launch can already read.
- **One empty wording for both silences**: rejected by the maintainer. "Widen to 7 days" is a lie on a profile that has never served a request.
- **A filled primary button in the empty chart**, the way frame 27 drew it: rejected. It duplicates the range control already standing in the window strip, and Apple's own empty screens offer a plain link.

## Consequences

**Good**: a drawn window reads as the window a person drew, quiet days included. The empty screen stops reading as a broken screen, and it says which of the two silences it is. The slot rule and the recovery rule are pure functions with their own specs, so the pacing and the wording are provable rather than eyeballed.

**Bad**: the renderer now pads up to 1,500 slots per draw, which is work the report never did. A month of hour buckets sits under that ceiling, and the ceiling truncates anything past it without a word rather than refusing. The quiet reading also overlays the plot absolutely, so a chart panel that ever changes its plot height has to move the overlay with it.
