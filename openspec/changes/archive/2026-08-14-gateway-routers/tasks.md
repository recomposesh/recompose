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

- [x] **Task 7b: the gaps task 7 named rather than left silent.** Landed as `f8b4e50e`, merged at `782382c8`. Mutation 100 on `lib/routing-edits.ts`, no survivors.

  **It refused the first item and it was right.** Two earlier readings, this ledger's and the brief built on it, took decision 2 to license dropping a cable onto an existing router card. A cable on this canvas runs parent to child, so a cable ending on a router card would make that router a child of the source. The stored shape refuses a node answering to more than one parent, and a routing table belongs to one definition. Every such drop is therefore a no-op, unrepresentable, or a re-parent. A re-parent is a move, and `design.md` says the canvas owns only binding. No approved scenario asks for one, and `canvas.feature` confirms it: every scenario there drops on empty canvas or drags out of a port.

  What decision 2 genuinely promised and the code refused was its second half, that the same ask serves a router's children. The plus affordance created a binding the drag couldn't, which also broke the accessibility contract's promise that the two create the same things. That's what landed. A drop-on-a-router gesture needs a scenario naming which move it means before anyone writes it.

  Three more items landed as named. A router leaves by the same key a target does, taking its subtree. A child born under a router seats at the drop point, because the caller now mints its id rather than the write. And the account stage offers the way back it lacked. Rider #155's chip anchoring collided with main, which rewrote the same component the same hour on Base UI's popover while this train used the platform's own. Main's version stands, as it did for the xAI rename.

  **It found a data loss nobody had reported.** Deleting one child of a pool released the whole virtual model into a draft and discarded every sibling target, because every target card went through the same release. One act now answers a target card and a router card alike, and only the entry releases the definition.

  **Two truncation defects came off the page rather than the suite.** The kind ask printed `Ro...` and `Tar...`, and the ladder clipped account names while printing the real model whole. Both are the same bug: the explanation and the identity both shrank, so the identity lost. Both are one line in the row.

  Three things it measured and left, each with a reason:

  - **The picker's back chevron is 22 by 22**, two under the 24 the canvas accessibility contract names. It's the shipped `icon-secondary` button the provider-model stage already used, so it predates this change, and the spacing exception covers it at 120 pixels of clearance. Fixing it means changing a `shared/ui` variant across the app.
  - **`canvas-wiring.ts` still isn't on the mutate list.** Measured at 70.83 against a break of 81, with 21 no-coverage mutants in the flow builders that only browser specs reach. It killed the one survivor its own code introduced. Adding the file is a rider, not a line.
  - **A router has no Remove control in the inspector**, only the key, where a target has both. The drawer link reaches two more files.

  **One fact every renderer cluster after this needs.** Browser specs render unstyled: the `browser` vitest project loads React alone, and Tailwind runs only under Storybook. A geometry assertion there can pass vacuously against a browser default, which one of this cluster's did before it caught itself. Geometry belongs in a story.

- [x] **Task 6b: the serves box tells a thinner pool from a broken one.** Landed as `bea27980`, merged at `ba97fd01`. The third standing, the first-held-target reading, and the row that says how many left. Mutation 100 on `served-models.ts`, no survivors.

  It found the mutation gate passing over its own file, and the gate was blind wider than that. `apps/desktop/stryker.config.json` listed no path under `model/`. The diff-scoped step in `.github/workflows/ci.yml` restated the desktop list by hand, and that copy had already drifted: task 7's `route-seats.ts` and `canvas-subjects.ts` entered the config and never reached the workflow. Three files read as covered while no mutant ever ran against them.

  The repair adds `served-models.ts` to the config and has the workflow read its include list from that same config, so one list can no longer disagree with the other. A local run of the new derivation names all three.

  One defect it measured and left alone, because the file belongs to nobody on this train. The drawer clips its own binding lines. A plain serving row already runs 217 pixels of text into a 196 pixel box, and the shipped removed row clips too. The pressure predates the router work, and the new chip adds 9 pixels to it. So a row that tells a person to repair a binding then hides which binding it means. No assertion can see that, because the text is all there in the document.

