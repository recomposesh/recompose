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

- [x] **Task 2: contracts protocol.** Landed as `5927a199` after a rebase onto task 6. The engine mirror in `engine-routing.ts`, the spend request and the traffic report naming their route node, and traffic keyed three levels deep. Mutation 100 on contracts.

  It and task 6 both split `cable-traffic.ts` out of `node-graph.ts` independently, the only collision this train has seen. The rebase took task 6's side as the base and folded the third level into its `outcomeInto` seam. Four of task 6's specs flipped. The rebase proved that flip with a scratch spec rather than assuming it: the cable into a router now rests, because nothing tries a router itself.

- [x] **Task 3: engine routing core.** Landed as `e0cddea9`. The classification table, both policies, the cooldown ledger, the rotation cursors, and the walk. Mutation 99.22, the two survivors named as equivalent. Four property laws, each with its deterministic twin.

  Two shapes the design left open, decided here. The walk answers a verdict rather than a `Response`, because refusal copy lives in task 4's file. It carries facts, and task 4 renders the wording. The ledger also records whether the provider promised the retry time, because decision 9's choice between 429 and 502 needs that across requests. Without it, a pool downed by transport failures would answer 429 with a time nobody promised.

- [x] **Task 4: engine serving path.** Landed as `12c710cb`, merged at `9f6c5a10`. The per-attempt walk, the commit latch at the first downstream byte, the three refusals, and the notes every failed child leaves behind. Mutation 88.71, after killing 29 survivors in `gateway-walk-notes.ts`, the file that owns every word the refusals say.

  Three shapes the later clusters inherit rather than rediscover:

  - **The refusals, exactly.** An empty router answers 502 with no header code. An exhausted one answers 429 with `Retry-After` only when every child it tried promised a time, and 502 otherwise, both under code `exhausted_router`, naming each child with one of five reasons. A chained turn answers 400 under `chained_turn`. No refusal carries an `x-recompose-*` header, and Gemini renders a 429 as `INVALID_ARGUMENT`.
  - **The commit boundary is drivable from a test.** `truncateAfterChunks: N` with N at least 1 lands past the latch, so the answer forwards verbatim and no sibling begins. `truncateAfterChunks: 0` isn't the other side of it, which matters to any scenario that means to prove a pre-commit swap.
  - **Observability is log-only.** Which account served, a child skipped for cooling, and the last child's true upstream status all reach the log and nothing else. An end-to-end scenario that wants any of the three reads the log, never a header.

  It also left one export behind. Task 2 mirrored `targetTheEntryNames` into the engine as `standingTheEntryNames`, and the walk then replaced every reader of it. The train removed the function and the two specs that were its only callers. The stored-side `targetTheEntryNames` keeps its nineteen readers and stays.

- [x] **Task 5: main host.** Landed as `02da90cd`. Main mints the engine view node by node, and a spend request resolves the account its named node holds. Mutation 98.67, and all five survivors task 2 named on `stored-gateway.ts` are dead.

  Two files outside any cluster's list had to change, both pass-through. `first-request.ts` and `stored-boot.ts` wrap `SpendGrantFor`. Widening it would otherwise have dropped the seat name in production while still typechecking in one direction.

- [x] **Task 6: renderer graph and layout.** Landed as `68bd3138`. The `router` node kind, one walk of the stored table in `lib/route-graph.ts`, cards in `lib/canvas-cards.ts`, the traffic reading in `lib/cable-traffic.ts`, route edits in `lib/routing-edits.ts`, depth-derived seating, and the fourth log subject. Mutation 99.77, one survivor left alive and named as equivalent.

  Four measurements the later clusters need:

  - **Traffic three levels deep waits on task 2.** Widening `gatewayTrafficSchema` also rewrites `main/engine-host/traffic-ledger.ts`, `ipc/push-events.ts`, and `shared/api/engine.ts`, which the design's file map never listed. Task 6 refused to be the second worker on task 2's file. It left one seam instead: `outcomeInto` in `node-graph.ts` answers every cable's standing, and two specs pin today's behavior so they flip when the record widens.
  - **Node ids stayed byte-identical.** The design asked for every target id to carry its route node id. Doing that uniformly breaks about fifteen files in the `ui/` segment and discards every saved card drag, since the position store keys by node id. The rule that shipped instead: the entry answers in the model's own name, a node below it adds its route node id.
  - **Decision 12's stored-seat shift rests on a false premise.** Canvas seats live in `localStorage` through `canvas-position-store.ts`, not in `gateway.layout.nodes`, and nothing has to write them: depth-derived seating already moves a displaced target one column, because its depth changed.
  - **The serves box reads a routed definition through its lead target.** So a routed model whose lead account left reads as removed while a sibling could serve. Worth a second look from task 7.

