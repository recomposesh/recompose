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

- [x] **Task 6b: the serves box tells a thinner pool from a broken one.** Landed as `bea27980`, merged at `ba97fd01`. The third standing, the first-held-target reading, and the row that says how many left. Mutation 100 on `served-models.ts`, no survivors.

  It found the mutation gate passing over its own file, and the gate was blind wider than that. `apps/desktop/stryker.config.json` listed no path under `model/`. The diff-scoped step in `.github/workflows/ci.yml` restated the desktop list by hand, and that copy had already drifted: task 7's `route-seats.ts` and `canvas-subjects.ts` entered the config and never reached the workflow. Three files read as covered while no mutant ever ran against them.

  The repair adds `served-models.ts` to the config and has the workflow read its include list from that same config, so one list can no longer disagree with the other. A local run of the new derivation names all three.

  One defect it measured and left alone, because the file belongs to nobody on this train. The drawer clips its own binding lines. A plain serving row already runs 217 pixels of text into a 196 pixel box, and the shipped removed row clips too. The pressure predates the router work, and the new chip adds 9 pixels to it. So a row that tells a person to repair a binding then hides which binding it means. No assertion can see that, because the text is all there in the document.

- [x] **Task 8: the shared end-to-end surface.** Landed as `af251e32`, merged at `28448c3f`. A worker-scoped stand-in provider, a routed-gateway builder, the picker helpers split out of `canvas-screen.ts`, three shared steps, and rider #154's furniture amendment. Final run 251 passed, none failed, none flaky.

  It corrected the spike on both counts, one in the units' favour and one against.

  - **A named retry time needs no `mount()`.** A fixture carrying `retryAfter` answers `retry-after: 90` as asked, so `refuses(..., { retryAfterSeconds })` is enough. The spike's constraint was wrong.
  - **`mount()` can't serve a path the stand-in already owns.** Mounting `/v1/messages` and reading the body deadlocks, and a mounted request is never journalled, so `modelsAsked()` goes blind to it.
  - **A 200 stream opening with an error event has no expression the cluster found.** Unit 8b owns the scenario that needs one. Read `ResponseFactory` in the fixture's own answer type before concluding otherwise, and report rather than invent if it truly holds.

  Decision 18 broke ten shipped scenarios rather than the one the design expected, and the suite named them rather than a reading of the code. Two say what opens and their text changed. Four walk one stage further, so their step definitions absorbed it and the approved text stands.

  Two things it found and correctly left alone. `connectAccount` in `main/ipc/connect-account.ts` accepts an endpoint on the wire and never stores it, which closed the cleanest route to per-target origins and forced the feature-tree switch instead. And the stand-in ships with no spec of its own, because the only end-to-end include in `vitest.config.ts` is `e2e/fake-tools/**/*.test.mts`.

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
- **The `withXaiRetryAfter` rename.** Answered on main, not here. The train renamed it and main renamed it the same hour, to `asXaiRefusalReads`, and the merge took main's name and dropped the train's. Both readings agreed about the substance: the old name says what the function wraps, and the wrapping is the smaller half of a job that also turns a 403 into a 401.
- **The failure reveal anchoring.** Task 7b owns it.
- **The furniture scenario.** Task 8 owns it, on main's amended line.

## One rider this change found and refuses to carry

The `unit` project in `apps/desktop/vitest.config.ts` is the only one of four that doesn't spread `pacedForCi`. Under a full battery it runs at full file parallelism with no retry, while three chromium projects compete for the same cores. The specs that lose are the ones waiting on a real filesystem read. Four runs on this train each lost to a different `src/main/**` file the branch never opened, the last of them reading a usage ledger before its flush landed. Every one passed alone.

The root `test` block does spread `pacedForCi`, which reads like coverage and isn't. A `projects` entry carrying its own `test` block doesn't inherit it, which is why the three browser projects each restate it.

The train left it alone on purpose. Pacing that project changes every run on every branch, so it wants its own job rather than a line buried in a router feature.

## One question for the review gate

The rules review on task 4 read every `@summary` docstring on a module-private function as a banned comment. The cluster checked before following it and found 53 already committed across `packages/engine/src` and `apps/desktop/src/main`, several of them written by this change's own earlier clusters. CLAUDE.md carves the pattern out for API documentation the tooling reads, which names exported declarations, so the strict reading and the house practice genuinely disagree.

The train kept them, because changing course mid-flight would have rewritten files other clusters own for a rule nobody had stated. Settle it at the gate, in either direction, because it recurs on every cluster that writes a helper.

## Standing rules for every cluster

- Test-first. Each task reports its failing run before writing any implementation, and lands as one green commit.
- Every new component under a `ui/` segment ships its `*.stories.tsx` sibling in the same commit.
- A renderer cluster closes only after someone opens its stories through `claude-in-chrome` in both schemes and reports what they saw.
- Visual baselines come from the runners, never from a laptop.
- No gate config changes. A blocking gate is a design signal.
