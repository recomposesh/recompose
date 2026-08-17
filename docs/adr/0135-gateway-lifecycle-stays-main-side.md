# 0135: Gateway lifecycle stays main-side

**Status**: Accepted
**Date**: 2026-08-17

## Context

The Gateway menu and the macOS Dock menu gained start, stop, and restart for the standing
gateway. The tray already drives all three through `createGatewayLifecycleRequests`, which
carries `restart`, while the renderer holds only start and stop mutations and no restart channel
exists on the wire.

## Decision

Menu and Dock picks run over the lifecycle requests value the tray already holds, so no
`engine:restart` channel joins the wire. The renderer keeps its existing mutations and learns
every outcome over the standing `engine:state` push. The channel totality spec grows by exactly
one name, so the absence of `engine:restart` reads as a pinned decision rather than an accident.

## Alternatives

- **Minting `engine:restart`**: rejected because no renderer surface asks for it, and a second
  restart path would drift from the guard the main-side restart already carries.
- **Pushing lifecycle picks to the renderer over a new event**: rejected because a pick must land
  with zero windows open and a push can't.

## Consequences

**Good**: the menu, the Dock, and the tray share one enablement law from
`gateway-lifecycle-submenu.ts`, and the wire vocabulary stays flat.

**Bad**: a future renderer restart surface must open a contracts change on purpose rather than
finding a channel waiting.