- [x] **Task 7: renderer surface.** Landed as `fe1a4763`. The chamfered card, the ladder, the kind ask, the router inspector, and the indigo tokens, each component with its stories sibling. Mutation 97.83, three survivors named as equivalent, and two modules entered the mutate list that no cluster had covered before.

  The browser pass earned its place. A green suite said nothing while three real defects sat on the page. The chamfer drew at 181 by 85 inside an 184 by 88 card, because the SVG laid out inside the button's own transparent border. The shipped 11 pixel inset ran the mono line into the inner border, at the exact height a chamfer takes its edges inward. And the raised shadow clipped into four grey corner wedges, because a filter on the path reads no box-shadow. Contrast read off the page: kicker ink 8.54 to 1 on light and 6.49 to 1 on dark.

  The battery earned its place too. Nineteen shipped browser specs encoded the old immediate-account flow, and only the full run caught them, because the cluster had run its new spec files alone.

- [ ] **Task 7b: the gaps task 7 named rather than left silent.** Depends on task 7. Owns `ui/gateway-canvas-page/`, `ui/drop-picker/`, and `ui/cable-failure-chip/`.

  The one that contradicts an approved decision comes first. Proposal decision 2 says a cable may meet a router card. `oneTargetRule` still refuses that drop, and its refusal copy still names a stored target. No approved scenario covers it, which is why task 7 stopped rather than inventing one.

  A second reader checked that reading against the text rather than taking it on trust, and it held. Decision 2 says a cable may meet a router card in as many words, and `oneTargetRule` refuses the drop because `targetAccountIdIn` answers nothing for a node carrying no account. The same file's `askedData` already has a router arm, so a router draws on the canvas today and no cable can reach it.

  The rest, in the order a person would meet them. A router has no removal path, and `REMOVAL_WORDING` has no arm for one. A child card born under a router takes its tidy seat rather than the drop point. The cause is that `gatewayBindingChild` mints the id inside the write, so nothing can name the card before it exists. The account stage offers no way back to the kind ask, where only the model stage has a back chevron. Rider #155's failure-chip anchoring rides here too, since it sits in this segment and this train agreed to carry it.

- [ ] **Task 6b: the serves box tells a thinner pool from a broken one.** Depends on tasks 6 and 7 landing, because it crosses both segments. Owns `pages/gateway-canvas/model/served-models.ts` and `ui/served-model-row/`, plus their specs.

  Task 6 flagged it and task 7 measured it. A routed model reads through its lead target, so a pool whose lead account left reads "target removed" while a sibling would have answered. The shipped spec never caught it, because its fixture empties the registry and both children vanish at once.

  The reading task 7 defined: `servedModels` picks the first target whose account the registry still holds, and reads the real model off that same target. `ServedTarget` gains a third standing between the two, for a routing that still holds one account and has lost another. The row then reads how many left rather than declaring the whole binding removed. A one-node routing can never reach the new standing, so every direct-bound definition reads as it does today.

- [ ] **Task 8: the shared end-to-end surface.** Depends on tasks 4 and 7. Lands the AIMock worker fixture and the navigation steps, and carries no feature file, so nothing goes red. Owns `apps/desktop/e2e/fixtures.ts` and `apps/desktop/package.json`. Both merge-blocking verifications already passed against version 1.38.0, recorded in `discovery/session-spikes.md`, along with the one constraint they surfaced: a scenario needing a named retry time drives `mount()` rather than `nextRequestError`, which always answers one second.
      Every end-to-end unit inherits one shipped-behavior change. Decision 18 puts the kind ask in front of every drop-to-picker and plus-ask flow, so a scenario that binds a target now answers "router or target" before the account picker opens. Task 7 found this the hard way: nineteen shipped browser specs expected the picker immediately, and it swept all eight plus-ask sites to catch the last one. Assume the shipped `.feature` files that bind a target need the same step, and check `gateway-canvas/cable-wiring.feature` first.

