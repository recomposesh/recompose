# 0108: A baseline compares the design, not the runner

**Status**: Accepted
**Date**: 2026-08-14

## Context

The Playwright visual gate ran at `maxDiffPixels: 0` until the macOS runner pool began failing it at random, twice reporting a 5,076-pixel difference on `home-empty.png` that no content change explains. The gate moved to `maxDiffPixelRatio: 0.015` to get a green board, and #153 recorded that as a decision standing for review.

A 1.5% tolerance absorbs the symptom. It also passes a real 1.5% regression unseen, which is a gate that has stopped doing its job.

The cause isn't randomness. macOS chooses subpixel antialiasing per display, per GPU and per runner, and a screenshot carries that choice as a halo around every letter.

## Decision

The capture pins glyph rasterization, and the tolerance goes back to `maxDiffPixels: 0`.

`e2e/visual.css` sets grayscale antialiasing, which has no subpixel term to vary. Playwright injects it through `stylePath` around the capture itself.

It's a file rather than an `addStyleTag` call in the spec, because the app answers under `style-src 'self'` and refuses an inline style. That posture is the app's and not this suite's to relax. Playwright's own injection isn't the page's, so it passes where the spec's call can't.

Two gates needed telling what the file is.

`knip` sees a file nothing imports, so the config declares it an entry. `hig-doctor` reads forced antialiasing as a Foundations concern. That's right for a shipping surface and wrong for a stylesheet Playwright injects around a screenshot, so its ignore list names this one file.

Neither rule changed, and every file that's app UI still gets audited.

## Alternatives

- **Ratifying the 1.5% ratio**: rejected. It's the size of a real regression, not the size of a rendering artifact.
- **Reverting to zero with no structural change**: rejected. That's the state the ratio escaped, and it would flip a coin per runner again.
- **Generating baselines on one machine and committing them**: rejected. Locally generated images carry the machine that made them, which restates the problem. All three platforms regenerate through the `update-baselines` workflow instead.

## Consequences

**Good**: the gate compares exactly again, so a one-pixel regression fails. The captures no longer depend on which runner drew them.

**Bad**: baselines no longer show the app's real font smoothing, so a regression in smoothing itself would pass. That's a narrow blind spot next to the one a 1.5% ratio carried, and nothing in the design system varies it.

All three platforms regenerated their baselines once, when this landed. A pending PR branched before it will need the same, through the same workflow.