- [x] **Task 8: the shared end-to-end surface.** Landed as `af251e32`, merged at `28448c3f`. A worker-scoped stand-in provider, a routed-gateway builder, the picker helpers split out of `canvas-screen.ts`, three shared steps, and rider #154's furniture amendment. Final run 251 passed, none failed, none flaky.

  It corrected the spike on both counts, one in the units' favour and one against.

  - **A named retry time needs no `mount()`.** A fixture carrying `retryAfter` answers `retry-after: 90` as asked, so `refuses(..., { retryAfterSeconds })` is enough. The spike's constraint was wrong.
  - **`mount()` can't serve a path the stand-in already owns.** Mounting `/v1/messages` and reading the body deadlocks, and a mounted request is never journaled, so `modelsAsked()` goes blind to it.
  - **A 200 stream opening with an error event has no expression the cluster found.** Unit 8b owns the scenario that needs one. Read `ResponseFactory` in the fixture's own answer type before concluding otherwise, and report rather than invent if it truly holds.

  Decision 18 broke ten shipped scenarios rather than the one the design expected, and the suite named them rather than a reading of the code. Two say what opens and their text changed. Four walk one stage further, so their step definitions absorbed it and the approved text stands.

  Two things it found and correctly left alone. `connectAccount` in `main/ipc/connect-account.ts` accepts an endpoint on the wire and never stores it, which closed the cleanest route to per-target origins and forced the feature-tree switch instead. And the stand-in ships with no spec of its own, because the only end-to-end include in `vitest.config.ts` is `e2e/fake-tools/**/*.test.mts`.

- **Task 8a to 8g: one unit per feature file.** Each graduates exactly one `.feature` into `apps/desktop/e2e/features/routers/` together with exactly one `steps/routers-<area>.steps.ts`, in one commit, so `bddgen` never sees an undefined step. Every unit proved each scenario non-vacuous by breaking what it claims in production code and watching it go red.

  - [x] **8c round-robin.** Landed as `93ba2178`. Rotation spreads, a cooling child loses its turn, a chained turn refuses. Three mutations, one per scenario, each killing only its own.
  - [x] **8d refusals.** Landed as `1dacbe34`. The empty router and the exhausted one. Three mutations, including one that survived and was the cluster's own mistake rather than a weak test: it moved the constant the assertion also reads, so both sides moved together.
  - [x] **8g inspector.** Landed as `9ce89ff7`. The keyboard reorders the ladder and the live region says where the child landed, and a round-robin list carries no rank. It added the third target the shared surface had left out on purpose.
  - [x] **8a failover.** Landed as `cd8514c9`. A rate-limited child hands on, a malformed request stops at the child that refused it, a child whose account left cools alone while its sibling answers, and a refused walk asks each child once.

    Its third scenario is the guard on task 4b, and it proved that both ways. Restoring the terminal reading reddens that scenario and no other, and flattening the default cooldown to nothing reddens it again through the other half of its sentence. Neither half passes on its own.

  - [x] **8b streaming.** Landed as `60d1b993`. The two scenarios the maintainer left standing: a failure past the first byte closes without moving on, and a status-less drop fails over.

    **It disproved the fact task 4 recorded and three briefs repeated.** `truncateAfterChunks: 1` doesn't land a chunk past the commit latch. Node corks an HTTP write and uncorks on the next tick. The stand-in destroys the socket synchronously after writing, so nothing ever flushes the opening event, and the gateway reads a plain transport failure. Measured from the child: `bytesWritten: 420, bytesRead: 0`, and the caller held a whole answer from the sibling. With no pacing this holds for any value, because the whole answer composes inside one tick. `{ latency: 25, truncateAfterChunks: 2 }` is what works: the await before the second write is the tick boundary that flushes the first. Same run after: `bytesRead: 548`, one `message_start`, ending broken.

    That first failure also caught its own arrangement passing for the wrong reason. The Given proved a byte had arrived while the byte came from the sibling that had already taken over. It now asserts the opening event names the first child's model, which is the only thing on the wire that says who is serving.

    **jscpd forced a scope extension.** A verbatim copy of unit 8c's `theRoutedModelName` tripped the zero-threshold duplicate gate. No honest way keeps it, so the helper moved to `routed-gateway.ts` and both step files read it there.

  - [ ] **8e stored-shape.** Running.
  - [x] **8f canvas.** Landed as `a2682bfb`. The kind ask on a drop, the walk into the account pick, a router standing with no child, a second router nested through the same ask, and one failed-over request painting each cable it touched.

    Its fifth scenario is the one most able to fake a pass, so it answered from three sides. The failed cable's standing comes from the skipped child's own note. The served cable proves out while the first assertion still passes, and spreading one reading over every cable reddens it. A missing reading defaults to resting rather than served, so neither assertion can pass on a default.

    It found two reds it didn't cause. Task 7b widened the cable refusal's wording and left the shipped accessibility step asserting the old sentence, which the train repaired. And a theme scenario fails locally only, because the restart helper inherits the environment without re-adding the stays-back flag, so an exported flag leaks into it.

  Four measurements the remaining units and the review should have.

  - **A chained turn has to travel `/v1/responses`.** Over `/v1/messages` the Anthropic envelope carries no `code` field at all, so nothing there can read `chained_turn`. Two units found this independently. The codes task 4 recorded are real, and they surface in the OpenAI and Responses dialects only.
  - **Arranging a cooling child contaminates the journal.** A real 429 hands that first request to the sibling, so a later `modelsAsked()` assertion would pass on the arranging request alone. Unit 8c clears the journal in its Given through `provider.mock.clearRequests()`, and guards the arrangement rather than assuming it. `provider.forgets()` is the wrong tool, because it resets the fixtures too and disarms everything.
  - **A Given that must send a request needs the model's name and nothing hands it over.** The shared Background records the name nowhere, so unit 8c reads the single virtual model out of the focused gateway rather than hard-coding it.
  - **The shared seeding step flakes under local load.** `gateway-screen.ts` times out waiting for the gateway row after a reload inside `seedGateway`. It sits upstream of every routers scenario and the shipped proxy feature flakes the same way, so it belongs to the machine rather than to any branch.

