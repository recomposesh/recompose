# 0109: A scenario refuses to pass vacuously

**Status**: Accepted
**Date**: 2026-08-14

## Context

Two `gateway-canvas` scenarios passed while proving less than they read. #154 recorded them as a maintainer call, because the scenario set had frozen. The maintainer approved the amendment.

**The zoom scenario** opened on a gateway with nothing bound. One card stands, and the canvas seats it at the origin. Scaling fixes the origin. So a zoom that wrongly re-seated every card would leave that one card where it was, and the scenario would still read "the nodes keep their arrangement."

**The persistence scenario** left the gateway detail and returned. That's a route change, and the renderer holds seats in a module-level map a route change never disturbs. So the scenario proved the map rather than the write, and a layout reaching no storage would pass.

A third smell rode along. The Given for "each gateway keeps its own arrangement" seeded a bystander gateway on its way to the key account, so three stood where the scenario named two.

## Decision

A scenario states what it needs, and an assertion refuses to run against a subject that couldn't have failed it.

The zoom scenario opens on a composition. Three cards stand, two away from the origin, so a wrong zoom moves something.

`the nodes keep their arrangement` now reads its subject through a guard, which asserts more than one seat and at least one away from the origin before comparing. Pointing that scenario back at a bare gateway fails rather than passing. The guard is the durable half: the Given can drift again, and the assertion will say so.

A second scenario covers the half a route change can't reach. `the app starts again` reloads, which throws the in-memory map away, so only a seat that reached storage survives.

The Given for the two-gateway scenario seeds the key account alone, through `theKeyAccountStandsStored`, rather than the account-and-gateway pair.

## Alternatives

- **Asserting seats in screen space rather than graph space**: rejected. It would catch this bug and break on every legitimate zoom, which is the scenario's own subject.
- **Replacing the round trip with a reload**: rejected. The route change is worth keeping, because a person leaving a screen and coming back is the common case and the reload is the rarer one. Both now stand.
- **Leaving the bystander gateway**: rejected. Removing it costs nothing, and a scenario reading past a gateway nobody mentions is how a later reader learns to distrust the seeding.

## Consequences

**Good**: both scenarios now fail for the reasons they name. The guard generalizes, so any later scenario reusing that assertion inherits the refusal to compare an arrangement that couldn't move.

**Bad**: the zoom scenario runs slower, because it seeds an account and a binding rather than a bare gateway. That's the price of having something to observe.

The guard asserts inside a Then, so a mis-seeded scenario fails as an assertion rather than as a setup error. The message names the arrangement rather than the seeding, which leaves whoever hits it one hop to make.
