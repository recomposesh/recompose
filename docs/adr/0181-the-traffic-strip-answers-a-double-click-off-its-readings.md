# 0181: The traffic strip answers a double-click off its readings

**Status**: Accepted
**Date**: 2026-08-24

## Context

The strip under the canvas reads a minute of traffic. It sets its readings as selectable text on
purpose, so a person can take a reading into a bug report. It carried no control of its own. The
toolbar button and Show Logs in the Gateway menu stand the request log up.

Under a stage, an empty status strip is the stretch an editor turns its panel over from. Asking the
strip to answer a double-click collides with the selectable text, because a double-click on text is
how a person picks a word out of it.

## Decision

**The strip answers a double-click only where it carries no reading.** The listener compares the
press target against the strip itself, so the padding and the run between the readings answer while
every reading stays a reading. The trailing tally lost its spacer and took `ms-auto` instead, which
hands that whole stretch back to the strip as its own.

**It turns the log over rather than only standing it up.** The toolbar button and the menu item both
toggle, and a gesture that could only open would leave a person double-clicking at a drawer that
never closed.

**The strip stays passive.** It gains no button, no link, and nothing focusable, so the test that
pins that still holds. The gesture is a shortcut on top of two ways in that already work, and
neither of them moved.

**The listener rides the element rather than a React handler.** The lint gate rejects
`onDoubleClick`, and the title bar already reads its own double-click off a listener, so this
follows the way the app already does it.

## Consequences

The stretch of the strip a person would try answers the way they expect, and selecting a word out of
a reading still works.

A person who never tries the gesture never learns it's there. That's why the toolbar button and the
menu item stayed exactly where they were.

The gesture reaches nothing from a keyboard. Show Logs in the Gateway menu is the keyboard's way in,
and it already carried its own stroke.