- [x] **Task 9: decision records.** Landed as `15bf331a`, merged at `c40bf24f`. Record 0113 carries the router design and 0114 the stand-in adoption rider #140 asked for. The design drafted them as 0104 and 0105, and the sequence moved four times while the clusters ran, so the cluster verified the numbers itself against `origin/main` and recorded when it last looked.

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

- [x] **Task 4b: one dead account costs only that child.** Landed as `66b0098d`, merged at `22a3ea24`. Mutation 95.83 across the four files, against a break of 80, and `gateway-attempt.ts` rose from a measured baseline of 85.51 to 92.14 with no uncovered mutants left. It judged and named every one of the twelve survivors, and none of them arrived with this commit.

  A child whose account left now says `has no target` beside its siblings in the exhausted refusal. A routing standing one target alone still answers the shipped `holds no target` sentence, which the proxy scenarios pin and which still passes against the real app.

  **It answered the stale-standing question with a no, and measured both sides rather than asserting one.** After the walk stops ending on a custody failure, the stale reading and the fresh reading agree everywhere it could find a divergence. A lone target, a router child, and both side paths answer the same status, body and code either way. The cost of refreshing isn't small. `createGatewayApp` builds `routingMemory()`, so restarting the child forgets the cooldown ledger and the rotation cursors for every virtual model on that gateway. Not only the ones touching the account that left. Removing one key would un-cool every rate-limited target the app had learned. The restart also kills in-flight requests, and an account can back targets in any stored gateway, so a correct refresh has to sweep them all. If the mirror ever needs to stay fresh, the shape that fits is a directive updating standings in place, which reaches past this cluster and past one file.

  **One line beyond the four edits, said out loud.** The short circuit for a seat the table already stands unbound answered `grant-missing-credential` and now answers `grant-missing-target`. `standingOf` mints `removed` for exactly the condition `resolveTargetCustody` answers `missing-target` for, so leaving them apart would have shipped one fact reading two ways depending only on how fresh the table was.

  Five places where the approved documents disagree with what shipped, named rather than absorbed:

  - **Decision 6 is narrower than the defect it cites.** It says a missing _credential_ becomes a per-child outcome, while #3317 is about custody failing at all, which is what actually poisoned the pool here. It wants the word `custody`. **This is the maintainer's to amend, and the train hasn't touched the proposal.**
  - `design.md`'s classification table had no row for a missing-target grant, and its `AttemptReading` sketch listed five arms where six shipped. Both corrected in place, since the solution design is this change's own artifact.
  - Two places disagreed about one condition: `refusalTheEntryEarns` answered `missingTarget` for a removed standing while `readingAtNode`'s docstring called the same condition a credential failure. One now.
  - The `resolveSpendGrant` docstring promising that a ladder whose first child lost its credential still spends its siblings was true for one verdict and false for the other. True for both now, without touching it.

  `whyOf` hit the complexity ceiling at five arms and split into the two reasons carrying a provider status and the four that were never answered. It touched no gate.

