# 0210: The sidebar band carries the brand wherever the app draws its own chrome

**Status**: Superseded by [0214](0214-the-macos-band-leaves-the-corner-to-the-traffic-lights.md)
**Date**: 2026-08-26

## Context

The sidebar opens with a band as tall as the window controls. On Windows and Linux that band carried the wordmark lockup beside the sidebar control. On macOS it carried the control alone, and the room beside the traffic lights stood empty. The maintainer read that emptiness as a gap and asked for the brand there, the way Windows already has it.

The band exists because the window hides the platform's title bar. Where a title bar would name the app, the band has to. That reasoning never reached macOS, so one platform kept a band with nothing in it but a control pushed to the far end.

The room isn't free. The sidebar's smallest width is 200 pixels and the traffic lights claim 90 of them. What survives after the control and its padding is about 72 pixels, and the wordmark lockup measures about 106. Dropping the lockup in would run it under the control.

## Decision

**Wherever the app draws its own chrome, the band carries the brand at its leading end and the control at its trailing end.** `bandAlignmentFor` now spreads both `leading` and `trailing` the same way. Only a platform still drawing its own title bar keeps a lone control, and a lone control sits at the edge the rest of the sidebar reads from.

**macOS takes the mark alone, held past the traffic lights.** `bandLeadInsetFor` holds the brand off the leading edge by the window-controls width on `leading`, and by ordinary padding everywhere else. Windows keeps the full lockup, which fits there because its caption buttons sit at the other end.

**That inset never lifts.** The toolbar's equivalent waits on the sidebar going away, because the controls float over the bar once nothing covers them. This one doesn't. macOS floats the traffic lights over the sidebar itself, so the clearance stands for as long as the band does.

## Consequences

**Good**: no platform opens on an empty band. The brand reads where a title bar would have said the name, on every platform that hides one. macOS loses no room it was using, and the traffic lights keep every pixel they claim.

**Bad**: two platforms carry different brand artwork in the same slot, so a change to one needs a look at the other. The mark alone says less than the lockup to somebody meeting the app for the first time, though macOS already spells the name in its own menu bar.

## Alternatives

**Carry the full wordmark lockup on macOS too.** Rejected on measurement rather than taste. At the sidebar's smallest width the lockup runs under the sidebar control, and a brand that collides with a control at one width is a brand that collides.

**Leave macOS empty and call the traffic lights the chrome.** Rejected because it's the reading that produced the report. Three colored dots identify the window, never the app, and the band stands in for a title bar that names one.

**Move the brand out of the band, into the sidebar body.** Rejected because it would push every navigation row down by the height of a title bar the window already hid. It buys nothing the band wasn't holding room for anyway.
