# 0124: A signed thinking block replays only to the account that minted it

**Status**: Accepted
**Date**: 2026-08-15

## Context

The Claude thinking replay holds the signed thinking blocks an Anthropic turn produced. The next
turn of the same conversation carries them back after a compacting client strips them. Each
conversation filed under `${modelFamily}\0${callerFingerprint}:${replayScopeId}`.

The caller fingerprint hashes the credential of the client calling recompose, so it separates two
clients. It says nothing about which upstream Anthropic account served the turn.

One virtual model reached one target when that key took shape, so the account never came up.
Architecture Decision Record (ADR) 0113 ended that. A failover router now fans one virtual model
across two Anthropic accounts. A single failover then puts account A's signed block into a request
account B serves. ADR 0113 listed the gap itself: a failover move mid-chain can still poison
encrypted reasoning. This record closes it for Anthropic.

**Anthropic's documentation doesn't say that cross-account replay fails, and this record doesn't
claim it.** The published pages state four things. The signature carries the encrypted full
thinking. The server decrypts it to rebuild the prompt. The API verifies that Claude generated the
blocks. Blocks must come back complete and unmodified.

On scope those pages name the model alone, tying a block to the model that produced it. Account,
API key, organization, and credential appear nowhere near the signature. One sentence points the
other way outright. It calls signature values compatible across the Claude API, Amazon Bedrock, and
Google Cloud, which are three separate credential systems.

So the ground for this change isn't a documented rejection. Three facts carry it instead.

Cross-account replay is behavior no vendor page promises either way, and a failover path is a poor
place to rest on that. The signature holds encrypted content the server decrypts into the prompt.
Handing one account's block to another therefore puts one account's reasoning into a request the
other account pays for and logs. The Codex replay path in this same engine already answered the
same question the same way for OpenAI's `encrypted_content`.

The documentation names one error for a mishandled block. It's a 400 `invalid_request_error`
reading `` `thinking` or `redacted_thinking` blocks in the latest assistant message cannot be
modified ``. The string ``Invalid `signature` in thinking block`` turns up across three issue
trackers, including Anthropic's own. No documentation page carries it. It counts as field evidence
rather than API surface, and nothing here builds on it.

## Decision

**The serving account names the replay slot, beside the caller and the conversation.** The scope
becomes `${accountId}\0${callerFingerprint}:${replayScopeId}`, and the model family stays in front
of it. A slot now answers one question: what this account said, in this conversation, to this
caller.

**The account id names the account, never the credential that opens it.** A credentialed spend
already carries `accountId`, which main resolves per attempt. Hashing credential material into a
map key would work, and this record refuses it. It invents a second identity for something the app
already identifies. It also leaves a derived secret in a key that somebody later logs.

**An account the grant can't name earns no slot at all.** `accountId` is optional on the spend. So
`replaySession` treats a missing one exactly as it already treats a missing caller fingerprint or a
missing scope id, and declines to replay. The invariant then holds without exception. It costs
nothing in the shipped app, where the one site building a credentialed spend passes the account id
as a required argument.

**The two registration tables widen by one parameter rather than growing a special case.**
Provider-keyed tables call `prepareClaudeReplay` with `(crossing, body)` and `observeClaudeReplay`
with `(crossing, answer)`. Both table types now take the account id third. The five other body
builders and the Kimi observer declare fewer parameters and stay assignable untouched. One edit per
table therefore reaches the one provider that needs it.

## Alternatives

- **Folding an account hash into the model family, which is the pinned upstream's shape**
  (`claude_thinking_replay.go` at v7.2.131, commit `d757063c`, returning `claude:<hash>:<baseModel>`):
  rejected. Upstream can afford it because its model-family helper stays private and feeds one key
  builder, so the misnomer costs nothing there. This engine exports its own, under a spec pinning
  what it does: stripping a reasoning suffix so `claude-sonnet-4-5(high)` and `claude-sonnet-4-5`
  share one conversation. An account isn't part of a model family. Folding it in makes the name
  false. It also forces the suffix spec to carry an account argument unrelated to suffixes, and
  leaves a key whose parts no longer say what they are. Upstream's placement is evidence that the
  account belongs in the key, and no evidence about which part of the key holds it.
- **Carrying the account on `Crossing`**: rejected, and this placement would have caused a fresh
  defect. `gateway-request-crossing.ts` builds a `Crossing` once per request, before any grant
  exists. The account isn't a property of the request. It belongs to one attempt, the router picks
  it afterward, and the next attempt picks another by construction. A per-attempt fact on a
  per-request record gives a field whose meaning shifts between two reads of one object. That
  aliasing shape is what this record removes. It would also widen a type every provider reads with
  a fact one provider uses.
- **Falling back to the base URL, then to the API key, when no account id is in hand**, which is
  what upstream does: rejected on both halves. The base URL isn't an identity, since two accounts
  at one vendor share it and would collide exactly as they do today. The API key is an identity,
  and it's the credential the account id already replaces.

## Consequences

**Good**: a signed block reaches only the account that produced it, so a failover can't put one
account's reasoning into another account's request. The rule stands in one place, the function that
names the slot, and holds for every path reaching a credentialed Anthropic target. The Claude and
Codex replay paths now answer the account question alike, so a reader who has met one has met both.

**Bad, and accepted**: a failover mid-conversation now drops the replay rather than carrying it.
The turn after a failover therefore reaches Anthropic without the thinking blocks a compacting
client stripped. That's the honest reading of a slot the new account never wrote to, and it beats
sending blocks minted elsewhere. The replay cache can hold one conversation twice, once per
account, which raises its ceiling in the pathological case. The existing session, byte, and total
bounds already cap that. Every call of the two hooks grew an argument, which reached the runtime
coverage spec. The test invariant permits that, because the behavior changed under it rather than
the implementation.

One fixture turned out to misrepresent the app. The proxy replay spec built a credentialed
Anthropic grant carrying no account id. The one production site can't produce that shape, because
it takes the account id as a required argument. That spec went red on this change and gained the
field. A later reader meeting a fixture in this area should check it against `spend-grant.ts`
rather than trusting it.

The residuals a later reader will meet:

- **The rejection premise stays unproven.** Nobody has run two Anthropic accounts against one
  conversation and watched what the API does with a foreign signature. The change is right either
  way. Only a controlled two-credential experiment settles whether the dropped replay prevents a
  hard failure or a silent one.
- Session affinity is still absent, per ADR 0113. Scoping the slot stops the poisoning. It doesn't
  keep a chain on the account that started it, which is what would preserve the replay across a
  failover instead of dropping it.
- The other replay runtimes in this engine, Kimi and xAI, carry no account in their keys. Nobody
  has examined whether those providers bind reasoning to an account, and neither has the
  two-account exposure ADR 0113 gave the Anthropic path.

What would reopen this: Anthropic documenting a scope for the signature, either way. A documented
account binding turns the third residual into work. A documented guarantee that signatures travel
across accounts, matching what the cross-platform sentence already implies, would make the dropped
replay a cost with nothing bought. Session affinity would then be the better answer.
