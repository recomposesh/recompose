# 0186: A long prompt accrues into a bucket of its own

**Status**: Accepted
**Date**: 2026-08-24

## Context

Architecture Decision Record (ADR) 0184 recorded two gaps it left open, and this closes both.

The first is the long-context band. A vendor charging more above a context threshold charges it per
request. A prompt over 272 thousand tokens costs the higher rate, and the next prompt in the same
minute doesn't. recompose prices from hourly buckets, and a bucket sums `tokens.input` across every
request in the hour, so pricing time can no longer answer the question. A day holding a million
input tokens might be twenty fifty-thousand-token requests or two long ones, and the two cost
different amounts.

The second is the refresh. `refreshNow` ran only on a day-long timer and nothing called it at
launch, so a session shorter than a day priced from the vendored snapshot throughout. Desktop
sessions are shorter than a day.

## Decision

**The tier lands where the request still exists.** `usageTupleSchema` gains
`contextOverTokens`, and accrual fills it from the row's own prompt before the hour folds. A bucket
naming a threshold holds only requests that rose above it, and one hour of both kinds is two
buckets. The field is optional, so every ledger already on disk reads as ordinary traffic, which is
what it is.

**The prompt is every token the model read.** Cached tokens count, because a vendor quoting a
long-context rate measures the context it loaded rather than the share that arrived fresh. What the
model wrote back stays out however large it runs. A prompt sitting exactly on a threshold stays
under it, which is how every vendor quotes the band.

**The thresholds come from the prices.** A band is a fact about a model, and only the price map
knows it, so the price desk now opens during boot and hands accrual a threshold lookup. The desk was
opening in the usage channel layer, which is later than accrual needs it and is the wrong home for
process-wide state either way.

**A boot asks for prices when the standing copy is due.** The cadence stays a day: a launch on a
snapshot or a cache older than a day asks once, and a launch behind a fresh cache asks nothing. A
person who opens the app ten times a day still fetches once.

**Both upstreams answer for bands, in every shape they publish one.** models.dev states a `tiers`
array, and only a band typed `context` counts. The wider map states a `tiered_pricing` array on some
models and writes the threshold into field names on others. Both shapes count. Three suffixes stay
out: `_priority` and `_flex` name a service level rather than a context, and `_above_1hr` names a
cache lifetime. An exact field match is what keeps all three out of a band they would price wrong.

## Consequences

**Good**: a long turn costs what it cost. The explorer keeps working untouched, because the tuple
grew a level no group-by reads. A missing or unreadable snapshot no longer takes the launch down,
which matters more now that the desk opens during boot.

**Bad**: the ledger holds more buckets, one extra per hour per model that saw both kinds of
traffic. A bucket naming a threshold the prices later drop falls back to the base rate rather than
to nothing. That under-charges rather than refusing, which is the safer of the two.

**Also**: accrual now reads the standing prices, so a launch pricing from a stale snapshot stamps
against the thresholds that snapshot held. Thresholds move far less often than rates, so a bucket
stamped under an old one still prices right under the new.

## Alternatives

**Splitting the token counts inside the measures instead.** Rejected: the measures would carry two
of everything and every reader would have to sum them, where the tuple already exists to separate
traffic that differs.

**Stamping a fixed ladder of thresholds and matching bands to it at pricing time.** Rejected: it
keeps accrual free of the prices, at the cost of missing any threshold the ladder never anticipated
and of a constant that has to track what vendors do.

**Fetching prices on every launch rather than on the cadence.** Rejected: a person who opens the
app ten times a day would fetch ten times for a document that changes weekly.
