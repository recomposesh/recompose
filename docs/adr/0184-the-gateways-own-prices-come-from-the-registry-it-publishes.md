# 0184: The gateway's own prices come from the registry it publishes

**Status**: Accepted
**Date**: 2026-08-24

## Context

Architecture Decision Record (ADR) 0183 connected OpenCode Zen, and left its spend reading as no
cost. The price map recompose prices every turn with is the LiteLLM document, fetched daily and
vendored as a snapshot for a first boot offline. That document names 3176 models and not one of
them is a Zen model, so every Zen turn surfaced as an unpriced miss.

Two facts made this more than a missing row.

The first is that a gateway resells. Zen serves `gpt-5.5` and `claude-opus-5` under the model
maker's own names, at its own rates. The lookup tried the bare model name before the
provider-prefixed one, so a Zen turn on `gpt-5.5` resolved to OpenAI's list price. Nothing was
missing on screen and the number was wrong, which is worse than a miss that says so.

The second is that the vendor already publishes its rates. models.dev is the registry OpenCode
maintains and its own tool reads. It carries all 93 Zen models with input, output, and both cache
rates, quoted per million tokens.

## Decision

**The provider-prefixed key wins over the bare model name.** A key written `<provider>/<model>`
exists only where a map priced that provider's own copy of a model, so it's always the more precise
of the two. Every vendor gains from the order, and the one reselling under a maker's name depends
on it.

**Zen prices come from models.dev, as a layer beside the wider map.** The two sources refresh
independently and merge on every read, with the registry standing last so it wins any key both
name. One host being unreachable costs only the layer it serves, rather than freezing both.

**Each layer ships its own vendored snapshot.** `resources/opencode-zen-prices.json` holds the
registry's answer for the gateway, so a first boot offline prices a Zen turn the same way it
prices an Anthropic one. The cache carries both payloads under the version it already used, so a
cache an earlier build wrote still serves its own layer rather than reading as none.

**Parsing lives with its source.** The LiteLLM reader moved to `litellm-prices.ts` beside
`opencode-zen-prices.ts`, and the price desk holds neither shape. Two upstreams that move on their
own schedules were one module away from sharing a reason to change.

## Consequences

**Good**: a Zen turn prices at the rate a person is actually charged, including the free models,
whose zero is a real price rather than a missing one. The layering leaves room for the next vendor
LiteLLM never names, and it costs one call to add.

**Bad**: recompose now depends on a second host for prices, and a person behind a proxy that
allows one and not the other gets a half-fresh map. The registry quotes a long-context tier for
several models while this app holds one flat rate. A turn over 200 thousand tokens on those models
therefore reads under what it cost. The vendored snapshot ages until a release refreshes it, and
nothing in the build regenerates it.

**Also**: `refreshNow` still runs only on the day-long timer, so a desktop session shorter than a
day prices from the snapshot throughout. That was true of the wider map before this change and it
is now true of two layers rather than one.

## Alternatives

**Hand-writing Zen rows into the vendored LiteLLM snapshot.** Rejected: the first daily refresh
replaces that document wholesale, so the rows would vanish and come back only at the next release.

**Pricing every vendor from models.dev.** Rejected: it would trade a source this app has priced
against for one it hasn't, for the sake of a single vendor. The layering leaves the question open
for a later change to revisit without unpicking anything.

**Leaving the lookup order alone and keying Zen prices bare.** Rejected: bare keys would overwrite
the model maker's own prices for every other account, so fixing one vendor would price the rest
wrong.
