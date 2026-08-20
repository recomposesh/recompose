# Tasks

## 1. The contracts variant

- [x] 1.1 Specify the conditional member refusing a missing else, a dangling branch child, and a
      dangling else child
- [x] 1.2 Specify duplicate and blank branch labels refused after trimming
- [x] 1.3 Specify judge reachability: a judge referenced only from the policy counts as reachable,
      and a judge sitting in any `children` array gets refused
- [x] 1.4 Specify that declared-order walkers never meet the judge, so token counting can't
      resolve to it
- [x] 1.5 Specify `nameOfRouterMode('conditional')` returning `Conditional` in both naming specs
- [x] 1.6 Widen the mode union in `gateway-config.test-d.ts` in the same commit as the schema
- [x] 1.7 Specify router depth staying capped with a conditional member in the chain

## 2. The engine walk and the pure pick

- [x] 2.1 Make `ChildPicker` async with both existing picks wrapped unchanged, proved by their
      untouched specs
- [x] 2.2 Specify the pure branch pick: a clean label maps to its child, and everything else maps
      to else
- [x] 2.3 Specify the walk-scoped memo: one classification per walk, and retried children never
      re-ask the judge
- [x] 2.4 Specify a decided branch that can't serve falling through to else without a second call
- [x] 2.5 Specify server-state turns: a pinned turn follows its pin, and an unpinned one goes to
      else with no call
- [x] 2.6 Specify a cooling judge short-circuiting before any call leaves the machine
- [x] 2.7 Property law with its deterministic twin: every judge reading maps to exactly one child
- [x] 2.8 Specify judge refusal and judge timeout readings that route rather than refuse

## 3. The judge call, the proxy injection, and the pins

- [x] 3.1 Shape the constrained classification call per dialect, with forced tool use as the
      fallback channel
- [x] 3.2 Specify the timeout clock starting at dispatch through `AbortSignal.timeout`
- [x] 3.3 Inject `classifyBranch` from `gateway-proxy.ts` under the judge's own custody
- [x] 3.4 Specify the pin store's idle expiry, with the bound as a property law and its twin
- [x] 3.5 Specify the fingerprint preferring a client key and hashing only turn-stable content
- [x] 3.6 Specify the judge call staying out of cable accounting
- [x] 3.7 Specify prompt assembly: delimited tail, else excluded, branch order preserved as a
      property law with its twin, and the tail never logged
- [x] 3.8 Integration: a conditional table serves end to end with transports doubled at the
      network boundary

## 4. The inspector cluster

- [x] 4.1 The conditional option, its mode sentence, and the re-judge cost sentence join
      `router-modes.ts`
- [x] 4.2 Specify branch writes, the judge binding, and else protection in `routing-edits.ts`
- [x] 4.3 Specify the conditional draft save gate wanting a judge in `model-draft.ts`
- [x] 4.4 The judge picker and the re-judge toggle land in the router inspector
- [x] 4.5 Child rows carry labels, rule previews, pin marks, and an inert else row that says why
- [x] 4.6 Specify label-aware announcements in `spoken-rank.ts`
- [x] 4.7 The branch rule sheet lands with the shared textarea primitive and their stories
- [x] 4.8 Row delete lands in the `ContextMenu` confirmed through `ConsequenceDialog`, naming the
      else cost
- [x] 4.9 Draft fields, the routing picker, and general info offer the conditional mode
- [x] 4.10 Every touched component's stories land, then the browser pass covers both schemes

## 5. The canvas cluster

- [x] 5.1 Branch labels reach placed nodes and cards through `route-graph.ts` and
      `canvas-cards.ts`
- [x] 5.2 The rule pill rides the cable at the 0.35 anchor with truncation and press-to-reveal,
      with stories
- [x] 5.3 The judge satellite lands with its dotted tie and shoulder anchor, with stories
- [x] 5.4 The satellite seats as an offset from its router in `tidy-layout.ts`
- [x] 5.5 The minimap gains the satellite fill and the dotted tie class
- [x] 5.6 The `cooling` standing joins every exhaustive record in `cable-standing.ts`, painted
      `--color-attention`
- [x] 5.7 The judge becomes a focusable subject with its own drawer body
- [x] 5.8 Else removal gets refused in `router-acts.ts`, and the mode pill lands on the router
      card
- [x] 5.9 The browser pass covers the canvas in both schemes

## 6. Graduation and the outer loop (moved after 7 and 8 in the run order)

- [x] 6.1 The shared end-to-end surface lands alone and first, carrying no feature file
- [ ] 6.2 Each feature file graduates with its own step definitions in one commit, five units in
      parallel. Conditional, else, branches, and sticky conversations have landed. Judge waits on
      the gap recorded below, which asks for a renderer change outside the graduation.
- [x] 6.3 The outer loop goes green on mock traffic. Green over the four graduated files: 341
      passed, 5 skipped, 1 failed, 3 flaky. Every red and every flake reran clean on its own, so
      each belongs to the ten-way local worker count rather than to a scenario. None of the 13 new
      scenarios stood among them. The loop runs again once judge lands.
- [x] 6.4 Visual baselines regenerate on the runners when the canvas changes what they see. No
      canvas baseline exists, so the row pitch changed nothing any visual spec sees. The four
      standing visual failures reproduce unchanged at the commit before this graduation, so they
      belong to an earlier pass rather than to it.

### What the judge file waits on

Section 11 closed three of the four gaps this section first recorded. The environment names the pin
window, a blank label fills from its rule, and the judge inspector prints the cooldown window.
Branches and sticky conversations graduated on those fixes. One gap stays open, and it names a
missing state rather than a missing string.

