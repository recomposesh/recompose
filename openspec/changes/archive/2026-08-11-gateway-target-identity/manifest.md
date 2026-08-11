---
tier: standard
phase: discovery
approvals: ['spec']
branch: worktree-spec-target-identity
---

# Gateway target identity

A canvas target card takes its identity from the bound real model within an account, not from the account alone. Two virtual models that bind two different real models of one account stand as two target cards. Today `node-graph.ts` keys the card by account id, so the two collapse into one. The persisted gateway document stays as it stands, because each virtual model already carries its account id and its provider model. The maintainer confirmed the `standard` tier on 2026-08-10.

The maintainer locked the domain hierarchy on 2026-08-10, and this change makes the canvas honor it. A virtual model maps to a real model, and a provider serves that real model. The provider stands as one of four kinds: subscription, API key, aggregator, or local runtime. The account name lives inside that kind. The hierarchy binds copy and structure everywhere, so a target card carries the real model it serves. The design-system mock already titles target cards this way, for example `work · sonnet`.

The maintainer gave the spec amendment a fresh approval on 2026-08-11. The behavior itself shipped through the hackathon sprint (#159), so this change archives from discovery and carries no design or tasks artifacts of its own.
