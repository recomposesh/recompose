# 0177: A router waiting on its judge lights the path above it

**Status**: Accepted
**Date**: 2026-08-24

## Context

A conditional router asks a judge which branch a request belongs to. The canvas draws that wait as a pulse on the dotted tie between the router and the judge. Everything above the tie stayed dark. The gateway's wire to the virtual model read structural, and the cable into the router rested. Both derive from the traffic table, and that table names only the nodes the engine spent or attempted on. A request parked at a judge has reached no child yet, so it names nothing.

A person saw a canvas at rest with one short dotted line twitching inside it. The request was in the gateway. It had entered that virtual model, and it was sitting at that router. Every one of those cables was carrying it.

Record 0140 settled the case beside this one. The cable into a router borrows the newest reading below it, so the path a request walked lights whole. A decision under way is the same picture with nothing below it yet.

## Decision

**A router waiting on its judge carries a live reading of its own.** The renderer stamps that reading at the current tick. It reads the judging counts the engine already pushes, keyed by the router each count belongs to.

Everything above the router follows from derivations that already exist. The cable into the router paints from the reading. The routers above borrow it the way record 0140 says. The gateway's wire takes the newest reading across the model. The path lights from the gateway down to the decision, then hands off to the child's own reading the moment an attempt starts.

**A decision under way outranks whatever the last request left.** The current tick wins the newest-reading comparison the wire already runs. A wire still red from a refusal a moment ago would say this request had failed before anything routed it.

**Nothing lands on the judge.** The judge's card and its tie read as they did before. A classification call isn't an attempt, which is why the tie carries no request. It paints in the router's own tint rather than a standing. The live reading belongs to the router, because the router is where the request stands.

**Only the standing travels, and only upward.** The children of a waiting router stay at rest, since no request has reached one. The wire carries no failure to press, because nothing has failed.

## Alternatives

- **Pulse the wire in the resting tint without changing its standing.** Rejected: a pulse in the tint of a line at rest reads as a rendering artifact rather than a request. The handoff to the child's green a second later would look like two unrelated events.
- **Let the engine record a live outcome against the router when judging starts.** Rejected for the reason record 0140 gives. The fact follows from readings the engine already pushes. Writing it into the traffic table would make every consumer sort real attempts from echoes.
- **Light the gateway wire alone.** Rejected: that leaves the cable into the router dark between a lit wire and a pulsing tie. It's the exact resting gap record 0140 removed.

## Consequences

**Good**: a judged request reads as one continuous flow from the moment it arrives. A slow judge shows where a person is already looking, rather than only on a short tie inside the composition. The traffic contract doesn't change, and the engine stays ignorant of how the canvas paints.

**Bad**: a live count drives the lit path rather than a recorded outcome. A judge call the engine never settles would leave the path lit until the count comes back. The engine settles in a `finally`, and the same count already drives the tie, so the two can't disagree. Between a decision settling and the first attempt starting, one tick falls back to rest. That reads as the pulse pausing rather than as the request ending.
