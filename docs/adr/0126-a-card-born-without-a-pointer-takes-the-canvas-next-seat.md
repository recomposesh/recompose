# 0126: A card born without a pointer takes the canvas's own next seat

**Status**: Accepted
**Date**: 2026-08-15

## Context

The canvas seats a card by its top corner. A pointer names the middle of what a person aimed at, so a card born from a dropped cable subtracts half its own height to land centered under the release. `landedOnOpenCanvas` in `canvas-gestures.ts` did that, and `birthedDraftAt` did it again for the draft the gateway's cable stands.

The gateway's plus reached the same `birthedDraftAt`, and the plus names no pointer. It handed over a seat the canvas had already worked out, so half a card came off a value that was never a pointer. A fresh draft landed at `y = -44`, above the tidy row. A second press read that seat back out of the held draft and lifted it again to `-88`, then `-132`. A draft a person had dragged to `y = 150` was re-stood at `106`, then `62`.

Two things were wrong on any reading. The drift accumulated, so where a card landed depended on how many times somebody had pressed before. It also overrode a seat a person chose by hand, which is a decision the canvas had already made room for.

Issue #234 left the repair open because it read as a placement question. It wasn't one. The canvas already had an answer.

## Decision

A card born without a pointer takes the seat `seatForNewNode` gives it, which is the free row at the foot of its own column. Only a birth a pointer named centers the card on the point.

`seatUnder` is the one place the half-card lift lives, and it takes a pointer. `birthedDraftAt` takes a seat and stands the draft at it untouched. `seatForABornDraft` works out the plus's seat: the held draft's own seat when one stands, and `seatForNewNode(MODEL_COLUMN, world.seats)` when none does.

This states no new rule. `seatForABoundCard` already seated a card born from a router's plus this way, through the same `seatForNewNode` and with no lift. The gateway's plus was the one caller reading a seat through the pointer door.

A draft already standing keeps its seat, because a second press asks to go on editing that draft rather than to move it.

## Alternatives

- **Delete the lift outright**: rejected. The lift protects a real behavior. Removing it turned four scenarios red, because a card dropped from a cable then hung below the pointer instead of standing under it.
- **Seat the plus's draft below the last card rather than at the column's free row**: rejected as a distinction without a difference. `seatForNewNode` already reads the column as it stands, so a card born under one a person dragged low follows the drag. Writing a second rule beside it would give the plus and the cable two answers to one question.
- **Lift only on the first press and remember that a draft was already lifted**: rejected. It keeps the offset and adds state to hide its accumulation, which leaves the hand-placed seat still overridden.
- **Give the plus a pointer from the last mouse position**: rejected. A keyboard press has no pointer, and reading a stale one would seat a card somewhere nobody pointed at.

## Consequences

**Good**: pressing the plus is idempotent about placement, and a seat a person chose survives it. The pointer path and the plus path now read as two named doors, so which one applies is visible at the call. One expression states the lift, where two copies stated it before.

**Bad**: the draft born from the plus now lands at `y = 0` on an empty canvas rather than `-44`. A person used to the old spot sees the card half a row lower.

Nothing enforces that a future caller picks the right door. `birthedDraftAt` takes an `XY` either way, and only the parameter name says which one it wants. A caller that hands it a raw pointer brings the hang back, and only the scenarios pinning the seat catch it.
