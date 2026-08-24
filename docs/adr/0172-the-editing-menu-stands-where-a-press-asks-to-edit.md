# 0172: The editing menu stands where a press asks to edit

**Status**: Accepted
**Date**: 2026-08-24

## Context

Electron ships no context menu of its own. Every text field in the app answered a right-click with
nothing. No cut, no copy, no paste, and no spelling suggestion. A person couldn't even copy a
selected address out of a reading. The main process carried no `context-menu` listener at all, and the one right-click
menu in the whole app sat on a single row inside the router list.

The app also wants menus of its own on rows, cards, and strips. Two menus opening over one press
would be worse than the nothing that stood there before.

## Decision

**The app takes `electron-context-menu` rather than writing the menu by hand.** It's the
established package for this, and it needs Electron 30 or later against the 43 the app runs. It
carries the cut, copy, paste, undo, redo, look up, and spelling items with the labels and the order
each platform expects. Writing those by hand means writing a platform's own conventions by hand.

**The menu answers what a press landed on, never where it landed.** `editingMenuBelongs` reads the
two facts Chromium reports about the press: whether the target takes typing, and whether anything
stands selected. A field takes the menu even while empty, because paste needs no selection to offer.
Bare chrome takes none, which leaves every surface carrying acts of its own free to raise them
without a second menu opening behind.

**Searching a selection with Google stays off.** The default menu offers it. This app holds
addresses, model ids, and account identities rather than prose anyone means to look up, and the item
carries whatever a person selected out to a search engine.

**Everything else keeps the package's defaults.** Select All stays off on macOS and on elsewhere,
Inspect Element stands only in development, and the link and image items appear only over a link or
an image. Those defaults are the platform conventions the package exists to carry.

## Consequences

Every text field in the app answers a right-click the way the rest of the platform does. A person
can also copy a reading out of any surface that lets them select it.

A right-click on a surface that has no acts yet still shows nothing. That's the same nothing that
stood there before, and it goes away as each surface gains its own list.

The app now bundles a dependency for a menu, plus the small `electron-is-dev` package it reaches
for. The bundle already carries the main process whole, so the cost is the package rather than a
second runtime dependency to ship.

A field inside a surface that carries its own acts answers with the editing menu instead. That's
the right answer, because a person right-clicking inside a field asked to edit.
