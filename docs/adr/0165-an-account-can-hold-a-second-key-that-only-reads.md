# 0165: An account can hold a second key that only reads

**Status**: Accepted
**Date**: 2026-08-23

## Context

The Usage page shows a Credits card for an aggregator account. It read
`GET https://openrouter.ai/api/v1/credits` with the key the account already held, and every read
came back with zeros. OpenRouter's own documentation says why: that endpoint answers only a
management key, and refuses an ordinary inference key with 403 and
`Only management keys can perform this operation`.

recompose stored one key per account, the one it serves requests with. So the card could never show
a balance, whatever the account held. Record [0163](0163-a-plan-reads-its-own-share-off-the-answer-it-just-gave.md)
had already fixed the printing of that failure, and the card said plainly that it couldn't work.
Saying so plainly isn't the same as working.

A management key can't serve inference. So it can never replace the key an account already holds.

## Decision

**A credentialed account can hold a second credential that only reads.** The registry gains an
optional `readerCredentialRef` beside `credentialRef`, and the accounts document steps from schema 9
to schema 10. A version 9 document migrates with no reader credential, since nobody had one.

**The two keys take references spelled apart.** A spending credential opens with `cred-` and a
reading one with `read-`. So somebody reading a vault dump tells which entry could ever serve a
request, without holding the registry beside it.

**Only the balance read reaches for it.** Nothing on any request-serving path can name the reader
credential, which is what makes storing a management key safe at all. A read that finds none refuses
with the sentence naming what the endpoint wants. It never falls back on the key that serves,
because falling back is exactly what produced the zeros.

**The connect step asks for it, and the account row takes it later.** Every account already
connected holds none. A feature reachable only through a fresh connection would therefore do nothing
for anybody already using the app. The row offers to add, replace, or forget the key. Forgetting
stands apart from replacing, because the two are different answers: one hands over a new key, the
other says this account should stop reading a balance at all.

**An empty field stores nothing.** A saved blank must never read as an ask to forget the key already
held, so the sheet refuses to save one and forgetting keeps its own act.

**A provider asks for a second key only where its own documentation refuses the first.** The catalog
carries the ask as data, so the field appears for OpenRouter and for nobody else. DeepSeek and
Moonshot both answer a balance to the ordinary key, and neither needs one.

## Consequences

An OpenRouter account with a management key stored shows a real balance. An account without one
shows the sentence saying what to add, which is now advice a person can act on rather than a dead
end.

Two keys per account means two chances for a key to go stale. They fail apart: a stale reader key
costs a balance card and nothing else, and a stale spending key costs the requests it always did.

The vault holds one more secret per account that has one. It's the same vault, the same encoding,
and the same reconciliation that already keeps a spending key.

The accounts document is at schema 10. A build older than this one refuses a schema 10 document
rather than reading it, which is what the version chain is for.

## What this change didn't build

- A key that reads for any provider but OpenRouter. Nobody else refuses its own key on a balance
  endpoint, so nobody else has anything to ask for.
- Any check on the reader key. Storing one and finding out on the next balance read costs a person
  one card refresh, and a check would be a second endpoint call to learn what the first one says.
- A reader credential on a subscription account. A plan reports its share on the answers it already
  gives, so there's nothing for a second key to read.
- Any use of the reader key outside the balance read. That restriction is the whole reason storing a
  management key is acceptable.
