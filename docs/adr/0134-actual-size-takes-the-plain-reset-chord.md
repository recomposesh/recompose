# 0134: The plain reset chord lands on 100%

**Status**: Accepted
**Date**: 2026-08-17

## Context

The Gateway menu claimed the reset-zoom accelerator for fitting the composition, which reads as a
different operation everywhere else. Splitting the zoom group forced a choice the industry
disagrees on. The Adobe lineage puts fit on the plain reset chord and 100% on a digit. Sketch,
the browsers, and Electron's own `resetZoom` role put actual size there.

## Decision

`canvas:command` gains `zoom-to-100`. The plain reset chord lands the canvas at 100% under the
label Actual Size, and the shifted variant fits as Zoom to Fit. The app ships no toolbar, so the
system toolbar chord stays unclaimed.

## Alternatives

- **The Adobe assignment**: rejected because it contradicts the host framework's role and the
  audience's browser muscle memory.
- **Reusing `role: 'resetZoom'`**: rejected because it resets web-contents zoom rather than the
  canvas transform.
- **Figma's shifted digits**: rejected because nothing here competes with the command digits,
  which View now spends on navigation.

## Consequences

**Good**: the chord means the same thing it means in Safari, Preview, and every Chromium surface,
and the two operations stop sharing one item.

**Bad**: people arriving from Adobe tools relearn one chord. The pair stays adjacent in the menu,
so the menu itself teaches the difference.