## A graduated scenario found a real defect, which is what they're for

Unit 8a wrote the approved scenario _A credential refusal cools that child alone_ and it couldn't go green on the shipped app. With a failover router over two targets, an account leaving the registry makes the gateway answer 502 `holds no target` and the healthy sibling never hears about it. Nothing leaves the machine. That's the failure this whole change exists to prevent, and it reproduces CLIProxyAPI#3317 inside recompose.

Two halves, both confirmed by reading the code rather than by report:

- `readingFromGrant` in `gateway-attempt.ts` turns any grant verdict other than `resolved` and `missing-credential` into a recompose refusal carrying `retryableHint: false`, which ends the walk. An account that left produces `missing-target` from `target-custody.ts`, so it lands in exactly that arm.
- `removeAccount` in `main/ipc/storage-ipc.ts` rewrites the accounts file and never re-mints the engine view. The gateway handlers and `stored-gateway-serving.ts` re-mint on gateway writes and bind changes only, so a standing goes stale and the short circuit in `readingAtNode` that would have moved on never fires.

It contradicts proposal decision 6, `design.md` line 294, and the docstring on `resolveSpendGrant`, which says in as many words that a ladder whose first child lost its credential still spends its siblings.

Task 4b owns the repair. The mandatory half is the walk, where one child's custody failure must never end it, however stale the view. The stale view is the second half and gets judged on its own, because a standing nobody refreshes misleads more readers than this one.

Two facts unit 8a measured that correct earlier notes:

- **The stand-in always writes `Retry-After` on a 429**, defaulting to one second. So a walk exhausted over 429s answers 429 with a time whether a step named one, and never 502. Task 4's note reads as though 502 were reachable that way from a test.
- **Cooling reaches no log.** `notesThatCarriedARequest` filters a cooling note out of traffic, so the only evidence a caller or a scenario can see is the exhausted refusal naming the child. Task 4's note lists cooling among the log-only observations, and it isn't there either.

## The streaming scenarios the stand-in can't carry, and what happened to them

Unit 8b answered the open question before writing a line, read-only, against `@copilotkit/aimock@1.38.0` itself rather than its docs.

- **`ResponseFactory` can't help.** It's typed `(req) => FixtureResponse | Promise<FixtureResponse>`, the same union a plain fixture answers. It defers _which_ response to pick until the request arrives. It can't widen the wire shape, name a content type, or write raw bytes.
- **An error fixture is always a JSON error, never a stream.** In `dist/messages.js` the Anthropic handler branches on `isErrorResponse` before it ever reads `stream`, and `writeErrorResponse` sets `Content-Type: application/json`. Even at status 200 the answer is a JSON error envelope.
- **Truncation can't abort before the first chunk.** `dist/interruption.js` increments the count and then compares `chunkCount >= truncateAfterChunks`, so 0 and 1 are the same instruction and both abort after exactly one chunk. That's the mechanism behind what tasks 4 and 8 each measured from outside.
- **A truncated stream dies as a bare socket.** It carries no provider error payload, so nothing can read one back.
- **A connection dropping before any status is expressible after all.** `chaos: { disconnectRate: 1 }` destroys the connection before any status line, runs after the fixture matches, and still journals the request, so `modelsAsked()` keeps seeing it. The `mock` docstring in `scripted-provider.ts` says this can't be a fixture, and that's wrong.

The maintainer settled both open questions.

**Chaos rates.** Decision 15 now forbids a rate between 0 and 1 rather than forbidding the control. The purpose was determinism, and at exactly 1 the roll is no longer a roll.

**Delete the two clauses with no expression, rather than defer or reword them.** The approved `streaming.feature` loses the scenario about a stream opening with an error event, and the post-commit scenario loses its `Then the caller receives the provider's stream error unchanged`. What survives is what the suite can prove: the stream closes, no sibling begins, and a status-less transport failure moves on.

