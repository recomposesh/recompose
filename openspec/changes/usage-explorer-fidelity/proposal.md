# Usage explorer fidelity

## Why

The usage explorer shipped against the Usage v2 drawings, and the built screen reads differently from
them. The drawings sit in `designs/recompose.pen` as frames 20, 21, and 22, and three gaps stand
between them and the build:

- The explorer stands in a 960-pixel reading column while the drawing fills the window. Every tile,
  the chart, and all three panels come out narrow, and a target name truncates where the drawing has
  room for it.
- The window strip holds its acts clear of the traffic lights even while the sidebar covers them, so
  the two filters sit 90 pixels inside the surface rather than at its leading edge.
- The chart carries a value axis, a label under every hour, and a data-table trigger the drawing
  never draws. The axis gutter takes width the columns want, and 24 hour labels crowd a row the
  drawing paces at four.

The search field, the filter menus, and the window picker all work. They read as broken for three
reasons. The picker's month step sits where the drawing puts a centered span, the search field has
no magnifier, and the picker prints surrounding months a person can't pick.

## What changes

- The explorer fills the surface it stands on, at the drawing's own top inset.
- The window strip's leading acts stand at the surface's leading edge while the sidebar covers the
  traffic lights.
- The chart drops its value axis, paces its bucket labels to a reading few, widens its columns to the
  drawing's slot, and crowns them at the drawing's radius.
- The printed table twin stands on the View menu alone. The chart no longer carries a disclosure
  trigger under its drawing, and the menu tick still opens and closes the same table.
- The filter menu's search field carries a magnifier, and its rows sit at the drawing's gap.
- The window picker draws its own month step beside a centered span, keeps its months to the ones a
  person can pick, and drops the picker glyph inside each clock field.

## Non-goals

- The quota strip and the balance card keep their place above the tiles. The drawings show neither,
  because the drawn session holds no subscription quota, and neither reading loses its home here.
- The metric tile keeps the 22-pixel figure the type scale offers. The drawing sets 20, which the
  macOS text-style scale doesn't carry, and the scale governs.
