# 0209: The provider says which of its models are going away

**Status**: Accepted
**Date**: 2026-08-26

## Context

Setup composes the first virtual model and binds each target to a model nobody picked. Architecture
Decision Record (ADR) 0190 settled how setup chooses that model. A rank reads the model id, a
promote list lifts the flagship words, a demote list drops the small and special-purpose ones, and
the highest-ranked listed model wins.

A maintainer reported that setup bound an OpenAI API key to a `gpt-5.1` model the provider had
already retired.

The rank can't see retirement. It reads the id string, and a retired model's id reads exactly like a
live one's. The listing an account answers with still carries a model until its shutdown date
passes, so a retired model is on offer for months after the announcement.

The promote list carries a second failure, and it's the deeper one. It records what vendors called
their best model on the day someone wrote the list. OpenAI's current line is `gpt-5.6-sol`,
`gpt-5.6-terra`, and `gpt-5.6-luna`, and the deprecations page names `gpt-5.6-sol` as the
replacement for `gpt-5`, `gpt-5-pro`, `o3`, and `o3-pro`, every one of which shuts down on December
11, 2026. Run today's rank over an OpenAI listing and it answers `gpt-5-pro-2025-10-06`, a model
with an announced shutdown date, because `pro` sits fourth in the promote list while `sol` sits
last. Someone had already appended `sol` to that list, and appending it gave the new line the
weakest promotion of the seven. The patch meant to recognize the replacement therefore ranked it
below the models it replaces.

Hard-coding a better id moves the expiry date rather than removing it. So does curating a list of
retired ids, which is the same list under another name.

## Decision

**A model the provider has announced a shutdown for never wins the pick.** The models endpoint
carries `shutdown_date` on every entry, a date when the model will shut down or null when the
provider announces none. An entry carrying a date leaves the candidate set before the rank runs.

This can't go stale, because recompose holds no list. The provider maintains the field, the next
listing already carries the answer, and a model can retire without a release of recompose. Nothing
in the repository names a model.

**The rank runs over what survives, unchanged.** ADR 0190 stands for ordering. Dropping the
announced retirements is enough on its own. Over the same OpenAI listing with those entries removed,
the rank answers `gpt-5.6-sol`, the model the provider names as the replacement.

**A listing that announces a shutdown for everything still answers.** The drop applies only while a
candidate survives it, on the reasoning ADR 0190 gives for ranking rather than filtering. A step
offering nothing reads worse than a modest pick.

**The step fetches nothing new.** The field rides the listing the account already answers with, so
the constraint ADR 0190 records still holds. The step works on a machine with no route to the
internet beyond its own gateway.

**A provider that publishes no such field loses nothing.** Its entries carry no date, so the drop
takes none of them and the rank decides exactly as it does now.

## Consequences

`ModelListing` stops being a list of ids and becomes a list of entries, each an id and an optional
shutdown date. Every reader that wants only the ids reads them off the entries. The picker that
offers a person the model list gains the standing it needs to mark a retiring model, which it could
not have said before.

The promote list keeps the weakness ADR 0190 recorded, where a vendor shipping a new flagship word
ranks neutral. That's now survivable rather than wrong, because the older ids it would have lost to
are the ones carrying shutdown dates.

The suite pins the rule against a listing whose entries carry dates, not against any particular
model id. A spec naming a model that retires would rot the same way the promote list does.
