# 0086: The log list adopts `@tanstack/react-virtual`

**Status**: Accepted
**Date**: 2026-08-10

## Context

The logs drawer lists up to 10,000 streaming request rows, newest at the top, and rendering them all breaks the frame budget. Nothing installed covers list virtualization. The repository already rides the TanStack stack through Router, Query, and Form, and the design system owns every painted pixel, so the engine must be headless. Record 0085 rides the open toolbar-drag pull request, which is why this one takes 0086.

## Decision

Adopt `@tanstack/react-virtual`, pinned exact, as the virtualization engine for the `log-list` component. Row keys are stable row ids, never indexes. The list follows the newest row only while the viewport rests at the top, and prepend stability is this feature's own code.

## Alternatives

- **Hand-rolled windowing**: rejected because scroll anchoring and measurement caching are exactly the hard parts a maintained library owns.
- **react-window**: rejected because it ships its own components rather than headless hooks and sits outside the adopted stack.

## Consequences

**Good**: ten thousand rows render inside the frame budget. The headless hook leaves the row markup and every token to the design system. The dependency family is one the repository already trusts and tracks.

**Bad**: one new dependency enters the license sweep and the update treadmill, `MIT` licensed, carrying one `MIT` transitive addition (`@tanstack/virtual-core`). The library's documented chat pattern anchors to the end, so the newest-at-top orientation takes the less-paved path. A browser test proves the viewport holds on prepend. Virtualization breaks `role="log"`, so a hidden polite live region announces batched arrivals instead.
