# 0163: A plan reads its own share off the answer it just gave

**Status**: Accepted
**Date**: 2026-08-23

## Context

The Usage page carries a strip of quota windows. Every figure on it came from this machine's own
logs. A burn folded into a five hour window and a weekly one. The meter measured that burn against
the account's own busiest window. It seated the record at 80% of the track, so a matched window
never read as exhausted. The caption said as much, because nobody had found a first-party quota
endpoint.

Two things were wrong with that.

The first is a defect. The record folded every window, including the one still open. On a machine
whose history runs a day, the open window is therefore always its own record. Every account's meter
drew at exactly 80%, and four accounts side by side drew four identical bars. A meter that reads the
same whatever a person does tells them nothing.

The second problem is a stale premise. Anthropic returns
`anthropic-ratelimit-unified-5h-utilization` and `-7d-utilization` on every answer an OAuth token
buys, each beside its own `-reset`. A capture from this machine's own traffic pins both: the shares
arrive as fractions such as `0.19`, and the resets as epoch seconds. Claude Code's status line
documents the `rate_limits.five_hour.used_percentage` that follows from them. OpenAI returns
`x-codex-primary-used-percent` with a `-window-minutes` and a reset, and its own client finds
further buckets by scanning for that suffix. Neither vendor charges a request for any of it. Both
ride an answer the gateway already receives. Google and Moonshot report nothing on a header, and
their equivalents sit behind endpoints nobody documents.

## Decision

**A provider's own share of a plan rides the answer the request was already making.** The span that
already watches every provider answer reads the headers it already holds. No request exists for
this, and nothing polls. A provider that reports nothing publishes nothing, which is why Gemini and
Kimi keep the local derivation.

**The reader normalizes at the boundary, into a share of the window and an instant.** Anthropic
sends a fraction and Codex a percentage. Codex has already changed its reset spelling once, and both
epoch seconds and a stamped date turn up in the wild. So the reader takes either spelling of each,
and hands on one shape. Everything downstream of it reads a `spentShare` between 0 and 1.

**A Codex bucket names its own length, or the reader drops it.** Codex calls its buckets primary and
secondary rather than by length, and a plan can carry a bucket this engine has never heard of. The
length comes off `-window-minutes` on the wire. A bucket that named none goes no further, because
filing it under a guess would print one plan's session share as its week.

**The reading crosses as its own report, and the disk keeps it.** It's no field on a log row: a row
is what the drawer lists, and 10,000 rows must not each carry a copy of one account's plan. It rides
the report lane the cooldowns already ride, and lands in a desk keyed by account. `plan-usage.json`
holds what that desk last heard, so a launch opens on the shares the launch before it read. Every
launch until now dropped every figure and waited for each account to answer again.

**An expiry is what makes a stored share honest.** A window names the instant it turns over, and a
read past that instant drops it. A window that named no reset drops as well, because nothing on it
says the figure still holds. Codex sends exactly that. An account left with no window drops out of
the answer, so a card reads as a plan nobody has heard from rather than as a plan at 0%.

**A gateway stopping leaves the reading standing.** Every other desk drops what it holds when a
gateway stops, because cooling and branch pins live in that child's memory. A plan reading is a fact
about a vendor account rather than about a gateway. The account's plan keeps burning whether this
machine's gateway runs or not.

**A row draws a rail only where a vendor named the limit it ends at.** That's the defect above,
fixed at its root rather than by moving a marker. A rail with no limit behind it reads as a
percentage whatever it carries. Measuring a burn against the account's own busiest window therefore
put a person having a busy day at the end of a full bar. The record is a sentence now, and the row
leads with what this machine sent, said as sent. Two cards side by side can head with a share of a
plan and a count of tokens, and a reader has to tell those apart without reading the caption. The
record itself still excludes the window still open, so a busy day can pass it.

**A card stands for every plan a person signed into, served or not served.** The ledger
knows only the accounts this machine has sent through, so a plan signed in this morning went missing
from the page a person opened to check it. A card with no windows carries its rails under a notice
rather than dropping out. That keeps the shape it holds once traffic lands, and stops the strip
jumping as accounts wake up.

**The strip prints what the vendor's own client prints.** A share reads as an integer, with the
word used after it. The reset reads as a wall clock rather than as a span. The block runs label, then meter
beside the share, then the reset underneath. A person reading one plan in Claude Code and in
recompose has to see one figure. A decimal place this app could have kept is a disagreement it would
have invented.

**A session counts down and a week names its day.** A session turns over inside the hours a person
is still working, so it prints `Resets in 2 hr 8 min` and spares them the subtraction. A week turns
over on a day nobody is thinking about, so it prints `Resets Wed 3:00 PM`. A span of 94 hours tells
nobody anything.

**A local reading keeps a mark the vendor reading refuses.** An inferred close prints
`Closes in ≈2 hr 8 min`, and a reported reset prints `Resets in 2 hr 8 min`. The two rows sit in one
strip, and the mark is the only thing that says which of them anybody vouched for.

## Consequences

An account served by Claude or Codex reads a real share of its plan. That share covers every device
the plan serves, rather than only this machine. An account served by Gemini or Kimi keeps the local
derivation. The caption names both derivations, so no figure on the page reads as the other.

The share appears with the first answer, and a later launch opens on the share the last one read. A
plan a person stops sending through holds that reading until its window turns over. The strip hides
neither fact. It's a strip of readings, and a reading carries the moment somebody took it.

The engine now reads two vendor header families. Neither vendor documents them, so either can go
quiet without warning. Going quiet costs the strip a figure and drops it back to the local
derivation, which is where it stood before this record.

Nothing here refuses, cools, or routes on a plan share. The router still learns rate limits from the
refusal it earns, through the cooling signal record
[0113](0113-a-router-walks-an-id-keyed-table.md) already built.

## What this change didn't build

- Any poll. `GET /api/oauth/usage` and `GET /backend-api/wham/usage` both exist. Nobody documents
  either, and Anthropic rate limits its own aggressively and wants Claude Code's own client string.
  A figure worth forging a client string isn't worth having.
- The endpoint clients Gemini and Kimi would need. `retrieveUserQuota` and `/coding/v1/usages` both
  come from reverse engineering, and each costs a request. Both would put another request path
  behind a page that reads what already happened.
- A third window scoped to one model. The capture shows it as
  `anthropic-ratelimit-unified-7d_oi-utilization`, which the reader ignores rather than folding into
  the weekly figure it would otherwise overwrite. Claude Code draws it as a bar of its own, and
  giving it one here means widening the length enum rather than adding a field.
- Routing on a share. A plan at 90% still serves, and refusing early would waste capacity a person
  paid for.
- A stored share with no expiry. A share that outlives its window is a share that lies. A read past
  the reset drops the window, and a reading whose windows have all gone drops with it.
