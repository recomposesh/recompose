# 0187: The step that asked keeps the code

**Status**: Accepted
**Date**: 2026-08-24

## Context

Record 0173 moved the device-code ask out of a TanStack Query reading and into a mutation. The ask
spends a code the plan issues once, and it opens a window on the machine. The move fixed the loop it
set out to fix. It also stopped the code from ever reaching the screen.

Both plans that authorize this way, GitHub Copilot and Kimi, showed the same thing. The step stood
on `Asking for a code` and stayed there. The main process had done its work: the plan issued a code,
and the browser opened on the verification address. Nothing came back to the screen.

A mutation observer attaches to the call it starts. It detaches the moment its last listener goes
away. React StrictMode mounts a component, tears every subscription down, then mounts it again. The
ask fires in the first pass. The teardown between the passes detaches the observer from a call
already in flight, and nothing re-attaches it. The answer lands with no one left listening. The
guard that keeps the step to one code per plan then correctly refuses to ask again, so the step
reads as idle forever.

StrictMode runs only in a development build, so a packaged app never showed this. Every person
running the app from source did.

The suite missed it because the step's spec rendered the component bare. The app renders it under
StrictMode. A fixture that mounts a component one way can't see a fault that the app's own way of
mounting produces.

## Decision

**The step keeps what it asked for.** The ask still runs once, from an effect, under a guard that
remembers the plan it ran for. The step then holds the answer in its own state. The answer belongs
to the component still on screen, rather than to an observer a remount can detach.

**Record 0173's reading of the channel stands.** The ask acts rather than reads, and nothing about
it belongs in a query. What changes is where the answer waits.

**A step the app mounts under StrictMode gets a spec under StrictMode.** The spec now mounts it the
way the app does. It also asserts that the code reaches the screen at all, which the old spec
assumed rather than checked.

## Consequences

The code appears on both plans, in a development build and a packaged one alike.

The step no longer reaches TanStack Query for this ask. The library offered nothing here: no cache
to share, no key to invalidate, and no second reader.

Any other one-shot ask fired from a mount effect carries the same hazard. The wait a person presses
into stays safe, because a press happens long after the mount that could detach it.
