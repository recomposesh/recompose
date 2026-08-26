# 0212: A restart that never comes back up says so on the canvas

**Status**: Accepted
**Date**: 2026-08-26

## Context

Every composition edit already restarts a serving gateway. `gateways:update` reaches
`servedRewrite`, which reaches `restartIfServing`, which reaches `ctx.restartGateway`, and
`serveRewrittenGateway` resolves that to `engineHost.restart(gateway)`.

That restart was fire and forget. A refusal landed in `console.error` and went nowhere else, so the
channel answered `ok` while the listener behind the gateway might be down. A person who saved a card
and fired a request a second later met a connection refusal with nothing on screen to read.

The engine snapshot didn't save them either. `restartGateway` stops and then starts, and each half
waits five seconds for a report. Where the stop went unanswered too, the ledger still held the word
it had before the save, so every window read the gateway as serving while nothing was listening.
Where the engine reported the stop but never the start, the ledger held the stop. The canvas then
said stopped without ever saying why, next to a composition the person had just changed.

The maintainer read this as staleness and asked for a "needs restart" banner on the canvas. A banner
saying a save is pending would be false every time, because the restart does happen. What they were
seeing is this silence.

The renderer can't tell the two silences apart on its own. `gatewayEngineStateSchema` carries
`running` and `stopped`, and `stopped` says nothing about who asked. A gateway a person stopped and
a gateway a failed restart left down leave the same word in the snapshot.

## Decision

The host writes the outcome down. A restart whose start is never reported publishes the gateway as
stopped through `withGatewayStopped` and refuses its caller as before. Stopped is the conservative
reading of that silence. The host told the engine to stop and never heard the start meant to follow.
A ledger still saying running would send every request to a listener that isn't there.

The stop in the middle of a restart no longer reaches the windows. `midRestart` holds it back, so a
save that works never blinks the gateway down for the moment between the two halves. The desks still
hear that stop, because a request in flight does die with the listener. Only the word to the windows
waits for what the whole act comes to.

The canvas names the silence rather than its cause. `watchedAnswering` folds what the window has
watched one gateway do. It raises the notice once the gateway has served in this window and gone
down, with no start or stop act from this window standing over it. `useGatewayLifecycleAsked` reads
that act off the mutation cache, because the controls that start and stop a gateway live in the
toolbar and the sidebar rather than on the canvas.

`StoppedAnsweringNote` stands in the canvas column between the stage and the strip below it, taking
a band of its own. It says the gateway stopped answering, says nothing here asked it to, and offers
Start again. A dismissal leaves the gateway down and only agrees to stop saying so.

## Alternatives

- **A "needs restart" banner announcing pending changes**: rejected. The restart already happens, so
  the banner would be false on every save and would teach a person to press something that changes
  nothing.
- **Answering `gateways:update` with a refusal when the restart fails**: rejected. The composition
  did reach the disk. A refusal would leave the stored gateways cache holding the old composition
  while the new one is on disk, which puts a lie on the canvas to explain a truth about the engine.
- **A new state variant carrying why a gateway stopped**: rejected here for scope rather than on the
  merits. It's the honest place for the distinction and would let the notice name the save. It
  changes `gatewayEngineStateSchema`, which this branch doesn't own.
- **Awaiting the restart before answering the channel**: rejected. It buys only ordering, and the
  notice reads the engine snapshot rather than the answer, so nothing needs the ordering. It would
  also hold a save open for as long as two directive timeouts.
- **Raising the notice from the save act**: rejected. Nine surfaces write a gateway, most of them
  inspector panels, so a notice hung off one of them would miss the other eight.
- **Floating the notice over the canvas**: rejected. A person reads a save that left a gateway down
  a moment after editing a card. A surface over the composition would then cover the card they're
  about to press again. The same reasoning already seats the request log under the stage.
- **Leaving the notice with no way to put it away**: rejected. A band with no answer would otherwise
  nag a person who means to leave a gateway down.

## Consequences

**Good**: a gateway that goes quiet says so where the person is looking, with the one act that ends
it. The engine ledger no longer claims a gateway serves after a restart nobody heard back, so the
sidebar, the toolbar, and the request drawer all read the same truth. A save that works no longer
flickers the gateway through stopped on its way back up.

**Bad**: the notice names what happened rather than what caused it. A restart that never came back
up and an engine that died under a gateway raise the same words. The window can't tell them apart
without a state variant that says so. Both leave requests refused with nothing else on screen to
read, so the wording is true of each, but a person who wanted the save named won't find it.

A start that's never reported leaves the gateway reading stopped even where the engine did in fact
come up, which a start from the notice or the toolbar corrects. The notice raises only for a gateway
this window has watched serve, so a second window opened after the silence shows nothing.
