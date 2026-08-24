# 0175: One act list stands behind both ways into a menu

**Status**: Accepted
**Date**: 2026-08-24

## Context

Three rows on the providers page already hand their acts to `OverflowMenu`, the control at a row's
trailing edge. Those same acts are what a person looks for by right-clicking the row. Writing the
list twice for one row means the two drift the first time an act joins one of them.

Base UI builds its context menu out of the same item component its menu uses, so one drawing serves
both.

## Decision

**A surface declares its acts once, as `MenuAction`.** The type moved out of `OverflowMenu` into
`shared/ui/menu-action.tsx` beside `menuActionItems`, which draws a list of them. Both the trailing
control and the new `ContextMenu` render that one drawing, so an act added to a surface appears in
both ways in without anyone remembering to add it twice.

**The surface itself is the trigger, not a box around it.** `ContextMenu` passes the caller's
classes and element straight to the Base UI trigger, so a row keeps the layout it already had and a
list item stays a list item.

**Menus carry flat acts and nothing else.** No submenus, no radio groups, no checkable rows. An act
that needs a choice made opens the surface that already owns the choice: the inspector, a sheet, or
a dialog. Two places owning one rule is how the mode a router runs in ends up with two answers.

**A menu offers only acts the app already answers.** Every item routes to a handler that exists
somewhere else on the surface. Inventing capabilities behind a right-click is a feature, and it
belongs in its own change, where someone can design and test it as one.

## Consequences

A row that gains an act gains it in both places at once, and the two can't disagree.

`ContextMenu` stays small. A surface that later needs a submenu or a checkable row has to extend it
first. That's the point where someone decides whether a menu is the right home for that choice.

A surface passing an empty list raises an empty menu. Nothing in the app does, because every surface
that carries a menu carries at least one act it can always answer.