Nothing about the product changed, and the behavior is still proven. Task 4 covers the pre-commit error-open path and the verbatim forward in unit specs. It scored 88.71 mutation on the serving path, after killing 29 survivors in the file that owns the wording. What went away is the end-to-end witness, not the guarantee. `specs/routers/spec.md` still requires the forward, and it should: a requirement describes the product, not the test rig.

## Two operational facts the end-to-end units measured

**The harness shares its user-data directory across worktrees.** Every run uses `~/.recompose-e2e-w<parallelIndex>`, so two clusters running end-to-end at once fight over the same folder. The symptoms read like product defects and aren't: `ENOTEMPTY` on the fixture's own cleanup, `ENOENT` making a gateways folder, and `Another gateway already holds the name "Codex"`. A repeat run at ten workers produced 56 failures on an unmodified baseline. Judge this suite on single serial passes, and never run two clusters' end-to-end at once.

**Stray Electron processes survive a mutation run and poison the next suite.** Unit 8a saw 19 failed and 17 flaky across four unrelated features, then 260 passed after `pkill -f Electron`, on the same tree. The tell is wall time, since the poisoned run took twice as long. A broad red at double the usual duration wants the processes cleared before anyone reads it as a branch failure.

## Two observations the streaming unit left standing

**A closed stream and a finished one look alike at the transport.** The caller's read does break on a mid-stream failure, and the scenario asserts that, but it also asserts the events carry no `message_stop`. A client watching only for socket close would read a truncated answer as a complete one. That's about the product rather than the rig.

**The mid-stream failure reaches the log with no context.** It prints a bare `TypeError: terminated`, where the transport-failure path prints the gateway, the virtual model and the target. The project rule asks an error to carry the attempted operation and why it failed. Nothing in this repository logs that line. Giving it context means wrapping the forwarded stream rather than editing a message, which is a change to the serving path and wants its own job.

## One rider this change found and refuses to carry

The `unit` project in `apps/desktop/vitest.config.ts` is the only one of four that doesn't spread `pacedForCi`. Under a full battery it runs at full file parallelism with no retry, while three chromium projects compete for the same cores. The specs that lose are the ones waiting on a real filesystem read. Four runs on this train each lost to a different `src/main/**` file the branch never opened, the last of them reading a usage ledger before its flush landed. Every one passed alone.

The root `test` block does spread `pacedForCi`, which reads like coverage and isn't. A `projects` entry carrying its own `test` block doesn't inherit it, which is why the three browser projects each restate it.

The train left it alone on purpose. Pacing that project changes every run on every branch, so it wants its own job rather than a line buried in a router feature.

## What the verification round found

Three reviewers read the change at `99cf66b9`: an adversarial pair split node side against renderer side, and a rules review over the whole diff. They found seven defects worth repairing, four of them serious, and none of the four was visible from any test the change had written. Three repair clusters carry them.

**Two data-loss paths the change's own repair didn't reach.** Task 7b closed the release that discarded a pool's siblings, on the card path. The inspector's own Delete Target builds its removal id without the route node. So a child of a pool reads as the entry and takes the whole definition with it, behind a dialog naming a router the person never selected. Deleting a child's cable does the same thing without asking at all. The code carries its own justification for a cable skipping the question: releasing a binding stands the definition back as a draft rather than destroying work. A router in the binding makes that false.

**Two critical engine defects.** A stream that dies inside the commit latch escapes the walk entirely. The one guard on the attempt path closes before the latch reads the body, so a child answering 200 and then breaking mid first event gives the caller a 500. No failover, no cooling, no note. That's a status-less failure never reaching failover, which is the class this change exists to close, reopened inside the mechanism that closes it. The Codex reasoning replay carries no account in its key. A failover therefore injects one account's encrypted reasoning into another's request, and the walk stops on a hard 400. Its Antigravity sibling three lines away already keys by account.

**Two approved documents contradict each other.** The proposal says a chained turn never rotates. The design narrows that to the entry router, and the code implements the narrow rule, so a failover entry over round-robin children still rotates a chained turn. The proposal outranks the design, and the repair moves the check to where a router is about to rotate.

