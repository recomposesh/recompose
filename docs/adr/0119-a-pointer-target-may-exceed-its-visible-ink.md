# 0119: A pointer target may exceed its visible ink

**Status**: Accepted
**Date**: 2026-08-15

## Context

Record 0084 set the canvas accessibility contract. 24 pixel hit targets are one of its four terms.
The renderer carries that number as `--spacing-hit-target` in `theme.css`. `router-child-list`
spends it as `size-hit-target` on its move controls and its drag handle.

The Edit affordance in `editableSectionHeading` never met it. Measured from the running page at
Storybook, in both schemes, it stood 28.63 by 15.95 pixels. The width already cleared the floor.
The height missed it by 8 pixels. A pointer 11 pixels above the label's center landed on the
wrapping element rather than on the button.

Three boxes share the affordance: the gateway's General Info, the virtual model's, and the
router's. It serves the rename on all three. That sharing is why the cluster that found it left it
alone. Widening it under a router rider would have changed a surface nobody had asked about.

The obvious repair moves layout. The heading is a flex row whose height is its tallest child. A 24
pixel button therefore makes a 24 pixel heading. That drops the title 4 pixels, and pushes every
field under it down by 8.

## Decision

A control whose visible ink falls under the contract's floor carries `hit-area`. That utility
centers a pseudo-element on the control. It holds the element to at least `--spacing-hit-target` on
both axes. The pseudo-element takes the pointer on the control's behalf, and paints nothing.

The utility states the rule once, in the token's own terms. The next small control spends it,
rather than deriving an offset from whatever line height it happens to wear.

Measured from the page after the change, in both schemes:

| Reading        | Before         | After          |
| -------------- | -------------- | -------------- |
| Visible ink    | 28.63 by 15.95 | 28.63 by 15.95 |
| Pointer target | 29 by 16       | 29 by 24       |
| Heading height | 15.95          | 15.95          |

The heading height is the proof that nothing moved. It reads the same before and after. A grown
button couldn't leave it unchanged.

The pointer target stops where the contract says. Probed on the real inspector body, a point 12.5
pixels from the button's center falls through to the scrolling container. It reaches no field row,
so the halo takes nothing from a neighbor. The heading's own 6 pixel bottom margin absorbs the 4
pixel overhang.

## Alternatives

- **`size-hit-target` on the button, the way `router-child-list` spends it**: rejected. Those
  controls carry a glyph in a square, so 24 pixels is their natural shape. This one carries the
  word Edit, which measures 28.63 pixels wide. A 24 pixel square clips it, and a 24 pixel height
  moves the title.
- **A negative inset of 4 pixels on each edge**: rejected. That 4 comes from `(24 - 15.95) / 2`, a
  line height the caption token owns. Change the caption's leading and the affordance drops back
  under the floor, with nothing to catch it.
- **Reading the token inside the story assertion**: rejected. The assertion would then pass against
  any token value, including a lowered one. The story names 24 because record 0084 agreed 24. The
  spec pins the contract rather than the current configuration.
- **A snapshot of the rendered box**: rejected. A snapshot records the number without stating the
  rule. It goes green again the moment somebody accepts a smaller one.

## Consequences

**Good**: the rule has one authoritative home. A future small control spends `hit-area` instead of
computing its own offset. The three inspector boxes gain the target together, because they already
shared the affordance.

**Bad**: the target now overlaps its own margin, which no screenshot shows. A reader who tightens
`mt-3.5` or `mb-1.5` on `sectionHeading` far enough would put the halo over a live row. Nothing
would look different. The story's probe reads the affordance's own geometry rather than a
neighbor's, so that regression would land unobserved.

The proof is a play assertion that resolves `elementFromPoint` at the extremes of the 24 pixel
square. It reads the pointer target rather than the box. That's the only way to measure a target
that exceeds its ink.
