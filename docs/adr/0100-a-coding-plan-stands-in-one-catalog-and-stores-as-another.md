# 0100: A coding plan stands in one catalog and stores as another

**Status**: Accepted
**Date**: 2026-08-13

## Context

Five plans stood under Soon badges in the Subscriptions catalog: GitHub Copilot, Kimi Code, the Z.ai Coding Plan, the Qwen Coding Plan, and the MiniMax Coding Plan. The column they stood in claims one thing about all five, that a person signs in.

Research says otherwise for three of them. Qwen's sign-in ended on April 15, 2026, and Alibaba now sells the plan as a key against `coding.dashscope.aliyuncs.com`. Z.ai and MiniMax never published one. Both document a token pasted into `ANTHROPIC_AUTH_TOKEN` against an Anthropic-compatible endpoint. CC Switch stores all three the same way, as a base URL beside an auth token.

recompose's subscription arm rests on the opposite. It launches a provider's own tool, seeds a config home, watches a credential store, and delegates renewal back to that tool. None of it applies to a token a person pasted.

The api-key arm already does the right thing for one. The vault holds it, the row publishes a four-character tail, and removing the row deletes the secret with it.

## Decision

**A coding plan stands in the Subscriptions catalog and stores as a key.** The column a row appears in and the kind it stores under are two different facts, so the catalog offer states both. `way` picks the column, because that's where a person who bought a plan looks. `takes` says what the connect step asks for, and the stored kind follows from it.

**The connected row appears on the API Keys surface.** The row holds a secret recompose spends, so it stands with the other rows holding secrets recompose spends. That's the honest reading rather than a compromise.

**The subscription contract stays as it stands.** Bending it around a token that never renews would put a "this one has no tool" branch through five modules. Those are sign-in launch, tool presence, config homes, credential custody and delegated renewal. Each would carry a case none of its reasoning covers.

**Kimi Code isn't one of the three.** It authenticates through a device authorization grant, CLIProxyAPI implements that flow, and its server accepts `--kimi-login` beside the `--antigravity-login` recompose already runs against the same config home. It therefore signs in, and costs one row in the provider table.

## Alternatives

- **A third subscription provenance beside sign-in and machine**: rejected. It carries a credential reference into a schema whose other two arms hold none, and it puts a branch through the five modules named above.
- **Moving the three plans to the API Keys catalog**: rejected. It contradicts where a person looks. Somebody who bought a coding plan is shopping for a plan, not for an endpoint.
- **A fifth account kind for plans**: rejected under You Aren't Gonna Need It. It multiplies four surfaces to describe a row that behaves exactly like a key.
- **Asking the vendor for a sign-in**: outside this project's reach, and Qwen's removal shows the direction of travel.

## Consequences

**Good**: three plans connect with no new machinery, spending their tokens against Anthropic-dialect endpoints the directory names. The catalog says what a person is buying, and the surface says what recompose is holding.

**Bad**: a person connects on one screen and finds the row on another, which is a seam they have to cross once. Nothing on the Subscriptions surface says so before they pick. Should a vendor add a sign-in later, the row moves kinds, and a stored account would need a migration rather than a re-pick.
