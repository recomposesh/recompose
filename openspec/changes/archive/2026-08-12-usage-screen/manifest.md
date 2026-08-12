---
tier: full
phase: implementation
approvals:
  - gate: design-document
    verdict: reject-with-notes
    date: 2026-08-11
    notes: fold design-critique.md blocker-candidates and the settings-row premise fix
  - gate: design-document
    verdict: approve
    date: 2026-08-11
    notes: revision folding all twenty critique findings approved
  - gate: gherkin-and-solution-design
    verdict: approve
    date: 2026-08-11
    notes: forty-eight scenarios frozen; seventeen-task decomposition opens implementation
branch: worktree-usage-screen
---

## Deviations during implementation

- 2026-08-11, maintainer directive: the series chart renders through `@tanstack/charts`
  (with `@tanstack/charts-scales` and `@tanstack/react-charts`) instead of the hand-rolled
  SVG over `d3-scale` the solution design chose, keeping Human Interface Guidelines (HIG)
  conformance through named charts, printed descriptions, and the caption-and-twin reading
  path. `d3-scale` left the dependency list with its types. The library carries the band
  and linear scales, implicit stacking, axes, and the retention-edge rule; the drop-oldest
  fold (`newestThatFit`) and the hatch pattern stay recompose's own code. Record 0087
  records the supersession in task 17.
- The hover primitive shipped as `hover-reading`, and the chart's bucket reading in task 14
  rides the library's native tooltip instead of a bespoke `hover-popover` component.
