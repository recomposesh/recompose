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

- [x] **Task 0: design tokens.** The design project now carries `--indigo` in both schemes, points `--tint-router` at it, and defines `--ink-router` for the first time: `#a5a3ff` on dark, `#3f3daa` on light. Task 7 has the values it waited for.

  Two findings came out of it. The project already held `--tint-router`, set to orange, which is the archived canvas decision 13 reservation that never reached `theme.css`. The maintainer moved it to indigo on a measurement: the app spends orange on `--color-warning` and on the draft cable, and that cable is on screen the moment a router appears.

  The project's `NodeCard.jsx` still draws the router as a plain rectangle wearing the `swap` glyph. That change waits for the design app's own build, because `_ds_bundle.js` is a compiled artifact this session can't regenerate. Shipping the source without its bundle would leave the preview card lying.

  One drift the router work didn't cause and didn't fix. The project sets `--tint-model` to blue where the app ships pink. It also draws the card at 158 by 78 where the app ships 184 by 88.

- [x] **Task 1: contracts config.** Landed as `0dcc7060`, merged at `f364845e`. The route table, its parse walk, `mintRouteNodeId`, version 4, and the migration. Mutation 100 on `gateway-routing.ts`.

  Its scope widened during the run, because the repository typechecks as one unit: 35 files read the field that went away. Nineteen call sites wanted the same answer, so contracts gained `targetTheEntryNames`, the one rule for the single target a routing binds. Every repair is call-site only and behaviorally identical, so the clusters that own those files replace them with real work.

- [ ] **Task 2: contracts protocol.** Depends on task 1. Lands `engineRoutingSchema`, the spend request with its route node, and the traffic shapes. Owns `packages/contracts/src/engine-protocol.ts`, `engine-protocol.test-d.ts`, `engine-traffic.ts`, `engine-traffic.test-d.ts`.
- [ ] **Task 3: engine routing core.** Depends on task 2. Lands `walkAttempts`, `classify`, the two policies, the cooldown ledger, and `firstDeclaredTarget`. Owns `packages/engine/src/routing/` entire, sources and specs.
- [ ] **Task 4: engine serving path.** Depends on task 3. Reshapes `proxyModelRequest` and widens the refusal wire. Owns the serving-path files the design's file map names, plus the six side paths and their sibling specs.
- [ ] **Task 5: main host.** Depends on task 2, parallel to tasks 3 and 4. Lands the per-node grant. Owns `apps/desktop/src/main/engine-host/stored-gateway.ts`, `spend-grant.ts`, `engine-spend.ts`, and their sibling specs.
- [x] **Task 6: renderer graph and layout.** Landed as `68bd3138`. The `router` node kind, one walk of the stored table in `lib/route-graph.ts`, cards in `lib/canvas-cards.ts`, the traffic reading in `lib/cable-traffic.ts`, route edits in `lib/routing-edits.ts`, depth-derived seating, and the fourth log subject. Mutation 99.77, one survivor left alive and named as equivalent.

  Four measurements the later clusters need:

  - **Traffic three levels deep waits on task 2.** Widening `gatewayTrafficSchema` also rewrites `main/engine-host/traffic-ledger.ts`, `ipc/push-events.ts`, and `shared/api/engine.ts`, which the design's file map never listed. Task 6 refused to be the second worker on task 2's file. It left one seam instead: `outcomeInto` in `node-graph.ts` answers every cable's standing, and two specs pin today's behavior so they flip when the record widens.
  - **Node ids stayed byte-identical.** The design asked for every target id to carry its route node id. Doing that uniformly breaks about fifteen files in the `ui/` segment and discards every saved card drag, since the position store keys by node id. The rule that shipped instead: the entry answers in the model's own name, a node below it adds its route node id.
  - **Decision 12's stored-seat shift rests on a false premise.** Canvas seats live in `localStorage` through `canvas-position-store.ts`, not in `gateway.layout.nodes`, and nothing has to write them: depth-derived seating already moves a displaced target one column, because its depth changed.
  - **The serves box reads a routed definition through its lead target.** So a routed model whose lead account left reads as removed while a sibling could serve. Worth a second look from task 7.