**A promise the provider never made.** The cooldown signal accepts Anthropic's rate-limit reset headers as a promised retry time, and those ride every response rather than only a 429. Two children failing with 500 therefore answer 429 with a `Retry-After`, where decision 9 requires 502 and rejects that case in its own words. Reading the headers for cooldown duration stays right. Letting them decide the refusal's status is what breaks.

**One asymmetry against a directly bound target.** A router holding one child inherits the per-gateway cooldown ledger, so a single 503 blacks the model out for a minute and the provider never hears another request. The same target bound directly doesn't, and the branch's own docstring argues for the behavior it doesn't have. It keys on router-ness where it means having a sibling.

The rules review found one user-visible rule written three times, which is how a router takes its name. The engine says it, the card says it, and the inspector says it again, and two of those reach a person at once in a refusal and on screen.

Three things the reviewers proved sound, recorded so nobody repeats the work. The contracts walk refuses every malformed table they could construct, including four separate ways to express a cycle. The walk can't spin whatever the table's shape. And the version 4 migration is now pure, with derived and minted ids in disjoint namespaces.

### What the repairs landed

Three clusters answered the round, and each pushed back somewhere.

**The renderer repair** (`a7724e71`, mutation 98.98) closed both data-loss paths and four of the five smaller findings. Its judgement on the cable: a release asks whenever it would destroy work and passes through only when it wouldn't. It re-derived that from the premise the old rule already stated, rather than writing new wording. The card path stays the single authority on what a removal question says. It left the child-cable reconnect alone. An honest repair needs a rebind act beside the append act, in a file another cluster held, and growing a ladder isn't data loss.

**The rules repair** (`e2bfbcf4`) put the router naming rule in contracts, with a spec pinning the mode a person picks against the name they read back. The card-id encoding went to one writer and one reader, and three boolean parameters became six named functions. It went past what the review asked on the reason list: `satisfies` catches a typo, so it used a keyed record read through `Object.hasOwn`, and a fourth arm now fails the build.

It also disagreed with the review and was right. The review asked for three markup hooks deleted as test coupling. Two of them have six more readers across three gates, and three of those readers prove geometry. One story measures the rank column's alignment, another compares `scrollWidth` against `clientWidth` to prove a narrow row drops the model rather than the account. The accessible tree carries no geometry. Only the hook with no reader anywhere went.

**The engine repair** (`f524b9ea`, mutation 93.11 against a measured 89.45 baseline) closed all five, and answered the latch-timeout question by checking the platform rather than asserting. Node's fetch already bounds an idle body read at undici's 300 second default. The escape this repair closed is what makes that bound useful, since the worst case moved from hang, then 500, no failover, to hang, then failover. It recommends no bound here. The number is a product decision, the bound evaporates under an injected `fetchLike`, and the shape that fits is a deadline on the fetch rather than a timer inside the latch.

Two things it recorded rather than buried. Moving the chained-turn refusal into the walk moves it after the plugin hook. A plugin now sees a turn the walk will refuse, which it judged an improvement and no document anticipated. And `design.md` decision 8 is now wrong on both the file and the condition, because the crossing no longer decides anything about chained turns.

One finding stays open by choice: `configFaultReasons` in `refusal-facts.ts` carries the same unchecked predicate, on main, outside this change.

## One question for the review gate

The rules review on task 4 read every `@summary` docstring on a module-private function as a banned comment. The cluster checked before following it and found 53 already committed across `packages/engine/src` and `apps/desktop/src/main`, several of them written by this change's own earlier clusters. CLAUDE.md carves the pattern out for API documentation the tooling reads, which names exported declarations, so the strict reading and the house practice genuinely disagree.

The train kept them, because changing course mid-flight would have rewritten files other clusters own for a rule nobody had stated. Settle it at the gate, in either direction, because it recurs on every cluster that writes a helper.

## Standing rules for every cluster

- Test-first. Each task reports its failing run before writing any implementation, and lands as one green commit.
- Every new component under a `ui/` segment ships its `*.stories.tsx` sibling in the same commit.
- A renderer cluster closes only after someone opens its stories through `claude-in-chrome` in both schemes and reports what they saw.
- Visual baselines come from the runners, never from a laptop.
- No gate config changes. A blocking gate is a design signal.
