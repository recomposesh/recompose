# 0123: A strictness guard asks every question its rebuild answers

**Status**: Accepted
**Date**: 2026-08-15

## Context

`strictProviderToolSchema` in `packages/engine/src/dialect/tool-schema.ts` rebuilds a tool schema for
providers that demand strict structured output. It serves the OpenAI Responses encoder, the Gemini
encoder, and the Interactions encoder. It opened with a skip guard:

```ts
if (providerSchemaIsCanonical(schema)) return schema;
```

`providerSchemaIsCanonical` asked three questions: no `$schema`, root
`additionalProperties === false`, and `schemaTypesAreNormalized`, which recurses but judges type-name
casing alone.

The rebuild behind that guard does five things. It lowercases type names. It strips `$schema` and
`title`. It stamps `additionalProperties: false` onto every object under `properties`. It filters
`required` down to names the schema declares. It closes the root.

So the guard answered three questions about a rebuild that changes five things. A predicate that
misses a question doesn't cost a needless rebuild. It skips a repair. Three repairs went missing for
any schema already strict at its root:

- nested objects kept accepting anything, so a permissive object reached the provider
- `title` survived, though the rebuild strips it
- `required` kept names no property declares, though the rebuild filters them

That root-strict shape is what a client following strict structured output has every reason to send.

The repository had settled the second and third points long before. `gemini-chat-request-parity.test.ts`
asserts `not.toHaveProperty('title')` and a filtered `required`. Its schema omits
`additionalProperties` at the root. The same schema with a strict root skipped both rules. Commit
`f69ab665` added the nested stamping, and the guard hid that work from the inputs most in need of it.

A second defect sits beside the first, with a different cause. The rebuild walked only the root's
`properties`. Every other key, `$defs` and `definitions` among them, landed in the carried metadata
without a walk. An object schema that a `$ref` names never received the keyword. The guard plays no
part in that one: the rebuild ran, and the schema still came out permissive.

### What each vendor's documentation states

OpenAI's function calling guide gives the rule for strict mode:

```text
additionalProperties must be set to false for each object in the parameters.
```

The Structured Outputs guide carries the heading `additionalProperties: false must always be set in
objects`. Under `strict: true`, a schema that breaks the rules draws a request-time rejection:

```text
If you send strict: true and your schema does not meet the requirements above, the request will be
rejected with details about the missing constraints.
```

The rule doesn't apply when `strict` is false. OpenAI couples a second rule to it:

```text
To use Structured Outputs, all fields or function parameters must be specified as required.
```

Anthropic has a strict mode for tools. Its structured outputs page lists `additionalProperties` among
the supported keywords:

```text
required and additionalProperties (must be set to false for objects)
```

and names this among the unsupported ones, with a 400 for anything unsupported:

```text
additionalProperties set to anything other than false
```

Anthropic's non-strict tool use documents nothing about the keyword in either direction. Every
example on its define-tools page omits it.

### Where the vendors part company

Both vendors want the keyword on every object in strict mode. They conflict elsewhere, in both
directions:

- OpenAI strict wants every property in `required`. Anthropic strict doesn't, and its own strict
  examples ship a `required` shorter than `properties`. A schema written for one breaks the other.
  Hoisting every property into `required` also changes the tool's meaning unless a `null` union goes
  with it.
- The keyword sets conflict. OpenAI supports recursive schemas and rejects `allOf`. Anthropic
  supports `allOf` except with `$ref`, and rejects recursion. Neither set contains the other.
- Anthropic rejects a value other than `false`. OpenAI says nothing about one.

Two questions stayed open, and this record names them so nobody mistakes them for settled. First,
what OpenAI does with a schema-valued `additionalProperties`. Second, whether Anthropic rejects a
schema that omits the keyword under `strict: true`. Neither vendor's pages answer either question.

## Decision

**A skip guard asks every question its rebuild answers.** Each clause of `providerSchemaIsCanonical`
mirrors one thing `strictProviderToolSchema` would otherwise change. A schema passing every clause is
its own rebuild. Clause order carries weight, because the nested questions read type names as they
stand. Those questions mean nothing until normalization holds.

**Strictness reaches every subschema the provider reads, not only the root's properties.** `$defs`
and `definitions` hold subschemas that a `$ref` names. An object living there arrives the same way an
inline one does.

**Each vendor keeps its own encoder.** The clash over `required` coverage and the clashing keyword
sets decide this. One shared encoder would have to pick a single vendor's rules, and either pick
breaks the other. The `required` rules contradict each other, and neither keyword set contains the
other. `strictProviderToolSchema` serves the strict providers. `anthropicToolSchema` carries what the
tool said and adds nothing, which matches what the non-strict Anthropic path documents by omission.

## Alternatives

- **Delete the guard and always rebuild.** One authoritative rule, with no predicate to drift.
  Rejected on two counts. `tool-schema.test.ts` pins referential identity: a canonical schema comes
  back as the same object rather than a copy, and dropping the guard breaks that spec. The rebuild
  also reallocates the whole schema graph while the predicate reads it, and this runs once per tool
  per request. This record carries no benchmark figure, on purpose. The same measurement read 4.0x
  and then 61.8x on unchanged code, minutes apart, as machine load shifted. A pinned contract and an
  allocation count argue the point without moving.
- **Add only the nested clause, leaving `title` and `required` alone.** The smallest change that
  closes the reported defect. Rejected because the predicate stays unsound, and an unsound predicate
  produced this bug. The next rule added to the rebuild would drift the same way.
- **Make the rebuild identity-preserving and compare references.** One representation of the rule,
  allocating only on a real change. Rejected because the duplication at the root survives it. The
  root questions about `$schema`, `title`, `additionalProperties`, and `required` still get asked
  twice, so the complexity buys only the nested clause.
- **One shared encoder for every vendor.** Rejected on the vendor clash above.

## Consequences

**Good**: a root-strict schema now gets the same treatment as any other, so the shape a client sends
no longer decides which repairs run. Objects under `$defs` carry the keyword that the OpenAI examples
show. The predicate and the rebuild sit next to each other in the file. Each predicate clause has a
spec that fails when that clause alone goes missing, which this change verified clause by clause.

**Bad**: the predicate duplicates the rebuild's knowledge, and that duplication is what failed here.
Adjacency and the per-clause specs reduce the risk without removing it. A rule added to the rebuild
without a matching clause brings this defect back in its original form, and no linter catches that.
The file has little room left under `max-lines`, so the next rule may force a split first.

The Anthropic encoder adds `additionalProperties` to nothing. That matches the non-strict path it
serves, and nothing in the codebase sets `strict: true` on an Anthropic tool. Should anything ever do
so, this encoder won't meet Anthropic's documented strict requirement. That's a known gap rather than
an oversight.

## References

- OpenAI, Function calling: https://developers.openai.com/api/docs/guides/function-calling
- OpenAI, Structured Outputs: https://developers.openai.com/api/docs/guides/structured-outputs
- Anthropic, Strict tool use: https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use
- Anthropic, Structured outputs: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- Anthropic, Define tools: https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools
- Record 0115, on the docstrings that carry these constraints in the code
