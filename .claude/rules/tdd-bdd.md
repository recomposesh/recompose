# Test-driven and behavior-driven rules, applied inside-out (Detroit/classicist) and written as behavior-style specs

## Method
- Test-first, always: red → green → refactor. No implementation code before a failing test.
- Work **inside-out**: start from the core domain (engine, routing, protocol translation) and grow outward toward APIs/UI. Design emerges from the tests.
- One behavior per test. A "unit" is a **behavior**, not a class or a file.

## Verification style
- **State-based, not interaction-based.** Assert on outcomes and returned/observable state.
- Exercise internal collaborators indirectly through the unit under test instead of mocking them.
- Test doubles only at real process boundaries: network, filesystem, clock, child processes.

## Behavior-style spec language
- Tests are behavior specs: structure and name them Given/When/Then (arrange/act/assert).
- Describe *what* the system does in domain language ("failover shifts traffic to the next healthy target"), never *how* ("calls selectTarget() twice").
- A scenario must make sense to someone who has never seen the implementation.

## Property tests and the mutation gate

- A property test never carries mutation duty alone. `@fast-check/vitest` bakes a random seed into every test name, so Stryker's per-test filter never runs a property against a mutant.
- Every property law on a mutate-listed file gets a deterministic twin spec that pins the same law with fixed values. The property explores; the twin kills.

## The invariant
- **Test code changes if and only if behavior changes.**
- A pure refactor must never require touching a test. If it does, the test has coupled itself to implementation details, so rewrite it around public behavior instead of patching it.
- Forbidden in tests: reaching into private state, asserting call order/counts of internals, importing non-public modules.
