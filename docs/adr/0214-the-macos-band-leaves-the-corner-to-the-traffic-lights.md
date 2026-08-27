# 0214: The macOS band leaves the corner to the traffic lights

**Status**: Accepted
**Date**: 2026-08-27

Supersedes [0210](0210-the-sidebar-band-carries-the-brand-wherever-the-app-draws-its-own-chrome.md).

## Context

Record 0210 read the empty room beside the traffic lights as a corner somebody forgot, and put the
app's mark in it. Shipped, the mark reads as clutter. Three colored dots and a small blue tile now
share 36 pixels of height, and the tile is the only one of the four a person never clicks.

The reasoning behind 0210 held that the band stands in for a hidden title bar, so it owes a person
the app's name. On macOS that debt is already paid twice over. The menu bar spells `recompose` at
the top of the screen for as long as the app holds focus, and the Dock carries the same drawing the
mark comes from. Neither is a thing the window has to repeat in its own leading corner.

The Mac convention it broke is older than the band. Finder, Mail, Xcode, and Safari all leave that
corner to the window controls and nothing else. An app that puts its own badge there is naming
itself in the one place the platform reserves for acting on the window.

## Decision

**On macOS the band carries the sidebar control alone, and nothing at its leading end.** `brandFor`
returns a brand only where the window controls take the trailing edge. Windows and Linux keep the
full lockup, which is what their hidden title bar took away and what nothing else on those
platforms says.

**A lone control on macOS stands at the trailing end.** `bandAlignmentFor` spreads `trailing` to
both edges, pushes `leading` to the trailing edge, and keeps `none` at the leading edge. Left on
`justify-between` with the brand gone, the control would slide under the traffic lights it now
stands clear of.

**The brand's own clearance goes with the brand.** `bandLeadInsetFor` existed to hold the mark past
the 90 pixels the traffic lights claim. Nothing stands there to hold, so the helper goes and the
Windows lockup carries its ordinary padding inline. Nothing touches the toolbar's clearance, which
still lifts when the sidebar goes out from under the controls.

## Consequences

**Good**: the macOS corner reads the way every other Mac window's does. The band loses a badge that
answered to nothing and repeated what the menu bar already said. One platform's brand artwork now
lives in one place, so the two-artwork drift 0210 accepted goes away.

**Bad**: the macOS band carries a single control again, which was the reading that produced 0210's
report in the first place. That reading stands rejected on convention rather than on measurement,
and it may come back the next time somebody meets the empty corner cold.

## Alternatives

**Keep the mark and shrink it.** Rejected because size was never the complaint. A badge that answers
to no click is out of place in that corner at any size.

**Move the brand into the sidebar body, under the band.** Rejected on the same ground 0210 rejected
it. The move pushes every navigation row down by the height of a title bar the window already hid,
and it buys a name the menu bar prints anyway.

**Drop the brand on every platform for one rule.** Rejected because Windows and Linux hide a title
bar that carried the app's name and put nothing in its place. There the band is the only thing left
to say it.
