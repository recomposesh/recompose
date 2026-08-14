# Rider ledger — `openspec/changes/gateway-routers` (tier full)

## Source

`gh issue list --repo recomposesh/recompose --label rider --state open --limit 200 --json number,title,body` returned **13 open riders**: #118, #119, #120, #121, #122, #123, #136, #137, #138, #140, #153, #154, #155. The command succeeded, so this is a real ledger, not a lookup failure.

Judged against the change text in `openspec/changes/gateway-routers/proposal.md` and `openspec/changes/gateway-routers/specs/routers/spec.md` (new `routers` capability; modified `virtual-models` and `gateway-canvas`; serving path gains a second attempt; schema version + migration).

## Riders that ride with this feature

### #155 — engine judgements deferred from the gateway-canvas train

Three of its six items land inside this feature's blast radius; three do not.

- **Credential refusal names the gateway, not the account.** The routers spec requires refusals that name their origin precisely (`spec.md` "the refusal MUST name the empty router", "a typed refusal naming the exhausted router"), and `proposal.md` says a virtual-model refusal "now names where in the chain it stopped". The refusal copy the rider objects to lives in `packages/engine/src/refusals.ts` (verified: it carries the "holds no credential" text, pinned by `packages/engine/src/refusals.test.ts`). Same file, same editing pass.
- **`withXaiRetryAfter` wants a name that says what it decides.** `packages/engine/src/provider/xai-response.ts` (spec `packages/engine/src/provider/xai-response.test.ts`). Retry-after is exactly the signal the router's cooldown model consumes to decide "retryable outcome" versus "request-scoped outcome"; renaming while that decision grows a second reader is cheaper than after.
- **The error reveal on a failed cable anchors below the chip with no flipping.** `apps/desktop/src/renderer/src/pages/gateway-canvas/ui/cable-failure-chip/cable-failure-chip.tsx` — FSD **pages** layer, `gateway-canvas` slice, `ui/` segment. The named pattern sibling is `apps/desktop/src/renderer/src/pages/gateway-canvas/ui/drop-picker/drop-picker.tsx`. This feature adds a router node between the virtual model and its targets, so cables gain a new midpoint and the failure chip gains new anchor positions.
- **Out of scope for this feature**, though in the same issue: the `anthropicToolSchema` `additionalProperties` coercion (`packages/engine/src/dialect/tool-schema.ts`), the `response.failed` gating, and the Claude thinking-replay key folding. None of the three touch routing.

### #154 — two frozen gateway-canvas scenarios prove less than they read

Both scenarios sit in the capability this change modifies. Verified files: `apps/desktop/e2e/features/gateway-canvas/furniture.feature` and `apps/desktop/e2e/features/gateway-canvas/arrangement.feature`, with steps at `apps/desktop/e2e/steps/gateway-canvas-furniture.steps.ts`. The rider's own remedy for `furniture` ("strengthening needs the scenario to open from a composition") is precisely what a router-bearing composition supplies, so the amendment the rider says needs a maintainer call opens naturally with this change's canvas work.

### #140 — Mock the upstream with AIMock for serving-path integration and e2e

The rider names its own trigger: "Decide adopt-vs-extend-the-stub at that change, with an ADR either way", where "that change" is the serving path. `proposal.md` Impact says the serving path "gains a second attempt where it had none, so the request pipeline changes shape for every provider". The three spec scenarios that need a controllable upstream are "a rate-limited target hands the request to the next one", "a malformed request stops at the first target", and "a failure after streaming began never moves target" — the last matching AIMock's chaos-mode mid-stream disconnect. The stubs it would replace exist: `apps/desktop/e2e/key-probe-stub.ts` and `apps/desktop/e2e/runtime-stub.ts`. **This is the decision rider with the strongest claim on this feature; it asks for an ADR either way.**

### #153 — flaky candidates and the test-infra decisions #151 made under way

Operational, not design. Two of its four candidates sit on the path this feature's e2e work walks: the `seedGateway` timeout after `page.reload()` (page object verified at `apps/desktop/e2e/gateway-screen.ts`; the rider's `:145` line reference is unverified here) and the shared-fixture wipe race that leaks a ghost gateway binding into the next scenario. The third, a fast-check flake in `packages/engine/src/dialect/responses-roundtrip.test.ts`, is on the serving path this change reshapes. Read this before blaming a red on the branch.

### #138 — the key probe's fetch bound follows the runtime bound into contracts

Advisory, not blocking. It is a precedent question this feature re-asks: the routers spec introduces a cooling window ("skip a child that stands cooling", "until its cooling ends"), which is a new time bound needing a home. The rider's two poles are verified: `packages/contracts/src/local-runtimes.ts` (the bound that moved) and `packages/engine/src/provider/key-probe.ts` (the bound that stayed private). If the cooldown bound is declared here, declare it on the contracts side and the rider's argument gets one more supporting case.

## Riders that do not touch this feature

Each judged by body text; none names routing, failover, round-robin, the gateway graph, or the serving path.

- **#137** provider-catalog-sheet load flake — providers page browser test, disjoint slice.
- **#136** a stored runtime's port can move without remove-and-add — local-runtime address editing.
- **#123** `subscriptions:activate` stands without a surface — account switching UI.
- **#122** e2e fake tools lack `codex.mts` — subscription sign-in e2e.
- **#121** terminal launch failures are swallowed — sign-in launch.
- **#120** `parkInto` reports success without refreshing a stale parked slot — keychain custody.
- **#119** macOS sign-in completion can outrun the identity write — subscription identity race.
- **#118** keep the credential blob out of `/usr/bin/security` argv — keychain write path.

## Recommended disposition

1. **Fold in:** #155's credential-refusal wording, #155's `withXaiRetryAfter` rename, #155's cable failure-chip anchoring, and #154's furniture-scenario amendment. All four sit on files this change already opens.
2. **Decide with an ADR:** #140 (AIMock adopt vs extend the stubs). The rider asks for this explicitly at this change.
3. **Read before debugging, do not schedule:** #153.
4. **Consider when siting the cooldown bound:** #138.

## Gaps

- The ledger covers **open** issues carrying the `rider` label only. Closed riders from earlier trains were not read, per the instruction to judge the open label set; if a closed rider was resolved by wording that this change re-opens, it is not represented here.
- `#155`'s error-reveal item was matched to `cable-failure-chip.tsx` by filename and content search, not by reading the anchoring code line by line; confirm the anchor logic lives there before scoping the fix.
- `#153`'s `gateway-screen.ts:145` line reference was not verified; only the file's existence was.
