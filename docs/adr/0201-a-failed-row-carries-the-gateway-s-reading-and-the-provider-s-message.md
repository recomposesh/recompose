# 0201: A failed row carries the gateway's reading and the provider's message

**Status**: Accepted
**Date**: 2026-08-26

## Context

Someone ran a gateway and their client got a 502. Neither they nor the maintainer could work out why. That's the whole defect: the app gave a person nothing to read when a request failed.

A failed row carried one sentence and nothing else. Where the gateway composed the refusal, that sentence was the one it handed the caller, which Architecture Decision Record (ADR) 0145 established. Where a target failed, it was the reading the status alone earns: "The target is turning requests away for now." Both are true and neither is enough. The provider had usually explained itself in the body of its own refusal, and that explanation reached nobody.

The engine already computed the rest. `gateway-walk-notes.ts` works out, per child of a route table, why that child couldn't take the request. Six readings answer that: no credential, no target, and no answer when the gateway reached for it. The other three are cooling, ready off the branch the judge chose, and refused with 429. Those readings went into the refusal the caller received and were then thrown away. A row raised for one such child read "The child has no credential." with empty provider cells, naming no child at all.

Two surfaces disagreed on purpose. A cable quoted the target's own words, because the person pressing a red cable owns the gateway. A row didn't, because a footer counts rows and a reader exports them in bulk. ADR 0145 wrote that split down: "A target's own words reach a cable, where the person who owns the gateway presses them. They never reach a row."

That split held while a row was a line in a list. It stopped holding once the question became "why did this gateway answer 502?" The answer to that question is frequently a sentence only the provider can write.

## Decision

**A failed row carries the gateway's diagnosis of the failure.** The row gains one optional field. It names the router that stood in the way, and every child the gateway reached with the reason each one couldn't answer. It also carries the sentence a provider sent explaining its own refusal. A row the gateway served carries none, because a request the gateway served has nothing to explain.

**The reasons are the caller's own words.** The children a row names are the same list the refusal prints, built by one function. A person comparing the answer their client holds against the row the drawer lists reads one wording rather than two that somebody has to keep in step. For the same reason the engine's `RouterAttempt` is now the contract's `AttemptedChild`: one shape, because it's one fact.

**A provider's error message may ride a row. Nothing else it sent ever may.** No prompt, no completion, no message text, no credential, no header value, no request or response body. The message is the provider explaining why it refused. The body is everything around that message, and the two aren't the same thing.

**The schema enforces that, the way it already enforces the client key being a digest.** `upstreamMessage` refuses text that opens a brace or a bracket, refuses text carrying a `data:` or `event:` line, and refuses anything past the 280 characters a cable already bounds its quote at. The schema refuses a caller that skipped the extraction and handed the whole body over, rather than letting the drawer list it. It refuses a diagnosis that names nothing too, so an empty reading can never pose as a reading somebody took. Contracts also exports `providerMessageOf`, so whoever takes a quote asks the contract whether it's admissible rather than deciding alone. A quote the schema would refuse costs the whole row, and losing the row loses the one failure a person was trying to read.

**The log drawer grows a detail panel.** The panel reads the request under the list's cursor in full, beside the run. It shows the virtual model asked for, the model it resolved to, and the router. It also carries each child reached and what it did, the sentence the gateway handed the caller, and the provider's own words. The cursor is the selection, so the arrows that already walk the run are also what read a request, and reaching the reason never needs a pointer. The whole reading copies in one press, because a person reading it usually pastes it to somebody who can help.

**The panel stands inside the drawer.** The drawer sits under the stage, so nothing it opens covers something a person was about to press. The panel honours that by taking a share of the drawer's own box rather than floating over the canvas. It leaves a drawer too narrow to hold it, the way the filters above it already do.

**The walk reads an answer it went past before it drops it.** Cancelling it outright settled the attempt but left the answer unread, because the observation that raises the row sees only the bytes something actually pulled. A child a ladder moved on from reported a status and never the sentence its provider sent alongside it. Every answer reaching that point is one the walk refused, so what gets read is a refusal rather than anybody's completion. A 64 KB bound caps the reading, so a provider that refuses across a long stream never keeps it going without end.

## What this supersedes

ADR 0145 said the turn remembers only sentences the gateway composed. It gave the reason: "A target's own words reach a cable, where the person who owns the gateway presses them. They never reach a row, which a footer counts and a reader exports in bulk."

**This record supersedes that sentence in one respect and leaves it standing in every other.** The `failure` field is still the gateway's own, and still the sentence the gateway handed the caller. A row and the answer a client holds can never disagree about why. What changes is that a provider's error message now rides beside it, under a field of its own that says whose words they are.

The shape now answers the bulk-export worry, where the omission used to. A message is prose a provider wrote for a person to read. A body is the material around it. The old rule kept both out by keeping both unnamed. The new rule keeps the material out by refusing it in the schema. It lets the prose through, because that prose answers the question the drawer exists to answer.

## Alternatives

- **Put the provider's message in `failure`.** Rejected: `failure` is what the gateway handed the caller, and ADR 0145 earned that guarantee by fixing a real disagreement between a row and a client. Overwriting it with a provider's sentence would reopen exactly that.
- **Carry the upstream status as its own field.** Rejected: a provider row's own `status` already is the upstream status, and a child's reason already reads "refused with 429" in the caller's own words. A second field would have to agree with both forever.
- **Raise an extra row for a router refusal that upstream attempts already stand for.** Rejected: one request is one row where an attempt already reported it, which `gateway-traffic-logs.test.ts` pins and ADR 0145 reasoned out. A ladder whose children were all reached and refused therefore still has no row for the 502 the caller got, and reads instead as the children's own rows, each now carrying the words its provider refused with. Changing that rule would be a separate decision about what a row counts.
- **Attach the whole body and let the renderer pull the message out.** Rejected: the body would then cross a process boundary, sit in the renderer cache, and land in an export. The extraction belongs where the body already is, which is the observation that watched it go past.
- **Cap the children a diagnosis may name.** Rejected for now: a walk names at most eight children it tried plus whatever a branch decision stood past, and a route table wide enough for that to matter doesn't exist yet. The backfill chunk size assumes small rows and is worth revisiting if one does.

## Consequences

**Good**: a person who gets a 502 can read why. The missing-credential and missing-target cases a new user hits now name the model their binding pointed at, which the sentence alone never did. A ladder that ran out names every child and what each one did, in the same words the caller's refusal used. The contract now enforces the privacy rule, rather than a reviewer noticing. It enforces that against material rather than against a field name, so a future caller can't smuggle a body through under a different word.

**Bad**: rows grew. A failed row through a wide route table carries a list where it used to carry a sentence, and the backfill chunk that assumed small rows now carries more. A provider that writes careless error messages can put careless prose in front of a person, since the gateway quotes rather than rewrites. An answer the walk drops is now read rather than cancelled, which spends a little bandwidth on a refusal nobody will see, bounded but not free.
