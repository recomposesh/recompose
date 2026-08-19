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

- [ ] 3.1 Shape the constrained classification call per dialect, with forced tool use as the
      fallback channel
- [ ] 3.2 Specify the timeout clock starting at dispatch through `AbortSignal.timeout`
- [ ] 3.3 Inject `classifyBranch` from `gateway-proxy.ts` under the judge's own custody
- [ ] 3.4 Specify the pin store's idle expiry, with the bound as a property law and its twin
- [ ] 3.5 Specify the fingerprint preferring a client key and hashing only turn-stable content
- [ ] 3.6 Specify the judge call staying out of cable accounting
- [ ] 3.7 Specify prompt assembly: delimited tail, else excluded, branch order preserved as a
      property law with its twin, and the tail never logged
- [ ] 3.8 Integration: a conditional table serves end to end with transports doubled at the
      network boundary

## 4. The inspector cluster

- [ ] 4.1 The conditional option, its mode sentence, and the re-judge cost sentence join
      `router-modes.ts`
- [ ] 4.2 Specify branch writes, the judge binding, and else protection in `routing-edits.ts`
- [ ] 4.3 Specify the conditional draft save gate wanting a judge in `model-draft.ts`
- [ ] 4.4 The judge picker and the re-judge toggle land in the router inspector
- [ ] 4.5 Child rows carry labels, rule previews, pin marks, and an inert else row that says why
- [ ] 4.6 Specify label-aware announcements in `spoken-rank.ts`
- [ ] 4.7 The branch rule sheet lands with the shared textarea primitive and their stories
- [ ] 4.8 Row delete lands in the `ContextMenu` confirmed through `ConsequenceDialog`, naming the
      else cost
- [ ] 4.9 Draft fields, the routing picker, and general info offer the conditional mode
- [ ] 4.10 Every touched component's stories land, then the browser pass covers both schemes

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
- [ ] 5.7 The judge becomes a focusable subject with its own drawer body
- [ ] 5.8 Else removal gets refused in `router-acts.ts`, and the mode pill lands on the router
      card
- [ ] 5.9 The browser pass covers the canvas in both schemes

## 6. Graduation and the outer loop

- [ ] 6.1 The shared end-to-end surface lands alone and first, carrying no feature file
- [ ] 6.2 Each feature file graduates with its own step definitions in one commit, five units in
      parallel
- [ ] 6.3 The outer loop goes green on mock traffic
- [ ] 6.4 Visual baselines regenerate on the runners when the canvas changes what they see
