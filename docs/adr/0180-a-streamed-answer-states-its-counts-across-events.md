# 0180: A streamed answer states its counts across events

**Status**: Accepted
**Date**: 2026-08-24

## Context

Record 0179 fixed which dialect reads a token count and named two readings it left wrong. This is
those two.

Anthropic states a streamed turn's counts in two places. The opening event carries what the turn
read:

```
data: {"type":"message_start","message":{"usage":{"input_tokens":100,
       "cache_creation_input_tokens":20,"cache_read_input_tokens":50,"output_tokens":1}}}
```

The closing event carries what it wrote:

```
data: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":250}}
```

`providerUsageFrom` missed both halves. `usageObject` opened `usage`, `response.usage`,
`interaction.usage` and `metadata.total_usage`, and never `message.usage`. The opening event
therefore read as a body with no usage at all. `mergeUsage` then replaced one whole reading with the
next rather than folding them, so even a parser that saw the opening event would have lost it to the
closing one. Every streamed Anthropic turn counted its output tokens alone.

A ledger from a day of real traffic showed 25 requests through `claude-smart` totalling 29,991
tokens. That's a thousand per request, for a model that reads cached context by the tens of
thousands.

Upstream already draws this line. The decoder in `anthropic-stream-decode.ts` folds the two events
field by field, `state.usage = { ...state.usage, ...hubUsageFrom(event.usage) }`, and `hubUsageFrom`
omits every field the event stayed silent about. CLIProxyAPI carries the same rule under
`TestConvertClaudeResponseToOpenAI_StreamUsageMergesMessageStartUsage`. The observability count was
the one reader that never learned it.

Folding needs a distinction the old parsers couldn't make. `numberAt` turned an absent field and a
field named zero into the same `0`. Nothing downstream could tell an event that stayed silent about
the input from one that named the input as nothing.

## Decision

A parser answers what its body named and nothing more. `NamedCounts` is a partial reading, built
with the same spread the dialect layer already uses, and `countAt` answers `undefined` for a field
no body named.

`providerUsageFrom` folds those partials across the stream, later events overriding only the fields
they name. The fold skips an event whose every named count reads zero, which is what the old total
guard protected. A stream closing on an empty usage envelope carried no reading rather than a turn
that spent nothing.

The total stays the vendor's own where a vendor named a positive one. Otherwise it sums the folded
split by the rule the dialect states. Anthropic adds both cache buckets beside the input. Gemini and
the interactions dialect add reasoning beside the output, and the rest add input to output.

`usageObject` opens `message` beside the envelopes it already opened.

The parsers live in `provider-usage-counts.ts` and the fold in `provider-usage.ts`, because reading
one body and folding many are two reasons to change.

## Alternatives

- **Taking the largest value seen per field**: rejected. It reads right for a count that only grows,
  but it can't answer the total: maxing the opening event's 171 against the closing event's 250
  gives 250, where the turn spent 420. Folding the split and summing it answers both.
- **Special-casing `message_start` in the stream loop**: rejected. It puts one vendor's event names
  in the one function that stays dialect-blind, and it leaves the replace-rather-fold rule standing
  for every other dialect that splits its counts later.
- **Reading the counts off the decoder rather than the raw text**: rejected for now. The decoder runs
  only where a turn crosses dialects, and a passthrough turn reaches the observability span without
  one. Counting from the raw answer is what keeps both paths reading the same.
- **Leaving the old guard as "skip an event whose total reads zero"**: rejected. The opening
  Anthropic event names a total of zero, since Anthropic states no total at all, so the guard was
  skipping exactly the event this record is about.

## Consequences

**Good**: a streamed Anthropic turn counts the context it read and the cache it hit, which for a
cached turn is most of what it spent. The Usage screen's token figures, the cached share beside them,
and every quota window derived from local burn all move to the real numbers.

**Bad**: those figures jump on the first launch after this lands, and the jump is large for anyone
serving Claude through a subscription. Nothing restates history: the ledger keeps what it accrued, so
a window spanning the change reads two different rules. It's a plain accrual, so no migration can
repair it without inventing counts nobody measured.

A vendor that names a field as zero now overrides an earlier non-zero reading of that field. The old
rule kept the earlier one whenever the arriving total read zero. No dialect this gateway reaches
does that inside one answer, and the all-zero guard still covers the empty closing envelope that
prompted the old rule.
