## Rider ledger for `openspec/changes/gateway-canvas` (tier full)

**Lookup succeeded.** `gh issue list --repo recomposesh/recompose --label rider --state open --limit 200 --json number,title,body` returned 11 open rider issues: #117, #118, #119, #120, #121, #122, #123, #136, #137, #138, #140. This is a ledger, not a lookup failure.

### Rides with this feature

**Rider #117, "A virtual model never offers a subscription target",** is the only rider whose body names this feature's trigger condition. It defers its scenario until "the first surface that composes a virtual model from connected accounts," pointing at `openspec/changes/provider-subscriptions/gherkin/` and `openspec/changes/provider-subscriptions/tasks.md` (both now under `openspec/changes/archive/2026-08-03-provider-subscriptions/`, whose `tasks.md:39` carries the deferral text).

**The rider's premise is contradicted by shipped code, and gateway-canvas is where that collision surfaces.** The composition surface arrived with `gateway-virtual-models`, and it offers subscriptions rather than withholding them:

- `apps/desktop/src/renderer/src/entities/account/model/account-kind.ts:40` defines `accountsStandingAsTarget` as an identity function over the stored accounts, documented as "The stored accounts a virtual model's target can name, which is what the target picker offers."
- `apps/desktop/e2e/features/virtual-models/targets.feature:3` titles its scenario "The target picker offers the subscription, key, aggregator, and local kinds," and line 12 adds "A stored subscription target stands bound."

The assertion #117 wants (no composition surface offers a subscription account) is the inverse of the behavior now specced in e2e. The canvas re-expresses target selection as a cable-drag gesture over the same account list, so the brainstorm must settle which policy holds before the specs freeze. This is a decision to escalate, not a task to schedule.

Files the resolution touches, with FSD layer:

| Path (repo-root relative)                                                   | Symbols                                                                                                               | Layer                 |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------- |
| `apps/desktop/src/renderer/src/entities/account/model/account-kind.ts`      | `accountsStandingAsTarget`, `accountsOfKind`, `accountKinds`, `accountKindTitle`, `offeredAccountKind`, `AccountKind` | entities              |
| `apps/desktop/src/renderer/src/entities/account/index.ts`                   | re-exports `accountsStandingAsTarget` (line 6)                                                                        | entities (public API) |
| `apps/desktop/src/renderer/src/entities/account/model/account-kind.test.ts` | specs at lines 65 and 76 pin the current identity behavior                                                            | entities              |
| `apps/desktop/src/renderer/src/pages/gateway-canvas/lib/target-groups.ts`   | `targetGroups` (line 32), consumes `accountsStandingAsTarget` at line 33                                              | pages                 |
| `apps/desktop/e2e/features/virtual-models/targets.feature`                  | (Gherkin, no symbols)                                                                                                 | outside FSD           |

### Adjacent, not this feature's surface

**Rider #123, "subscriptions:activate stands without a surface since the menu prune",** still holds: the channel is wired end to end (`packages/contracts/src/ipc.test-d.ts:116`, `apps/desktop/src/main/ipc/subscriptions-ipc.ts:44` and `:287`, `apps/desktop/src/main/ipc/dispatch.ts:41`, `apps/desktop/src/preload/index.ts:58`) and the only renderer callers are fakes (`apps/desktop/src/renderer/src/shared/testing/fake-subscriptions.ts:61`, `apps/desktop/src/renderer/src/shared/testing/fake-bridge.browser.test.ts:158`). The rider names an account-switching UI as its owner; the gateway canvas composes gateway topology, so it does not claim this channel. Flagged only so nobody mistakes the canvas for that surface.

**Rider #137, "Base-compare the provider-catalog-sheet load flake",** points at a flaky spec: `apps/desktop/src/renderer/src/pages/providers/ui/provider-catalog-sheet/provider-catalog-sheet.browser.test.tsx` (pages layer, `providers` slice), not a canvas file. It matters here only because this feature adds browser tests to the same full-project run that produced the flake; the canvas slice already carries seven `*.browser.test.tsx` files under `apps/desktop/src/renderer/src/pages/gateway-canvas/ui/`.

### Out of scope for gateway-canvas

Node-side or tooling riders, none of which the proposal's "renderer only as currently scoped" impact touches: #118 (`macos-keychain.ts` argv), #119 (macOS sign-in ordering), #120 (`parkInto` stale slot), #121 (terminal launch failures), #122 (`e2e/fake-tools` lacks `codex.mts`; only `apps/desktop/e2e/fake-tools/claude.mts` exists), #136 (stored runtime port re-point), #138 (key-probe bound into `packages/contracts`), #140 (AIMock upstream mock for the serving path).

### Code map: where the canvas lands

The slice already exists from `gateway-virtual-models`, so this feature extends rather than creates it. `apps/desktop/src/renderer/src/pages/gateway-canvas/` (pages layer):

- `index.ts` exports `GatewayCanvasPage`, the slice's whole public API today.
- `ui/gateway-canvas-page/gateway-canvas-page.tsx`, `ui/gateway-stage/gateway-stage.tsx`, `ui/add-model-flow/add-model-flow.tsx`, `ui/option-list/option-list.tsx`, `ui/served-model-row/served-model-row.tsx`, `ui/gateway-drawer/gateway-drawer.tsx`, and `ui/model-fields/model-fields.tsx` each carry a `*.stories.tsx` sibling in the same folder, per the one-folder-per-component rule.
- `model/served-models.ts` holds `ServedTarget`, `ServedModel`, `servedModels`, and `servesTally`.
- `lib/target-groups.ts` (`targetGroups`), `lib/model-draft.ts`, `lib/use-model-draft.ts`, `lib/use-held-draft.ts`, `lib/use-inspector-reveal.ts`, `lib/use-press-away.ts`, `lib/inspector-width.ts`
- `testing/gateway-canvas.testkit.ts`

Lower layers the canvas draws on: `apps/desktop/src/renderer/src/entities/account/` (entities) and `apps/desktop/src/renderer/src/shared/ui/` (shared), whose existing components include `badge/`, `chip/`, `icon/`, `sheet/`, `status-chip/`, `segmented-control/`, `panel-separator/`, `inspector-toggle/`, plus the non-component modules `gateway-state.ts`, `toolbar-shape.ts`, and `place-focus.ts` at the segment root.

### Gaps, named rather than guessed

1. **`templates/gateway/index.html` resolves to nothing in this repository.** `proposal.md:14` cites it as the visual reference. The repo has no `templates/` directory, and the only `index.html` is `apps/desktop/src/renderer/index.html`. The reference lives in the external Claude Design project "recompose-design-system"; whoever implements needs it handed over, since I cannot cite it.
2. **I did not inspect `apps/desktop/src/renderer/src/widgets/`.** The directory exists; a node canvas reused across screens could belong there, but I spent the read budget on the rider judgement and will not name files or a layer placement I have not opened.
3. **No rider mentions cables, nodes, ports, or a canvas.** The ledger is thin by fact, not by lookup failure: only #117 names a condition this feature satisfies.
