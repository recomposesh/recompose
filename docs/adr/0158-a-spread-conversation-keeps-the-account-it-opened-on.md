# 0158: A spread conversation keeps the account it opened on

**Status**: Accepted
**Date**: 2026-08-22

## Context

[0113](0113-a-router-walks-an-id-keyed-table.md) built the router and refused one turn outright. A
request resuming state one account holds can't travel to a second account. The token is opaque to
everyone but the account that minted it, whether it arrives as a `previous_response_id` or as a
signed thinking block. A round-robin router spreads requests, so that record made it answer 400
under `chained_turn`. The refusal named two ways out. Switch the router to failover, or start a
conversation that resumes nothing. The record listed session affinity under what the change didn't
build.

The refusal turned out to cost more than it looked. Extended thinking runs by default in the clients
this gateway serves, and every turn after the opening one replays a signed thinking block. So a
person wiring two accounts under a round-robin router gets one working turn per conversation and a
400 on every turn after it. The mode isn't degraded for that person, it's unusable. The refusal's
own remedy sentence asks them to give up the mode they chose.

Issue #45 held the follow-up, and the maintainer closed it as not planned. That was right in a week
when no router existed to spread anything. The router exists now.

## Decision

**A round-robin router writes down the child it hands each conversation to.** The write lands
against the conversation the request belongs to, under the address of the router that spread it. A
table chaining two spreading routers therefore keeps one child at each.

**A turn resuming server-side state follows that child instead of rotating.** It descends straight
into the kept child at whichever depth the spreading router stands, and the mode picks nothing.

**A sealed turn whose kept child can't serve still refuses.** A child standing cooling is worth no
more than no child at all, because the seal reaches that one account or nowhere. Reaching for the
sibling is the single repair that can't work. The walk keeps the `chained_turn` refusal for it, and
for the conversation nobody kept a child for.

**A conversation wears the mark [0113](0113-a-router-walks-an-id-keyed-table.md) already cut for
judgments.** A client-supplied session id wins, and the opening turn's hash stands in when no client
sends one.

**A request the gateway can't tell apart from the next one keeps no child at all.** A request that
opened with nothing readable still earns a mark, and every other such request earns the same one.
That costs a judgment nothing, because two conversations landing on one branch is a route rather
than a fault. It costs a spread conversation an account that never minted its state. The caller
reads that as the provider rejecting a token rather than as a gateway that lost track of them. So
those requests meet the refusal, which is the answer they got before this record.

**The kept children live in their own store, beside the branch pins rather than inside them.** Both
answer the same question and share one implementation, so the store lost its branch-specific name.
They stay separate instances because the canvas draws only the branch pins. One store would count a
rotation's accounts onto a conditional router's card, and would spend a single bound on two
features.

**The kept children outlive the process, and nothing else in routing memory does.**
[0113](0113-a-router-walks-an-id-keyed-table.md) kept every piece of routing state in memory, and
this record narrows that for one store. Cooling, a turn cursor and a decided branch each cost one
ordinary request when a restart forgets them. A spread conversation costs a refusal, because the
account holding its state is the only account that can read it. The app hands the engine child a
directory through `RECOMPOSE_ROUTING_DIR`, beside the two it already hands over for logs and
plugins. A child nobody hands one to keeps everything in memory, which is what every spec and every
embedded run wants.

**The file is a whole set written under a rename, never a log of writes.** The store already ages
and bounds its conversations, so it hands the keeper everything it holds and the keeper writes
exactly that. Writes coalesce over ten milliseconds, so a burst of turns costs one file. A line the
reading can't make sense of gets dropped on its own, and one halted write costs one conversation
rather than the whole file.

**One writer stands over the directory, however many gateways keep conversations in it.** Every
gateway in the process shares the directory the app hands over, and each holds a memory of its own.
A writer per gateway would let whichever wrote last erase the others. So the writer holds each
gateway's share against its slug, writes the union, and hands a gateway back only what that gateway
wrote.

## Consequences

A conversation spreads once, at its opening turn, and holds still after that. Requests still spread
across accounts, per conversation rather than per turn. That's what the mode can offer while a
provider seals its reasoning to the account that wrote it.

Prompt caching gains from the same pin. A conversation returning to one account keeps that account's
prefix warm, and issue #45 named the cache as its whole motivation.

A restarted engine child opens on the conversations it was holding, so a sealed turn crossing a
restart still reaches its account. The window and the bound run over the restored set exactly as
they run over a live one. A conversation that went quiet for ten minutes therefore comes back to
nothing, on disk as in memory.

The file holds a conversation's mark beside the account it sits on. The mark is a client session id
when a client sends one, and a hash of the opening turn otherwise, so no conversation text lands on
disk. It sits in the app's own data directory, next to the provider logs that already record more
than this does.

A pinned conversation can't fail over. Once its account starts rate limiting, the turns that resume
state refuse rather than moving, and only a fresh conversation reaches the healthy sibling.

## What this change didn't build

- Stripping the seal so a turn can travel. History can lose a signed thinking block, but a
  `previous_response_id` names state living on the provider's side. A request stripped of it would
  succeed while the model read none of the conversation. One silent wrong answer costs more than
  every refusal this record keeps.
- A sticky mode of its own, and the inner policy issue #45 sketched for one. Affinity is how
  round-robin carries a sealed turn, rather than a fourth arm of the policy union.
- Any tally, canvas cable, or window showing which account a conversation holds.
- A window or bound of its own. The kept children age and evict on the numbers the branch pins
  already use, on disk as in memory.
- Persistence for anything else in routing memory. Cooling, the turn cursors and the decided
  branches each cost one ordinary request after a restart.
  [0113](0113-a-router-walks-an-id-keyed-table.md) is right about them.
