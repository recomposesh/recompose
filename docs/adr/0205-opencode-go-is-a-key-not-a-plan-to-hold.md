# 0205: OpenCode Go is a key to paste, not a plan recompose can hold

**Status**: Accepted
**Date**: 2026-08-26

## Context

A maintainer asked for OpenCode Go as a subscription provider, beside Claude, Codex, Gemini, Kimi
Code and GitHub Copilot. The word `opencode` already names two other things here, so the first job
was telling them apart. It names a client in the canvas connect catalog, the coding tool a person
points at recompose. Architecture Decision Record (ADR) 0183 gave the same word to a vendor,
`opencode-zen`, which it entered as an aggregator behind one key.

Go is a third thing, and it's real. The makers of the opencode tool sell it at ten dollars a month
for a roster of open coding models. Its caps run in dollars rather than tokens, and reaching one
drops a person to free models. It answers on `https://opencode.ai/zen/go`, one path segment deeper
than the Zen row ADR 0183 already holds, and it speaks the same compatible surface.

The question that settles where Go belongs isn't whether a subscription exists. It's whether a
credential exists that recompose could take custody of. A subscription provider here means a plan
carrying a sign-in of its own. It means an authorization recompose holds, watches, and either
renews or hands back to the tool that owns it. That's what the vocabulary in
`packages/contracts/src/subscriptions.ts` splits apart. Tool-backed plans stand on one side, and the
plans recompose signs into itself stand on the other.

Go carries no such credential. The vendor tells a person to sign in on its website, subscribe, copy
an API key, and paste that key into the client. The opencode tool's own authorization layer models
three kinds of credential. It files Zen and Go under the plain key kind. It files the Anthropic and
OpenAI plans under browser authorization, and Copilot under a device code. The vendor draws the
exact line this decision turns on, and it puts Go on the key side of it. No authorization endpoint,
client identifier or device endpoint appears anywhere, and nothing about the key renews. The vendor
polices the subscription at its own edge against the key's record. From a gateway's position the
credential looks like any other bearer token.

## Decision

**OpenCode Go stays out of the subscription vocabulary, and nothing builds a sign-in for it.**
Nothing about Go is a plan recompose could hold. No authorization runs, no credential rests here, no
standing needs watching, and no renewal needs an owner. Adding Go to `subscriptionProviderIdSchema`
would seat a plan answering to neither the tool table nor either channel recompose signs in on.
Every path would then have to refuse it.

**Should Go arrive at all, it arrives the way ADR 0183 brought in Zen.** That means a provider
directory row with origin `https://opencode.ai/zen/go` speaking Chat Completions, an aggregator
catalog entry taking a pasted key, and the `opencode` mark alias. The identifier reads
`opencode-go`, hyphenated for the reason ADR 0183 gave, because the bare word already names the
client.

This change doesn't do that work. It touches the provider directory and the catalog's aggregator
entries, which sit outside the files this change owns. It's a plain vendor addition rather than
anything the subscription machinery has to learn.

## Consequences

**Good**: the subscription vocabulary keeps its meaning. Every plan in it carries an authorization
recompose either holds or hands back. `toolBacked`, the device channel and the browser channel
between them account for every member, so a reader can trust the word. A key product arriving by the
key path also inherits the checks, the vault and the balance readings that path already has. The
subscription path would have given it none of those.

**Bad**: a person who bought Go thinks of it as a monthly plan, so they'll look for it under
subscriptions and find nothing. Only the catalog copy can answer that, and it can only answer once
the vendor row exists.

Go's caps run in dollars and fall back to free models rather than refusing. No vendor in the
directory behaves that way today. What that looks like on the wire remains an open question, and it
wants a live look before anybody writes it down.

## Alternatives

**Seat it in the subscription vocabulary anyway, keyed like a pasted token.** The vocabulary already
holds a plan whose row takes a token rather than a sign-in, so a precedent exists. Rejected because
that precedent covers a plan whose vendor issues a plan-bound credential. Go issues an ordinary API
key against an ordinary compatible endpoint. Filing it as a subscription would leave the word
telling a reader nothing about what recompose holds.

**Build a sign-in against the vendor's website session.** Rejected outright. No published
authorization flow exists to implement, and scraping a website session is the shape ADR 0069 exists
to forbid.

**Say nothing and leave the question open.** Rejected because somebody will ask it again. The name
confuses on its face, three different things here answer to `opencode`, and the evidence settling it
is a vendor documentation page that will move.
