# 0104: A window names the range it stands on

**Status**: Accepted
**Date**: 2026-08-14

## Context

The usage window control offers four reaches on a strip, `1h` through `30d`, and a popover holding six presets beside a calendar. Two presets, This week and This month, worked out their edges at the moment of the press and landed as `range: custom` carrying that pair. The name went nowhere. Reopening the popover marked Custom range, because the view carried a drawn pair of edges and nothing else.

The four reaching presets fared no better on screen. The popover marked Custom range alone and left every preset row unpainted, so a person reading the list couldn't tell which window they stood in.

The two halves of the popover also disagreed on what a press means. A preset committed under the press and closed the popover, while a drawn window waited for Apply. One surface, two commit models, and the faster one moved the screen before a person finished choosing.

## Decision

**The boundary windows are ranges.** `this-week` and `this-month` stand in the search vocabulary beside the four reaches and `custom`. `windowFor` opens each one at the reader's local boundary and closes it at now. A boundary window then keeps growing through the week or month it names, rather than freezing at the moment of the pick. The address carries the name, so the header prints This month and the popover paints that row.

**Every act inside the popover drafts.** A preset press paints its window on the calendar and marks its row. A day press or a clock edit turns the draft into a drawn window. Apply is the only act that lands one, and Cancel leaves the standing window alone.

**The popover derives the painted row rather than remembering it.** It reads the range the view stands on, so nothing has to stay in step with anything else.

## Alternatives

- **A `preset` field beside the drawn edges**: rejected. It writes one fact twice, and the copy goes stale the moment the month rolls over while its edges stay put.
- **Matching the standing edges against each preset at open time**: rejected. The closing edge freezes at Apply and parts from now within the minute, and a month opening on a Sunday matches two presets at once.
- **Leaving presets to commit under the press**: rejected. It's the faster path for a reader who knows the window they want, and it's also why a mis-aimed press already moved the screen. One popover, one commit model.

## Consequences

**Good**: what a person picks survives the popover, the address, and the reopening. A boundary window reads live, so This month covers the day a reader opens it on. The picker paints a row for every window it can stand in, whether drawn or named.

**Bad**: the vocabulary is wider, so every exhaustive table over it grows. The quiet sentence, the header wording, and the word a tile uses for the window before this one all gain two rows. A boundary range has no honest name for that earlier window, so a tile compares against "prev window" rather than against a width. An address written last month and opened this month now lands on this month. That's the point of the name, and it still changes what a stored address means.
