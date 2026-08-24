# 0172: Asking for a sign-in code is an act, never a reading

**Status**: Accepted
**Date**: 2026-08-24

## Context

Copilot and Kimi both authorize by device code. recompose asks the plan for a code, opens the
verification address in the browser, and stands the code beside that address. A person enters the
code there while the app waits.

The renderer used to carry that ask as a TanStack Query reading. A query runs again whenever the
client decides its answer went stale. The window coming forward counts as one of those moments.
TanStack Query listens for the page reporting itself visible, and asks every stale query again the
moment it hears that.

Chromium calls a window hidden when another window covers it, rather than when it merely loses
focus. So the fault needs a machine where the browser covers the app. Leaving for GitHub and coming
back reported the page visible again. The reading ran again, the plan issued a fresh code, and a
browser opened on it. Coming back from that window opened the next one. A tester on a single small
display couldn't get out of the loop. The same build on a wider display never hears the event, so it
never showed the fault at all.

That ask was never a reading. It spends a code the plan issues once, and it opens a window on the
machine. A query may repeat both, and neither one survives repetition.

## Decision

**A channel that acts belongs in a mutation.** A reading answers the same way however often it runs,
so the client owns its timing. `subscriptions:device-code` issues a credential and opens a window,
so the screen owns its timing instead. A mutation is how a screen says so.

**The step asks once per plan it stands under.** The ask still runs on its own, because picking the
plan already asked for it, and a press to ask again would be a press for nothing. A guard remembers
which plan the step asked under, because StrictMode runs a mount's effects twice, and twice would
mean two codes and two windows.

**Asking again on focus stays on everywhere else.** Every other renderer channel answers the same
way however often it runs. Turning the behavior off across the whole client would trade a real
benefit for a fault belonging to one screen.

**The hook takes the name of what crosses.** The device code stays in the main process, so
`useDeviceCode` named the one thing the hook never returns. `useVerificationCode` names the pair a
person gets: the code to enter, and the address to enter it at.

## Consequences

The step shows one code, at one address, for as long as a person needs. Walking to the browser and
back leaves the step where it stood, whatever covers what.

The screen holds the only trigger. A code goes out when a person opens the step and at no other
time. Reopening the step still asks for a fresh code, which suits a person who came back later.

The query cache no longer holds this answer, so nothing can invalidate a sign-in code by name.
Nothing did.

The rule reaches past this screen. Any channel that spends something or opens something belongs in a
mutation. The renderer holds one other such sign-in, and that one already waits on a press.
