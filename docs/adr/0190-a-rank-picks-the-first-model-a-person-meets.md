# 0190: A rank picks the first model a person meets

**Status**: Accepted
**Date**: 2026-08-25

## Context

Setup composes a virtual model and binds it to the sources a person marked. Nothing asks which model
each source should serve. The step shows the graph and offers one button, so recompose picks.

The pick has to be worth meeting. It's the first answer anyone ever gets through recompose, and a
small model answering it teaches the wrong thing about what the product does.

models.dev, the catalog OpenCode publishes, carries exactly one default per provider. Its own
definition rules it out here: the default names a capable low-cost model on purpose, never the
priciest flagship. That's a sensible silent default for a tool a person configures. It's the
opposite of a first impression.

Taking whatever a provider lists first fails too. The list recompose carries for Claude
subscriptions opens with a Haiku id, because completion limits order that list rather than rank
does.

Curating a model per provider covers the providers recompose names and nothing else. An aggregator
serving three hundred models and a custom endpoint nobody has seen would both fall through.

## Decision

**A rank reads the model id, and the highest-ranked listed model wins.** A demote list drops the
small and the special-purpose ids below neutral. A promote list lifts the flagship words above it.
Among equals, the higher version number wins.

**The version read strips dates first.** A date reads as an enormous version number, so
`claude-opus-4-20250514` would otherwise outrank `claude-opus-4-8`. A tag after a colon leaves with
the dates, because `llama3.3:70b` names a parameter count rather than a later release.

**It ranks rather than filters.** An account serving nothing but small models still answers with
one. A step offering nothing because the rank demoted every candidate would read worse than a
modest pick.

**Ties fall to the provider's own order.** Two ids that read the same on every key are two ids
recompose has no opinion about, and the order a provider listed them in is the only opinion left.

**Nothing fetches a catalog.** The rank runs against what the account itself listed, so the step
works on a machine with no route to the internet beyond its own gateway.

## Consequences

The property the suite pins is per listing rather than per set: the same listing answers with the
same model, and the answer is always one of its own members. A permutation law would overclaim,
because ties genuinely follow input order.

A provider that ships a new flagship word nobody listed here ranks neutral rather than wrong. It
still wins on version against an older sibling, which is the common case.

The rank is one function over one table. A provider recompose has never heard of gets the same
treatment as one it carries a list for.
