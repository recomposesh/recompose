# 0129: An optional spread carries one mutant no test can kill

**Status**: Accepted
**Date**: 2026-08-15

## Context

`exactOptionalPropertyTypes` forbids assigning `string | undefined` to an optional `key?: string`. The codebase answers with one idiom, used 261 times across `packages/` and `apps/`:

```ts
...(value === undefined ? {} : { key: value }),
```

Stryker mutates that ternary four ways. Three of them change what the object carries and a spec catches each. The fourth replaces the condition with `false`, which always takes the else branch and always spreads `{ key: value }`.

A defined `value` makes the mutant produce exactly the original object. An `undefined` one makes it produce `{ key: undefined }` where the original produced `{}`. Those two differ only for a reader who asks the object whether the key is present.

`webResponseFrom` in `packages/engine/src/subscription/provider-transport.ts` hands its object straight to the `Response` constructor. WebIDL converts a dictionary by skipping any member whose value is `undefined`, so `new Response(body, { statusText: undefined })` and `new Response(body, {})` both leave `response.statusText` as the empty string. Node confirms it:

```
new Response(null, { status: 429, statusText: undefined }).statusText === ''
```

No assertion on the constructed `Response` can separate the two forms, because the constructor already erased the difference before any spec could look.

## Decision

An optional spread whose sink treats an `undefined`-valued key the same as an absent key carries one equivalent mutant, and that mutant stands recorded rather than chased.

The test that would kill it doesn't exist, and the code change that would remove it costs more than the mutant does. `statusText: upstream.statusText ?? ''` would delete the ternary. It also gives `exactOptionalPropertyTypes` a second answer at one site out of 261, leaving a reader to work out why this site differs.

The rule is a question about the sink, not about the spread. `Object.keys`, the `in` operator, and a later spread merging over the same key all tell an `undefined` value from an absent one. An optional spread feeding any of those has a fourth mutant a spec can kill, and owes that spec. A WebIDL dictionary, `JSON.stringify`, and Vitest's `toEqual` tell them apart in none of those ways, so an optional spread feeding those owes nothing.

## Alternatives

- **Reshape the expression to `?? ''`**: rejected. It buys one mutant and spends the idiom's consistency. The default `statusText` is already the empty string, so the two forms behave identically, which is another way of saying the mutant was equivalent all along.
- **Lower the break threshold to absorb it**: rejected outright. A threshold is a gate, and a gate is never loosened to fit the code.
- **Assert with `toStrictEqual` against the init object before it reaches the constructor**: rejected. It reaches past the public behavior into the argument `webResponseFrom` builds, which the testing rules forbid, and it pins the shape of a literal rather than what a caller observes.
- **Delete the conditional and pass `statusText` unconditionally**: rejected by the compiler. `exactOptionalPropertyTypes` is on, and the wire response types `statusText` as optional.

## Consequences

**Good**: the mutation gate over `provider-transport.ts` reads 194 killed, 0 timeout, 1 survived, 0 without coverage, and the single survivor has a written reason. A later reader who meets the same survivor on another optional spread has the question to ask: does the sink tell an `undefined` value apart from an absent key?

**Bad**: the file can't reach 100 percent, so nobody can treat a round number as the signal that the file needs nothing more. The count carries the signal instead, and this record is what a reader checks it against.

The reasoning carries to the other 260 uses of the idiom, but this record doesn't audit them. Each one's fourth mutant answers to its own sink, and only the sites Stryker actually reports need an answer.