- [ ] **Task 8a to 8g: one unit per feature file.** Depends on task 8, all seven parallel. Each graduates exactly one `.feature` into `apps/desktop/e2e/features/routers/` together with exactly one `steps/routers-<area>.steps.ts`, in one commit, so `bddgen` never sees an undefined step. The seven are `failover`, `streaming`, `round-robin`, `refusals`, `stored-shape`, `canvas`, and `inspector`.
- [ ] **Task 9: decision records.** Depends on tasks 4 and 8 settling the residual wording. Owns `docs/adr/0111-*.md`, `docs/adr/0112-*.md`, and `docs/adr/README.md`. The design drafted them as 0104 and 0105, and the sequence has now moved twice under it: 0104 through 0106 landed while the clusters ran, then 0107 through 0110 landed with the main merge below. Ask the `new-adr` skill again before writing, because it moved once more between two merges an hour apart.

The design's task decomposition named three feature files. The approved scenario set holds seven, and the phase rule gives each its own unit, so task 8 fans out seven ways rather than three.

## The train caught up with main, and what that cost

The clusters branch from `origin/main`, and main gained 13 commits after this train forked at `d90351b8`. Two clusters refused their pin rather than guess, which is what surfaced it. The train merged main in, and the whole reconciliation was one conflict plus one spec:

- `packages/engine/src/refusals.ts`. Main reworded the missing-credential refusal in #202, and the train had moved that whole renderer into `refusal-facts.ts` and its siblings. The merge kept the train's split and carried main's new words into their new home, along with the one router spec that asserted the old ones.

Three things the remaining clusters inherit from main rather than from this change:

- **The Architecture Decision Record (ADR) sequence moved again.** Numbers 0107 through 0110 landed on main, and the last of them arrived between two merges an hour apart, so task 9 writes 0111 and 0112.
- **`apps/desktop/e2e/fixtures.ts` already has the pattern task 8 needs.** #200 landed `oneClipboard`, an `auto: true` fixture keyed off Playwright's `$tags`. Anything the seven end-to-end units would each wire by hand has a shipped precedent to follow rather than invent.
- **Main edited the scenario rider #154 planned to amend.** #206 changed `features/gateway-canvas/furniture.feature` from `Given an open gateway detail` to `Given an open gateway detail holding a composition`. Decision 16 hands that same file the router amendment, so whoever writes it starts from main's line rather than the one the design quoted. Task 8 takes it, because it already owns the shipped end-to-end repairs.

## Where decision 16's four rider items stand

The decision folded three items from #155 and one from #154 into this train. They ended up in four different places, so the train tracks them here rather than in one cluster's notes.

- **The credential refusal.** Main answered it in #202 while the train ran. It reworded the message to say an account left rather than blaming the gateway, and it recorded a reason for declining the rest: the string becomes an HTTP body, and an account's label is usually a person's address. The train carried the new words into `refusal-facts.ts` and asserts them, and owes nothing further.
- **The `withXaiRetryAfter` rename.** Still open. The rider asks for a name saying what the function decides rather than what it wraps, and it decides two things: that a 403 from xAI is an auth failure, and that a free-usage 429 owes a day. Four files read it.
- **The failure reveal anchoring.** Task 7b owns it.
- **The furniture scenario.** Task 8 owns it, on main's amended line.

## One question for the review gate

The rules review on task 4 read every `@summary` docstring on a module-private function as a banned comment. The cluster checked before following it and found 53 already committed across `packages/engine/src` and `apps/desktop/src/main`, several of them written by this change's own earlier clusters. CLAUDE.md carves the pattern out for API documentation the tooling reads, which names exported declarations, so the strict reading and the house practice genuinely disagree.

The train kept them, because changing course mid-flight would have rewritten files other clusters own for a rule nobody had stated. Settle it at the gate, in either direction, because it recurs on every cluster that writes a helper.

## Standing rules for every cluster

- Test-first. Each task reports its failing run before writing any implementation, and lands as one green commit.
- Every new component under a `ui/` segment ships its `*.stories.tsx` sibling in the same commit.
- A renderer cluster closes only after someone opens its stories through `claude-in-chrome` in both schemes and reports what they saw.
- Visual baselines come from the runners, never from a laptop.
- No gate config changes. A blocking gate is a design signal.
