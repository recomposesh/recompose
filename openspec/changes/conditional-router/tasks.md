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
- [ ] 5.9 The browser pass covers the canvas in both schemes

## 6. Graduation and the outer loop (moved after 7 and 8 in the run order)

- [ ] 6.1 The shared end-to-end surface lands alone and first, carrying no feature file
- [ ] 6.2 Each feature file graduates with its own step definitions in one commit, five units in
      parallel
- [ ] 6.3 The outer loop goes green on mock traffic
- [ ] 6.4 Visual baselines regenerate on the runners when the canvas changes what they see

## 7. The mode switch and the mode rows (replan, approved at the gate of 2026-08-19)

- [ ] 7.1 Specify the switch to conditional entering definition state: storable once a judge
      binds, every non-else child holds a label and a rule, and the last declared child stands
      as else
- [ ] 7.2 The inspector opens the switch definition on a childful router, and the childless
      reason stays
- [ ] 7.3 Existing children arrive as draft branches, amber until labeled and ruled, following
      the fresh-switch screen
- [ ] 7.4 The mode choice becomes one shared vertical option-row list, mode name plus its
      sentence per row, replacing the segmented control in the inspector and the canvas picker
      step
- [ ] 7.5 Stories cover the mode rows and every switch state, and the suites stay green

## 8. The pin tally crosses to the renderer (replan, approved at the gate of 2026-08-19)

- [x] 8.1 Contracts: the per-branch pin tally joins the watch channel schema
- [x] 8.2 Engine: a pin write and a pin expiry each emit the router's tally
- [x] 8.3 The bridge carries the tally to the renderer
- [ ] 8.4 The inspector rows read the live tally
- [x] 8.5 The tally law, never negative and dropped on expiry, lands as a property with its twin

## 9. Canvas interactions the testing pass caught (replan, approved 2026-08-19 evening)

- [ ] 9.1 A cable dropped from a conditional router births a draft branch and opens the label
      editor
- [ ] 9.2 The label pill on the cable opens the inline rename editor, and the rule press keeps
      its reveal
- [ ] 9.3 Valid drop targets highlight while a cable drags
- [x] 9.4 The satellite drags with a persisted per-router offset, and tidy returns it to the
      default seat
- [x] 9.5 An optional judge directive joins the policy and rides ahead of the compiled
      classification prompt
- [ ] 9.6 The judge inspector shows the compiled prompt read-only and edits the directive
- [ ] 9.7 Stories cover the new interactions and the suites stay green
