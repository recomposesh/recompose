# 0099: A look asks the runtime's own path

**Status**: Accepted
**Date**: 2026-08-13

## Context

The local-runtimes spec states one rule for a look. It asks the runtime's version endpoint, and reports the runtime as running only on a successful answer carrying a version. Any other answer on the port reads as another server, so a collision never reads as the runtime.

One runtime shipped, so one path served: `probeRuntime` asked `/api/version`, which is Ollama's. Three more runtimes arrived, and the rule stopped holding in both directions at once.

`/api/version` answers on none of LM Studio, llama.cpp or vLLM, so all three would report as absent while running. The obvious repair, asking `/v1/models` instead, fails the other way. Every server here answers it, so vLLM holding port 1234 would report as LM Studio, and the collision the rule exists to catch would read as a match.

LM Studio publishes no version anywhere it serves. Its `/api/v0/models` answers a model list, and a list of models isn't a version.

## Decision

**Each runtime names the path its own project serves, and where its version sits in the answer.** Ollama asks `/api/version` and reads `version`. llama.cpp asks `/props` and reads `build_info`. vLLM asks `/version` and reads `version`. LM Studio asks `/api/v0/models`, which a plain OpenAI-compatible server doesn't serve, and reads no version at all.

**A runtime that publishes no version still reports that it answers.** The reachability contract carries the version only when one arrives, and the surface prints the version line only when it has one. A version a runtime never had isn't a reason to call it absent, and inventing one would print a lie.

**A runtime that names a version field must produce one.** Where a runtime names the field and the answer omits it, the look reports another server, which is the rule as it stood.

**A server nobody documents answers the one path they all serve.** A person who typed an address chose what listens there, so recompose holds it to no identity and claims no version.

**The look carries which server it expects.** The probe directive names the provider beside the address, because the path follows the runtime rather than the port.

## Alternatives

- **One shared path for every runtime**: rejected. It reports whichever server holds the port as the runtime a person picked, which is the failure the rule stands against.
- **Asking the identity path and falling back to `/v1/models`**: rejected. The fallback restores the collision for exactly the case the identity path exists to separate.
- **Inventing a version for LM Studio from its model count or its build folder**: rejected. The surface would print a number the vendor never published.
- **Reporting LM Studio as another server because it names no version**: rejected. It answers a path only LM Studio serves, which is stronger evidence of identity than a version string would be.

## Consequences

**Good**: four runtimes connect, each held to its own project's evidence. A different server on a documented port still reads as a different server. The one runtime publishing no version connects without the contract lying about it.

**Bad**: the reachability contract's `answers` arm no longer guarantees a version, so every reader handles its absence. Four identity paths are four facts about other projects, each free to move, and only a failing look would say so. vLLM's `/version` comes from its own source rather than from its documentation, which documents neither that route nor `/health`.
