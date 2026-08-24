# 0182: The canvas reads a right-click off the document

**Status**: Accepted
**Date**: 2026-08-24

## Context

The flow library draws every card on the canvas, so no card component owns a wrapper a menu could
hang from. The cables sit even further out of reach, as paths the library renders rather than
components the page composes. The canvas behind both had nothing to right-click at all.

The stage already reads a focused card by looking for the nearest `.react-flow__node` in the
document and taking its `data-id`. The library marks both cards and cables that way.

## Decision

**One menu stands around the whole stage, and the press says what it landed on.** A capture-phase
handler on the stage reads the nearest card or cable the same way the focus reading already does,
and falls back to the canvas itself. The subject settles before the menu paints, so the acts are
already the right ones by the time it opens.

**The subject's kind comes off the id, not off a second table.** Every card and cable already
answers to a prefixed name, and the Delete press already reads them that way. A name nobody taught
this about reads as the canvas, so an unrecognized card still raises the canvas acts.

**Every act runs a gesture the canvas already answers.** Pick a target is the card's own plus. Add
a provider is the router's. Every removal raises the same question the Delete press raises. Releasing a cable runs the same
reader that decides whether letting go costs a person work, which now stands as one act both ways
in call.

**No subject offers an empty menu.** A card with nothing of its own to say still offers the
inspector and the tidy, because a press that opens an empty box reads as broken.

## Consequences

A person reaches a card's acts where they pressed, and the canvas and its cables answer as well,
which neither did before.

The reading depends on the flow library's class names. It was already depending on one of them for
focus, so this adds no new coupling, but a library that renamed them would take both readings with
it. Both readings sit in one component, which is where a rename would land.

Cards inside the menu's surface no longer reach the platform's own menu on a right-click. Nothing
on a card is editable or selectable, so there was nothing there for it to offer.