- **Judge: the two halves of "stays a draft" never stand together.** The scenario "A conditional
  router without a judge stays a draft" asks one Given to show both. `standsIncomplete` in
  `router-node/router-reading.ts` reads the stored policy, so only a stored conditional router
  whose judge names a departed account wears the dashed frame. The withheld button and its reason
  live in `switch-definition.tsx`. That surface mounts only while a switch stands held, and
  `modePicking` opens one on a press the Conditional row never takes once conditional is already
  the stored mode. A run against the built app pinned both readings apart. The stored router whose
  judge account left wears `node-card-drafted` and offers no withheld control, while the failover
  router mid-switch offers the withheld button and wears no dashed frame. The schema refuses a
  conditional policy carrying no judge, so no third state joins the two. Closing this asks for a
  renderer change rather than a step. The same run turned up two findings worth folding into it:
  the router inspector prints the raw account id where a departed judge's account name belongs,
  and the card caption still reads "one judge" beside the dashed frame.

## 7. The mode switch and the mode rows (replan, approved at the gate of 2026-08-19)

- [x] 7.1 Specify the switch to conditional entering definition state: storable once a judge
      binds, every non-else child holds a label and a rule, and the last declared child stands
      as else
- [x] 7.2 The inspector opens the switch definition on a childful router, and the childless
      reason stays
- [x] 7.3 Existing children arrive as draft branches, amber until labeled and ruled, following
      the fresh-switch screen
- [x] 7.4 The mode choice becomes one shared vertical option-row list, mode name plus its
      sentence per row, replacing the segmented control in the inspector and the canvas picker
      step, which asks it as a step of its own
- [x] 7.5 Stories cover the mode rows and every switch state, and the suites stay green

## 8. The pin tally crosses to the renderer (replan, approved at the gate of 2026-08-19)

- [x] 8.1 Contracts: the per-branch pin tally joins the watch channel schema
- [x] 8.2 Engine: a pin write and a pin expiry each emit the router's tally
- [x] 8.3 The bridge carries the tally to the renderer
- [x] 8.4 The inspector rows read the live tally
- [x] 8.5 The tally law, never negative and dropped on expiry, lands as a property with its twin

## 9. Canvas interactions the testing pass caught (replan, approved 2026-08-19 evening)

- [x] 9.1 A cable dropped from a conditional router births a draft branch and opens the label
      editor
- [x] 9.2 The label pill on the cable opens the inline rename editor, and the rule press keeps
      its reveal
- [x] 9.3 Valid drop targets highlight while a cable drags
- [x] 9.4 The satellite drags with a persisted per-router offset, and tidy returns it to the
      default seat
- [x] 9.5 An optional judge directive joins the policy and rides ahead of the compiled
      classification prompt
- [x] 9.6 The judge inspector shows the compiled prompt read-only and edits the directive
- [x] 9.7 Stories cover the new interactions and the suites stay green

## 10. The branch rows stack (replan, approved 2026-08-20)

- [x] 10.1 Each branch row stacks label and pin tally, rule preview, and destination on their own
      lines, and the else row wears the same anatomy
- [x] 10.2 Stories cover worded, unworded, else, and pinned rows in both schemes
- [x] 10.3 The cable carries only the branch label: the rule pill leaves the cable, the label
      press keeps opening the editor, and else keeps its quiet text
- [x] 10.4 A conditional router born from the drawer seats its else child in the next column
      beside it, never a far row
- [x] 10.5 The satellite's default seat centers above its router instead of drifting left
- [x] 10.6 The re-judge toggle says what it does: the title names the action and one plain
      sentence explains each position
- [x] 10.7 The tie's endpoint dots wear the router border color instead of cable blue
- [x] 10.8 Switching away from conditional works: the press confirms the cost through the
      consequence dialog, the children stay in declared order, and the judge leaves with the
      wording

## 11. The three gaps graduation named (in scope: the frozen scenarios pin them)

- [x] 11.1 The engine child honors a pin-window override from its environment, so a scenario can
      age a pin at the process boundary
- [x] 11.2 Saving a branch whose label is empty derives the label from the rule text at the write,
      and the schema stays non-blank
- [x] 11.3 The judge inspector prints the remaining cooldown window as a still reading, and the
      satellite keeps the single word
- [x] 11.4 A conditional router whose judge lost its account wears the draft treatment on its card

## 12. The verification round (adversarial review, rules review, mutation survivors)

- [x] 12.1 Dropping or rebinding a subtree carries out the judges of every conditional router
      inside it, so no judge stands unreachable
- [x] 12.2 The walk backtracks when a judged router offers nothing: the parent tries its next
      sibling, and no request exhausts while a healthy child stands
- [x] 12.3 A system instruction never reads as a caller turn, in either Gemini key order
- [x] 12.4 A judge answer whose body fails to parse routes as a refusal that cools, never as an
      empty label earning a second ask
- [x] 12.5 The pin and cooldown report schemas type the virtual model by its own alias shape
- [x] 12.6 An unnamed judge earns its own reading instead of wearing a timeout
- [x] 12.7 The walk request takes one judged object instead of three optional fields
- [x] 12.8 The two cache-cohabitation specs assert behavior, and the judge-model spec asserts the
      model
- [x] 12.9 The eleven empty trailing comments leave, and the formatter wraps on its own
- [x] 12.10 The surviving mutants in the judge prompt, request, and decision files die to better
      tests
- [x] 12.11 A departed judge's row names the account by its stored name, and the card caption
      stops counting a judge it can't reach
