# Implementation tasks

## The outer loop, proven red before the first cluster

The phase opened by copying the seven approved scenarios into `apps/desktop/e2e/features/routers/`, where `bddgen` refused the tree:

```text
Missing step definitions: 53
Use snippets above to create missing steps.
```

The phase then deleted the copy without a commit, per the rule. The scenarios graduate for real inside the cluster that owns each feature file, together with the step definitions that answer it, so no commit records a red tree.

## Clusters

Ownership is disjoint by construction. A dependency below is a data dependency, never a file one.

- [ ] **Task 0: design tokens.** Depends on nothing. Authors `--color-router` and `--color-router-ink` and the chamfer treatment in the "recompose-design-system" design project. Owns no repository file. Runs first because task 7 waits on it and nothing else does.
- [ ] **Task 1: contracts config.** Depends on nothing. Lands `routingSchema`, `mintRouteNodeId`, version 3, and the migration. Owns `packages/contracts/src/gateway-config.ts`, `gateway-config.test-d.ts`, `gateway-config-targets.test.ts`, `gateway-config-migration.test.ts`. Runs alone, because the contract files are the one collision point every other cluster reads.
- [ ] **Task 2: contracts protocol.** Depends on task 1. Lands `engineRoutingSchema`, the spend request with its route node, and the traffic shapes. Owns `packages/contracts/src/engine-protocol.ts`, `engine-protocol.test-d.ts`, `engine-traffic.ts`, `engine-traffic.test-d.ts`.
- [ ] **Task 3: engine routing core.** Depends on task 2. Lands `walkAttempts`, `classify`, the two policies, the cooldown ledger, and `firstDeclaredTarget`. Owns `packages/engine/src/routing/` entire, sources and specs.
- [ ] **Task 4: engine serving path.** Depends on task 3. Reshapes `proxyModelRequest` and widens the refusal wire. Owns the serving-path files the design's file map names, plus the six side paths and their sibling specs.
- [ ] **Task 5: main host.** Depends on task 2, parallel to tasks 3 and 4. Lands the per-node grant. Owns `apps/desktop/src/main/engine-host/stored-gateway.ts`, `spend-grant.ts`, `engine-spend.ts`, and their sibling specs.
- [ ] **Task 6: renderer graph and layout.** Depends on task 1, parallel to tasks 3, 4, and 5. Lands the `router` node kind, depth-derived seating, and the graph edits. Owns `pages/gateway-canvas/lib/node-graph.ts`, `tidy-layout.ts`, `model-draft.ts`, `log-scope.ts`, `model/served-models.ts`, and their sibling specs.
- [ ] **Task 7: renderer surface.** Depends on tasks 0 and 6. Lands the router card, the ladder, the kind ask, and the inspector body, each with its stories sibling. Owns the `ui/` folders the design's file map names, plus `app/styles/theme.css` and `primitives.css`.
- [ ] **Task 8: the shared end-to-end surface.** Depends on tasks 4 and 7. Lands the AIMock worker fixture and the navigation steps, and carries no feature file, so nothing goes red. Owns `apps/desktop/e2e/fixtures.ts` and `apps/desktop/package.json`.
- [ ] **Task 8a to 8g: one unit per feature file.** Depends on task 8, all seven parallel. Each graduates exactly one `.feature` into `apps/desktop/e2e/features/routers/` together with exactly one `steps/routers-<area>.steps.ts`, in one commit, so `bddgen` never sees an undefined step. The seven are `failover`, `streaming`, `round-robin`, `refusals`, `stored-shape`, `canvas`, and `inspector`.
- [ ] **Task 9: decision records.** Depends on tasks 4 and 8 settling the residual wording. Owns `docs/adr/0104-*.md`, `docs/adr/0105-*.md`, and `docs/adr/README.md`.

The design's task decomposition named three feature files. The approved scenario set holds seven, and the phase rule gives each its own unit, so task 8 fans out seven ways rather than three.

## Standing rules for every cluster

- Test-first. Each task reports its failing run before writing any implementation, and lands as one green commit.
- Every new component under a `ui/` segment ships its `*.stories.tsx` sibling in the same commit.
- A renderer cluster closes only after someone opens its stories through `claude-in-chrome` in both schemes and reports what they saw.
- Visual baselines come from the runners, never from a laptop.
- No gate config changes. A blocking gate is a design signal.
