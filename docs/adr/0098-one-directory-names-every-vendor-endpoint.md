# 0098: One directory names every vendor endpoint, and a row may carry its own

**Status**: Accepted
**Date**: 2026-08-13

## Context

Four catalogs stood in recompose, and twenty-two rows across them carried a Soon badge. The api-keys spec said why, in the product copy itself: each awaited row "lacks a field the account row can't hold yet." The rows named that field, twice over, as a base URL and a dialect.

Five tables answered questions about a provider, and they disagreed about which providers existed. `servingOrigins` in the host said where a turn went. `CREDENTIALED_DIALECTS`, `providerPath` and `HEADER_BUILDERS` in the engine child said how it read on the wire. `firstPartyProbeOrigins` said where a check asked. Two more lived in the renderer as `keyHosts` and `keyShapeHints`, and an eighth, the `keyProviderIdSchema` enum, decided whether a check could run at all.

Every one of them holds the same knowledge: what recompose knows about a vendor. Adding twelve vendors by widening eight tables would spread one fact across eight files in three packages. They would then drift.

## Decision

**One table names every vendor endpoint, and it lives in contracts.** `provider-directory.ts` holds, per vendor, the serving origin and the dialect. Both processes read it, beside `subscriptionProviders` and `localRuntimes`, which already work this way. Neither process keeps a private copy.

The turn path and the credential header stay in the engine. Both follow the dialect rather than the vendor, and the defaults already cover eleven of the twelve vendors this change adds: an unlisted provider lands on `/v1/chat/completions` carrying a bearer token. DeepInfra is the one exception, and it earns a named path because its own documented base URL puts the version segment before the compatibility segment.

**A stored account may carry its own endpoint.** Where the directory names the provider, the directory answers. Where it doesn't, the row answers, through an `endpoint` of an origin and a dialect. Accounts version 9 carries the field and its migration mints nothing, because a row that predates it reads the directory exactly as it did.

**Only a row a person addressed themselves ever carries one.** A vendor recompose ships knows its own dialect. Asking a person to pick one for Groq would ask them to be right about something the table already holds. A wrong answer would then fail at the first turn, with nothing on screen explaining why.

## Alternatives

- **Widening the eight tables in place**: rejected. It ships the same behavior and leaves one fact in eight places, which is the condition that produced a catalog offering nine vendors while the engine served four.
- **A plugin per vendor**: rejected. The plugin seam already exists and already catches an unknown provider through `plugin://`. Eleven of the twelve additions are a documented origin and a bearer token, so a plugin would wrap a table row in a process boundary.
- **Asking every connect for a base URL**: rejected. It removes the directory's reason to exist and makes a person responsible for what recompose already knows.
- **Storing the resolved origin on every row at connect time**: rejected. A vendor that moves its endpoint would then need a migration per stored row, rather than one edit to the table.

## Consequences

**Good**: one table describes a vendor recompose adds. Twenty-two rows connect, the Soon badge leaves the product, and `awaited-providers` leaves the codebase with the module that held it. A key check now answers wherever the directory names an endpoint, rather than for two vendors only.

**Bad**: the directory is a table of facts about other people's services, so it goes stale when a vendor moves. Nothing in the build notices. The `endpoint` field admits an address recompose has never reached, so a person can store a row that fails at its first turn. The connect refuses only an address no request could reach at all.
