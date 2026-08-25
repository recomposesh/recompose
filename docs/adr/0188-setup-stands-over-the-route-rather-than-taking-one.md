# 0188: Setup stands over the route rather than taking one

**Status**: Accepted
**Date**: 2026-08-25

## Context

The setup wizard holds the whole window on a first session. The obvious shape for something that
holds the window is a route. Give it an address, then guard every other route so a profile still
owing setup lands there.

TanStack Router's own authenticated-routes guide declines to recommend that. It documents two
shapes, the redirect and the surface over the standing route. It blesses the second: show the gate
as something that replaces the content or covers it, rather than as a place to send people.

Its tracker says why. A guard that redirects on a standing has to run on the route it redirects
to, which evaluates the same standing again. Six separate reports of that loop stand open or
closed there, every one the shape this feature would have written.

The drawn design already answered the question in its own words. The frames say the wizard holds
the whole window and then resolves into the canvas. Resolving into something means the something
was there the whole time.

## Decision

**Setup renders over whichever route stands.** No route belongs to it, nothing redirects on its
standing, and its presence never reaches the address or the search parameters.

**The route underneath survives.** Opening the app on the usage screen with setup over it and then
finishing setup lands a person on the usage screen, not on a default one.

**The surface stops short of the window chrome.** It covers the content area and leaves the
draggable band alone, so the platform window controls stay operable and the window stays movable
while setup stands. A surface that claimed the whole window would take the drag region with it and
leave the window pinned.

**The menu stands down rather than the surface trapping it.** Setup reports itself standing through
the same visibility seam every modal already reports through, and the menu reads that count to
disable the route-scoped rows. An armed accelerator never acts behind a question.

## Consequences

A person can deep-link into the app while setup stands and lose nothing.

Nothing in the router knows setup exists, so no future route gains a guard it has to remember.

The surface is one component in the shell rather than a route tree entry, so a step nobody has
written yet renders nothing rather than a blank route.

No address reaches the wizard. Reopening it goes through the View menu, which pushes a view command
the shell answers, the same way the sidebar and inspector toggles already travel.
