# 0158: A judge that reaches no verdict refuses the request

**Status**: Accepted
**Date**: 2026-08-22

## Context

The conditional router shipped with an else child and a mapping that was total by design. Its
record, `openspec/changes/archive/2026-08-20-conditional-router/design.md`, states the rule plainly.
Routing trouble never drops a request, so a judge refusal, a timeout, a broken answer, a cooling
judge and an answer matching no label all land on else.

In practice it dropped something worse. A maintainer wired a conditional router, bound its judge to
a Claude plan account, and watched every request land on the else child. Nothing on screen said the
judge had failed. The two ways to reach the else branch look identical from the outside: a judge
that classified and found no branch fitting, and a judge that never classified at all. The first is
the router working. The second is one model's traffic served by another for as long as the judge
stays down.

Two defects sat behind it, and each made the other invisible.

The first is the classification call on a plan channel. `readingOfTheJudge` raced
`reachSubscription` against the router's budget, and the docstring called the race "the honest half
of the promise this can keep on that channel" because `ProviderRequest` carried no signal. The race
ended the wait. The request went on to the transport's own ceiling, `proxyFetchBoundMs`, ten minutes
away. `sendObservedSubscription` opened an observation span before the send and closed it only on a
response, so a call that ran long, or threw, left a row reading as in flight. The maintainer's logs
showed a judge request live at 385 seconds.

The second is what the walk did with the silence. Every refusal, every timeout, every judge already
standing cooling, and every turn resuming server-side state with no pin, all produced
`fellToElseUnjudged`. The walk already knew the difference. `JudgedChoice` carried a `judged` flag,
and `WHY_NOTHING_ANSWERED` even had a sentence for it. That knowledge reached a refusal note nobody
would ever read, because the else child answered and the request succeeded.

The judge's stand-down then made it permanent. One refusal cools the judge for `DEFAULT_COOLDOWN_MS`,
sixty seconds, and the walk treats a cooling judge as no judge at all. A single bad minute at the
judge therefore sent every request to the else branch for a minute, with nothing on screen saying
so. The next call then refused for the reason the first one did.

## Decision

**A conditional router that reached no verdict refuses the request.** The walk stops at the router,
the way a round-robin router already refuses a turn that resumes server-side state. It answers a new
`unjudged-request` refusal: 503, naming the router, the virtual model, and the else child it
declined to use. The else branch now means one thing only. The judge classified, and no branch
fitted.

This covers every way a request reaches a conditional router with no judgment behind it, including
a turn resuming server-side state that nobody pinned. Splitting that case out would keep exactly the
silence this record exists to end.

It also covers the second ask. An answer no branch wears buys one retry, and that retry settles the
request however it reads. Reading is the word that matters. A second answer naming no branch is a
judge that read the request twice and placed it nowhere, which is the else child's whole job. A
second ask that refuses or runs out of budget judged nothing, and refuses like any other.

**The refusal stops the whole walk, not just the router.** A failover router above a conditional one
doesn't try its siblings. A sibling is no more the branch the judge would have named than the else
child is, so serving from one repeats the substitution under a different name.

**A classification on a plan channel carries a signal.** `ProviderRequest` gains an optional
`signal`, the subscription transport hands it to the wire, and `subscriptionRuntimeBoundTo` binds
every send one classification makes, first ask, plugin resend and credential retry alike. A served
turn passes no signal and keeps the transport's own bounds, because a caller is waiting on that
stream. The race stays beside the signal. The signal severs the request, and the race bounds the
wait even where the budget runs out before a socket exists.

**A span settles however its send ends.** `sendObservedSubscription` closes the observation on a
throw and lets the failure travel on. A cut-off call now leaves a finished row rather than a request
that reads as in flight until the process dies.

**The `unjudged` note reason goes.** No walk can produce it any more. A router whose judge reached
no verdict settles where it stands, so only judgments build the map of children walked past. Keeping
the arm would ship a sentence nothing can print.

## Alternatives

- **Refusing only for judge trouble, keeping else for an unpinned sealed turn**: rejected. A sealed
  turn handed to the else child is a token one account minted read by another, which the else child
  can't use either, so the silence buys nothing.
- **Keeping the else fallback and surfacing the trouble on the canvas**: rejected. It leaves the
  wrong model answering and asks a person to notice. The maintainer who reported this was already
  watching the logs.
- **Letting a failover parent try its siblings**: rejected, as above.
- **Dropping the race and trusting the signal alone**: rejected. The signal reaches the wire, but
  credential readiness and identity run before the send, and a budget that expired in there would
  park the walk with nothing to cut.
- **A shorter transport ceiling for every subscription turn**: rejected. It would cut long streams a
  caller is legitimately waiting on, and
  [0121](0121-a-streamed-answer-rides-a-transport-recompose-owns.md) already chose those bounds.

## Consequences

**Good**: a conditional router whose judge is down says so, with a status a client retries on and a
message naming the repair. A judge past its budget releases its socket at the budget rather than ten
minutes later, and the row it opened settles. The else branch means one thing.

**Bad, and accepted**: the gateway now refuses traffic the else child used to serve. That's the
point. A table that leaned on the fallback will see 503s where it saw answers. A judge on a flaky
account will refuse a minute of traffic per failure rather than sending it to the wrong model. A person who wants
the old behavior can point the router's branches at the model the else child held.