- [ ] **Task 7: renderer surface.** Depends on tasks 0 and 6. Lands the router card, the ladder, the kind ask, and the inspector body, each with its stories sibling. Owns the `ui/` folders the design's file map names, plus `app/styles/theme.css` and `primitives.css`.
- [ ] **Task 7b: the gaps task 7 named rather than left silent.** Depends on task 7. Owns `ui/gateway-canvas-page/`, `ui/drop-picker/`, and `ui/cable-failure-chip/`.

  The one that contradicts an approved decision comes first. Proposal decision 2 says a cable may meet a router card. `oneTargetRule` still refuses that drop, and its refusal copy still names a stored target. No approved scenario covers it, which is why task 7 stopped rather than inventing one.

  The rest, in the order a person would meet them. A router has no removal path, and `REMOVAL_WORDING` has no arm for one. A child card born under a router takes its tidy seat rather than the drop point. The cause is that `gatewayBindingChild` mints the id inside the write, so nothing can name the card before it exists. The account stage offers no way back to the kind ask, where only the model stage has a back chevron. Rider #155's failure-chip anchoring rides here too, since it sits in this segment and this train agreed to carry it.

- [ ] **Task 6b: the serves box tells a thinner pool from a broken one.** Depends on tasks 6 and 7 landing, because it crosses both segments. Owns `pages/gateway-canvas/model/served-models.ts` and `ui/served-model-row/`, plus their specs.

  Task 6 flagged it and task 7 measured it. A routed model reads through its lead target, so a pool whose lead account left reads "target removed" while a sibling would have answered. The shipped spec never caught it, because its fixture empties the registry and both children vanish at once.

  The reading task 7 defined: `servedModels` picks the first target whose account the registry still holds, and reads the real model off that same target. `ServedTarget` gains a third standing between the two, for a routing that still holds one account and has lost another. The row then reads how many left rather than declaring the whole binding removed. A one-node routing can never reach the new standing, so every direct-bound definition reads as it does today.

- [ ] **Task 8: the shared end-to-end surface.** Depends on tasks 4 and 7. Lands the AIMock worker fixture and the navigation steps, and carries no feature file, so nothing goes red. Owns `apps/desktop/e2e/fixtures.ts` and `apps/desktop/package.json`. Both merge-blocking verifications already passed against version 1.38.0, recorded in `discovery/session-spikes.md`, along with the one constraint they surfaced: a scenario needing a named retry time drives `mount()` rather than `nextRequestError`, which always answers one second.
      Every end-to-end unit inherits one shipped-behavior change. Decision 18 puts the kind ask in front of every drop-to-picker and plus-ask flow, so a scenario that binds a target now answers "router or target" before the account picker opens. Task 7 found this the hard way: nineteen shipped browser specs expected the picker immediately, and it swept all eight plus-ask sites to catch the last one. Assume the shipped `.feature` files that bind a target need the same step, and check `gateway-canvas/cable-wiring.feature` first.

- [ ] **Task 8a to 8g: one unit per feature file.** Depends on task 8, all seven parallel. Each graduates exactly one `.feature` into `apps/desktop/e2e/features/routers/` together with exactly one `steps/routers-<area>.steps.ts`, in one commit, so `bddgen` never sees an undefined step. The seven are `failover`, `streaming`, `round-robin`, `refusals`, `stored-shape`, `canvas`, and `inspector`.
- [ ] **Task 9: decision records.** Depends on tasks 4 and 8 settling the residual wording. Owns `docs/adr/0107-*.md`, `docs/adr/0108-*.md`, and `docs/adr/README.md`. The design drafted them as 0104 and 0105, but that sequence moved under it: 0104 through 0106 landed today. Ask the `new-adr` skill again before writing, because the sequence can move once more while the clusters run.

The design's task decomposition named three feature files. The approved scenario set holds seven, and the phase rule gives each its own unit, so task 8 fans out seven ways rather than three.

## Standing rules for every cluster

- Test-first. Each task reports its failing run before writing any implementation, and lands as one green commit.
- Every new component under a `ui/` segment ships its `*.stories.tsx` sibling in the same commit.
- A renderer cluster closes only after someone opens its stories through `claude-in-chrome` in both schemes and reports what they saw.
- Visual baselines come from the runners, never from a laptop.
- No gate config changes. A blocking gate is a design signal.
