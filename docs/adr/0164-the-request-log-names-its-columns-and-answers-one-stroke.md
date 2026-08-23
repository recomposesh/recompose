# 0164: The request log names its columns and answers one stroke

**Status**: Accepted
**Date**: 2026-08-23

## Context

The logs drawer draws every request on a fixed grid. A time, a method, the model journey, the
provider, the account, a status, a duration, and the sentence a failure came to. The columns hold
their places down the run, so a person scans one column rather than hunting across each line.

Nothing said what the columns were. A reader met `POST`, then two model names, then `anthropic`, an
address, `200`, and `1.1s`. Working out the grid from the values was the reader's job. The provider
column made that worse by reading from its end, so its values raced away from each other and the eye
had no left edge to follow.

The drawer answered `Cmd+Shift+L`. That's the stroke nothing else in this app uses, and also the
stroke nothing else in any app uses. Every editor a person has open puts a panel under a stage with
the backtick.

## Decision

**A head stands over the run and names every column.** It sits outside the listbox rather than as its
first option, so the arrows that walk the rows never land on the frame. It holds still while the run
scrolls under it. It stands over an empty scope too, because a head that arrived with the first
request would move the whole list exactly when a person started reading it.

**The grid lives in one module the head and the row both read.** A head that disagreed with its
column by a pixel would point a reader at the wrong cell, so the widths and the narrow-drawer
classes live in one place. A column that leaves a narrow drawer takes its head with it, for free.

**The provider column reads from its start, like every column beside it.** A right-aligned column of
names has no left edge, and the only columns that earn one here are the ones holding figures.

**The drawer answers `Control` with the backtick, on every platform.** It's the stroke every editor
already spends on the panel under the stage, so a person reaches for it unprompted. The modifier
stays `Control` rather than `CmdOrCtrl`, because macOS keeps Command with the backtick for cycling a
program's own windows. macOS would answer the stroke before the menu ever saw it.

## Consequences

The drawer reads as a table without being one. The rows stay a listbox, because a person walks them
with the arrows and copies the one under the cursor. A grid role would promise cell navigation this
drawer doesn't offer.

`Cmd+Shift+L` no longer opens anything. It stood in 3 docs pages and one menu, and all 4 now name
the new stroke.

The status column widened by 3 pixels, so `Status` fits over it. The model journey beside it gives
them up, because it's the column that takes whatever room the rest leave.

## What this change didn't build

- Sorting, resizing, or hiding a column by hand. The grid gives way in one fixed order as the drawer
  narrows, which is a decision the drawer makes rather than one it asks about.
- A second accelerator. The menu item carries one, and the toolbar button and the drag-to-collapse
  gesture are the other 2 ways in.
