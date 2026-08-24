# 0179: The token count follows the wire the answer came back on

**Status**: Accepted
**Date**: 2026-08-24

## Context

Three readings on the Usage screen disagreed with what a person had just done. The chart drawn by
tokens stood empty over a window whose request chart had bars. The Providers filter listed nobody
while the gateway served requests. A stored ledger held the proof of the first one: fifteen Copilot
requests on `mai-code-1.1-flash`, none failed, each counted at zero tokens. Three requests on
`gpt-4.1` through the same account carried 96,970.

`providerUsageFrom` picks a parser per dialect. A Gemini answer names `usageMetadata`. An Anthropic
answer names `input_tokens` beside two cache fields. Everything OpenAI-shaped names `prompt_tokens`.
The dialect came from `credentialedDialect(provider, …)`, a lookup on the vendor table in
`provider-directory.ts`. That table holds no Copilot row, so the OpenAI parser read every Copilot
answer.

Record 0168 made that wrong. Copilot serves three wires, and each model names which of them answers.
So `copilotReachFor` reads the account catalog and settles the wire first. `gateway-attempt.ts`
already held that answer in `upstreamDialect`. It worded the request from it and translated the
reply with it. The observability span, one call deeper, worked the vendor lookup out again and got
something else. The OpenAI parser returns zero on a Gemini body, because it never looks at
`usageMetadata`.

The second reading shares the family. The Providers menu folds the `account` dimension, and
`memberNames` dropped every row whose key stood absent. Traffic a gateway refuses before any
provider stands for it reaches no account. Those requests counted on every tile and in every panel
under `No account reached`. The one control that could isolate them listed nothing.

The third came out of the ledger flush. It cleared `dirty` ahead of `writeJsonAtomic` rather than
after, and the cadence fired the write as `void flush()`. A refused write therefore lost the launch
accrual and said nothing about it. `plan-usage-store.ts` carried the same ordering, and
`balance-store.ts` the same silence.

## Decision

The crossing carries `upstreamDialect`. `readingFromProvider` stamps it the moment the turn settles
which wire it takes. `credentialed-reach.ts` reads it through one `turnDialect` helper, and both the
observability span and the after-auth plugin hand-off call that helper. It falls back on the vendor
lookup only where no turn ever resolved a wire.

`memberNames` returns traffic that reached no member under `ABSENT_MEMBER_KEY`, and
`filteredBuckets` narrows on that key. Picking it leaves the requests no provider answered. The
wording stays `ABSENCE_WORDING`, which the breakdown panels already printed. `usage-groups.ts` holds
it once now, and both readers import it.

A store clears `dirty` only after the write returns. Each cadence reports a refusal against the
document it couldn't write.

## Alternatives

- **Threading the dialect through `sentUpstream` as a parameter**: rejected. Four signatures move,
  and two subscription reaches never read it. The crossing already holds this turn's other settled
  decisions, `copilotPath` and `outputCeiling` among them.
- **Adding a Copilot row to the vendor endpoint table**: rejected. One row per vendor can't answer a
  question whose answer changes per model, which is what record 0168 settled.
- **Keying the Providers menu on accounts alone, and printing why it stands empty**: rejected. The
  menu wasn't empty the way a window that served nothing stands empty. It hid rows the tiles beside
  it counted, and nobody could reach them.
- **Retrying a refused write on a timer**: rejected. The ledger stays dirty, so the next accrual and
  the flush at quit each carry what the failed write owed. A timer would spin against a disk that
  isn't coming back.

## Consequences

**Good**: a vendor serving more than one wire counts its tokens on each of them. The Providers
filter reaches every request the window counted. A launch accrual survives one bad write, and a disk
that refused says so.

**Bad**: `ABSENT_MEMBER_KEY` reserves a value in the address. An account whose id read `(none)`
would collide with it. Account ids take the registry's own `acc-` form, and a gateway slug takes
lowercase letters, digits and dashes, so neither vocabulary reaches it.

`flushNow` now rejects where it used to resolve. The two fire-and-forget calls in `stored-boot.ts`
report through `flushedInTheBackground` rather than dropping the rejection into a promise nobody
reads.

Two token readings stay wrong after this, and this record doesn't fix them. `usageObject` never
looks inside `message`. An Anthropic answer that streams states its input and cache tokens in
`message_start`, where nothing reads them. `mergeUsage` replaces rather than folds, so
`message_delta` would overwrite them anyway. Every streaming Anthropic turn therefore counts its
output tokens alone.
