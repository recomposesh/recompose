# 0208: A request nothing judged names the trouble behind it

**Status**: Accepted
**Date**: 2026-08-26

## Context

Record 0158 decided that a conditional router whose judge reaches no verdict refuses the request
rather than falling to the else child. That decision stands. What it shipped was one sentence for
every way of arriving there:

```text
The router "Fast or slow" in the gateway "Codex" got no verdict from its judge, so the virtual
model "auto" refused this request rather than sending it to the else child. Check that the judge
is bound to an account and a model that can answer.
```

Four different failures print that sentence, and they ask a person for four different repairs.

A walk reaches a conditional router with nothing to route on in four ways. The judge answers a call
that comes back with nothing readable. That one reading covers a binding resolving to no seat, a
spent credential, a provider refusal, and a host the gateway couldn't reach. The judge runs past the
judge timeout. The judge already stands cooling from an earlier failure, so the walk spends no call
at all. Or the turn resumes server-held state, the conversation holds no pinned branch, and the
router judges once per conversation, so again no call leaves the machine.

One sentence sends all four to the same place. A person whose judge ran out of time reads advice
about a binding that was never wrong. A person whose judge stands cooling goes looking at a call the
gateway never made.

Two other ways of reaching the else child print nothing, and neither needs to. A router carrying no
branches hands the request to its else child without asking anyone, since one child is the only
answer a judge could give. A judge that answers a word no branch wears also lands on the else child,
which is that branch's whole job. Neither one refuses.

Records 0145 and 0201 tie the two surfaces together. A row the gateway raises reads the sentence the
caller got, so the drawer and the client can never disagree about why a request failed. That tie
means the vague sentence cost twice over. The refusal said little, and the row a person opened to
learn more said the same little back.

The walk already held the answer. `JudgedChoice` carried a bare `judged` flag, and `classifyJudge`
collapsed a refusal reading and a timeout reading into one `no-verdict` the moment either arrived.

## Decision

**The verdict a judge reading earns names which trouble it carries.** `classifyJudge` answers
`no-verdict` with `judge-call-failed` or `judge-timed-out` beside it. A record holds those two arms
to the readings that produce them, so a reading added later fails the build rather than printing
somebody else's repair.

**The branch decision names the two troubles it settles without asking anyone.** A judge standing
cooling and a sealed turn with no pinned branch each carry a word of their own. `Judging.classify`
no longer admits `undefined`, because nothing ever passed one and the arm existed only to carry the
cooling case through under another name.

**Four causes reach the refusal, and each one prints its own repair.**

| Cause                    | What the router did                                                    | What the repair asks for                           |
| ------------------------ | ---------------------------------------------------------------------- | -------------------------------------------------- |
| `judge-call-failed`      | asked, and got no answer out of its judge                              | check the binding, the account, and the credential |
| `judge-timed-out`        | asked, and heard nothing inside the judge timeout                      | raise the judge timeout, or bind a faster model    |
| `judge-standing-cooling` | asked nobody, since its judge stands cooling                           | fix what stopped the judge answering               |
| `unpinned-sealed-turn`   | asked nobody, since the turn resumes server-held state under no branch | start a new conversation                           |

`router-refusal-facts.ts` holds the four sentences and the four repairs, one record, keyed by cause.
The frame around them holds as before. Every one names the router, the gateway, the virtual model,
and the else child the router declined to use, which is what 0158 pinned.

**The cause travels the walk, and the judge's own words never do.** The branch choice carries it,
the descent step carries it, and the walk verdict hands it on. A cause is one of four words this
gateway chose. A verdict is model output, so it stays where 0201 put every completion, which is
nowhere near a refusal, a row, or an export.

## Alternatives

- **Split `unjudged-request` into four refusal reasons.** Rejected: the four share a status, a code,
  and a frame, and a client keying on the code would have to learn four names for one condition. A
  field says which without moving the condition itself.
- **Read the trouble at the seam that writes the refusal.** Rejected: nothing holds the reading by
  then. The one moment anything knows which of the four happened is the moment the branch decision
  settles.
- **Quote what the judge answered.** Rejected: a verdict is a completion, and 0201 draws that line
  at the material rather than at the field name.
- **Name the four ways a judge call can fail.** Rejected for now: a missing seat, a spent credential,
  a provider refusal, and an unreachable host collapse into one reading before the router ever sees
  them. Telling them apart means changing the judge call, and one repair already covers all four.

## Consequences

**Good**: a person who gets a 503 through a conditional router reads what happened to the judge and
the one thing to go and fix. The drawer says the same, because the row reads the caller's own
sentence. The compiler now holds the causes to the readings and to the sentences. A fifth way of
reaching no verdict can't ship a sentence about somebody else's problem.

**Bad**: the refusal grew. The longest cause runs past 300 characters, which a client logging one
line per error will wrap. Four sentences also promise four repairs, so a cause that lands wrong now
misleads where a vague one only frustrated.

**Still open**: `refusals.ts` builds the refusal, and `gateway-walk-answer.ts` calls it with three
arguments. Both files sit outside this change, so the cause stays optional on the refusal and a
refusal raised through them carries none yet. The walk names one wherever it refuses, so lighting it
up costs one parameter on `unjudgedRequest` and one argument at that call site.
