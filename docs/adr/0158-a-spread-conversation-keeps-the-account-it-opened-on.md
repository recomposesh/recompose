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

**The kept children live in their own store, beside the branch pins rather than inside them.** Both
answer the same question and share one implementation, so the store lost its branch-specific name.
They stay separate instances because the canvas draws only the branch pins. One store would count a
rotation's accounts onto a conditional router's card, and would spend a single bound on two
features.

## Consequences

A conversation spreads once, at its opening turn, and holds still after that. Requests still spread
across accounts, per conversation rather than per turn. That's what the mode can offer while a
provider seals its reasoning to the account that wrote it.

Prompt caching gains from the same pin. A conversation returning to one account keeps that account's
prefix warm, and issue #45 named the cache as its whole motivation.

The store owes nothing to disk, so a restarted engine child forgets where it kept every live
conversation. A sealed turn arriving after that restart refuses, and the person answers it by
starting the conversation again. That's a louder failure than the alternative, which handed a second
account a token it can't read.

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
  already use.
