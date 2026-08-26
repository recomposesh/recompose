# 0213: A window that binds late asks for the live traffic

**Status**: Accepted
**Date**: 2026-08-26

## Context

The canvas paints its cables from `engineTrafficQueryOptions`, which holds whatever the last
`engine:traffic` push carried. `bindEngineTrafficToCache` subscribes to that push and does nothing
else.

Main holds the snapshot in the traffic desk and speaks only when an outcome changes it.
`tellTheWindowsSoon` folds a busy gateway down to one message a painted frame. That fold keeps
hundreds of requests a second from repainting the canvas as fast as the gateway serves them. Nothing
about a window binding is an outcome, so main sent nothing to a window that bound.

A request already `live` when the canvas mounts therefore never turned its cable green. The next
push came only when the request settled, and a streaming answer can stay live for many seconds. A
reload, a second window, and a route back to a gateway all landed in that hole, each starting on an
empty snapshot while main sat on the whole one.

The request log already solved this. `bindEngineLogsToCache` asks main to send the retained rows
again over `engine:replay-logs`. Its own record says why: a renderer binds fresh on every reload and
on every new window while main holds the history.

This compounded Architecture Decision Record (ADR) 0206, which fixed a separate reason a live cable
looked dead. That record left the pulse painting under reduced motion. This one is about a cable
that was never told a request was in flight at all.

## Decision

`engine:replay-traffic` joins the channel registry beside `engine:replay-logs`, with the same shape:
it names nothing and answers nothing. The snapshot comes back on `engine:traffic`, so the push and
the ask stay one shape, and a push carrying the whole snapshot makes asking twice cost nothing.

The ask reaches `TrafficDesk.replay`, which sends what the desk already holds. A desk nothing has
flowed through sends an empty snapshot rather than staying silent, so a window learns that it's
current rather than waiting to find out.

`bindEngineTrafficToCache` asks on every binding, the way the log binding does. `askMainToResend`
now carries that knowledge for both. It complains rather than throwing when the ask breaks, because
a window that missed one backfill still reads every push after it. Tearing the binding down would
cost it those too.

## Alternatives

- **Answering the snapshot in the ask's own reply**: rejected. It would give traffic a second shape
  for a reading that already has one, and a screen would then have two paths to reconcile wherever
  the push and the reply crossed in flight.
- **Pushing the snapshot whenever a gateway starts**: rejected. A window binds on reload and on a
  second window opening, neither of which is a gateway starting, and a gateway that has been serving
  for an hour starts nothing when a person opens its canvas.
- **Pushing on a timer so a late window catches up within a frame or two**: rejected. It repaints
  every window forever to serve the first moment of one, and it still leaves that first moment
  wrong.
- **Reading the snapshot through a query function rather than a push**: rejected. Traffic would then
  have both a pull and a push writing one cache, which is the reconciliation the whole-snapshot push
  exists to avoid.

## Consequences

**Good**: a request already in flight paints its cable the moment the canvas appears, in a reloaded
window and in a second one alike. The desk stays the single holder of the snapshot. The knowledge of
how a late binding catches up now lives in one function, and the request log and the traffic both
call it.

**Bad**: the fake bridge answers the channel without sending anything, because its traffic line
retains no snapshot to send. A story that wants a late binding to catch up has to emit after binding
rather than before it, which is what stories already do. A fuller fake would need the traffic line to
retain what it emitted, the way the logs line already does.
