# 0088: The categorical series scale

**Status**: Accepted
**Date**: 2026-08-12

## Context

Record 0087 gave the usage chart seven series tokens, and every one names a token split: input, cached, output, cost, the cost equivalent, errors, and the meter fill. The next usage surface stacks one measure by a hierarchy member instead, so a column carries one slice per gateway, per virtual model, or per target. That needs a paint per member. The palette has none left to give. All fifteen families already carry a role: blue for the accent, teal for the gateway node, pink for the virtual model node, and four more the series splits spend.

## Decision

**Six tokens carry a categorical scale, and one helper spends them.** `--color-series-slot-1` through `--color-series-slot-5` paint the leading members of a ranking, and `--color-series-rest` paints everything behind them. The five slots read indigo, lime, bronze, teal, and pink, each a `light-dark()` pair of primitives the palette already holds. The rest slot reads slate. Measured against `--color-surface-card`, the weakest pair clears 4.27:1 in both schemes, so the scale keeps the 3:1 floor record 0087 set.

**`rankedChartSeries` in `shared/ui` owns the mapping.** Members arrive in rank order and keep it, so one member wears one slot across every panel of a single window. A ranking longer than five folds its tail into one series named Other rather than running out of paint. The fold key steps aside when a member already answers to `rest`. A member merging into the rest unseen would read as a smaller share than it served.

## Alternatives

- **A single-hue ramp per dimension, teal steps for gateways and pink steps for virtual models**: rejected on contrast. Only teal-700 and teal-800 clear 3:1 against the light card, so a five-step ramp fails the floor record 0087 set.
- **New primitive families for the scale**: rejected because a new family owes a role everywhere else in the product, and the values author in the recompose-design-system project first.
- **A hash of the member name into a hue**: rejected because the hue drifts with the name, nothing holds the contrast floor, and one member changes paint when the ranking reorders.
- **One neutral fill for every slice**: rejected because a stacked column has to separate its own slices.
- **A wider scale, eight or ten slots**: rejected because the extra hues fall under the contrast floor or collide with the status families.

## Consequences

**Good**: the scale reuses primitives, so the design project stays the source of truth for the values. The record carries a measured contrast rather than an assumption: 4.27:1 at worst in light against white, and 4.27:1 at worst in dark against `--gray-900`. Color never carries meaning alone, because the legend, the caption, and the chart's data table twin each print every member as text. The fold rule keeps a long ranking honest, since the tail arrives named rather than dropped.

**Bad**: slots four and five reuse the gateway and virtual model node tints. A teal slice on the usage surface wears a hue that means "gateway node" on the canvas. Naming every slice holds the confusion down, and the two surfaces never draw together. Even so, a reader who moves between them can read an echo that's not there. The five-slot cap also flattens the tail of a wide window into one Other, which hides its shape. The breakdown table still lists every member, so the reading stays reachable.

**Rider**: the six values need authoring in the recompose-design-system project, which record 0087 names as the source of truth for token values.
