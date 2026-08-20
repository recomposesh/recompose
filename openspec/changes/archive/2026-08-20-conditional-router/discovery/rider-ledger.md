## Primary finding: no open rider touches this feature, and the empty result is real

The exact command asked for returns nothing:

- `gh issue list --repo recomposesh/recompose --label rider --state open --limit 200 --json number,title,body` returns `[]`
- the same command with `--jq 'length'` returns `0`

This is an empty result, not a lookup failure. Two positive control queries prove the path works:

1. `gh label list --repo recomposesh/recompose` returns the label, described as "Out-of-scope discovery parked from a fix cycle; read by the discovery phase". A missing label would have made `gh` error instead of returning `[]`.
2. `gh issue list ... --label rider --state all --limit 200` returns 33 rider-labeled issues, and every one carries `"state":"CLOSED"`.

So: **zero prior out-of-scope riders apply to `openspec/changes/conditional-router`.** No issue numbers to name, because no open rider exists to judge against the feature body.

### Closed riders that sit near this feature, offered as context only

These are not entries in the open list and carry no open duty. I judged them from titles only, because the `--state all` query I ran did not request bodies, so treat these as pointers the caller may re-query rather than findings:

- #191 "engine: the caller fingerprint reads two of the four credential fields" (closed). Nearest neighbor, because `proposal.md` line 10 keys sticky branches on a conversation fingerprint.
- #155 "rider: engine judgements deferred from the gateway-canvas train" (closed).
- #154 "rider: two frozen gateway-canvas scenarios prove less than they read" (closed).
- #117 "A virtual model never offers a subscription target" (closed).

## Code map, every path verified on local disk

### Contracts (`packages/contracts`, no FSD layer, node-side package)

- `packages/contracts/src/gateway-routing.ts`
  - line 22 `export const routerPolicySchema = z.discriminatedUnion('mode', [` is the union the `conditional` variant joins
  - line 27 `export type RouterPolicy = z.infer<typeof routerPolicySchema>;`
  - line 41 `export function nameOfRouterMode(mode: RouterPolicy['mode']): string`
- `packages/contracts/src/gateway-routing-naming.test.ts` is the existing naming spec, so it is the red-test entry point for `nameOfRouterMode` gaining `conditional`.

Correction worth carrying forward: `proposal.md` line 13 reads as one place ("The mode sentence joins `router-modes.ts` and `nameOfRouterMode` gains `conditional`"), but those two edits land in two different packages. `nameOfRouterMode` lives in contracts; the mode sentence lives in the renderer file below.

### Engine (`packages/engine`, no FSD layer, node-side package)

- `packages/engine/src/routing/attempt-walk.ts`
  - line 56 `type ChildPicker = (` is **declared without `export`**, so it is module-private. The async change named in `proposal.md` line 8 is internal to this file and does not alter the package's exported type surface.
  - line 62 `const PICK_BY_MODE: Record<RouterPolicy['mode'], ChildPicker>` is the switchboard keyed by mode, also module-private. Adding `conditional` to `RouterPolicy['mode']` in contracts makes this `Record` fail to typecheck until the third picker exists, which is the compiler-enforced entry point for the engine work.
  - line 122 `function wouldRotate(walking: Walking, router: EngineRouter): boolean`
  - line 148 `if (wouldRotate(walking, node)) return { at: 'rotation', routeNode, router: node };` is the chained-turn precedent `proposal.md` line 12 says a branch change must follow.
- `packages/contracts/src/engine-routing.ts` matched a grep for the routing symbol set, so it is a consumer to re-check. I did not confirm which symbol it references, so this one is unverified at symbol level.

### Renderer (`apps/desktop/src/renderer/src`, FSD v2.1 per ADR-0010)

All three files sit in the **pages** layer, slice `gateway-canvas`. No widget, feature, or entity slice is involved, which matches the skill's pages-first rule since these consumers are single-page.

- `apps/desktop/src/renderer/src/pages/gateway-canvas/lib/router-modes.ts` (pages layer, `gateway-canvas` slice, `lib` segment)
  - line 14 `export const modeSentences: Record<RouterMode, string>` is where the mode sentence from `proposal.md` line 13 lands
  - line 21 `export const modeOptions`
  - Both are `Record`/list shapes keyed by mode, so a third mode forces edits here first.
- `apps/desktop/src/renderer/src/pages/gateway-canvas/ui/router-inspector/router-inspector.tsx` (pages layer, `ui` segment, one folder per component), line 7 `import { modeOptions, modeSentences } from '../../lib/router-modes';`
- `apps/desktop/src/renderer/src/pages/gateway-canvas/ui/router-draft-fields/router-draft-fields.tsx` (pages layer, `ui` segment), line 6 `import { modeOptions, modeSentences } from '../../lib/router-modes';`
- `apps/desktop/src/renderer/src/pages/gateway-canvas/ui/router-general-info/router-general-info.tsx` (pages layer, `ui` segment) matched the routing-symbol grep and is a consumer to re-check. Symbol-level reference unverified.

Gate note for the caller: any new component folder under a `ui/` segment ships its `*.stories.tsx` sibling in the same folder, because `pnpm run lint:stories` compares against `main` and blocks the push while a sibling is missing.

### Marketing site, a basename collision to avoid

`apps/web` is outside the renderer FSD tree, so no FSD layer applies to it.

- `apps/web/src/landing/router-section.tsx` line 2 `import { RouterModes } from './router-modes';`
- `apps/web/src/landing/router-modes.tsx`, plus siblings `router-panel.tsx` and `router-wires.tsx`

This `router-modes.tsx` is a landing component and is **not** the `router-modes.ts` named in `proposal.md`. Anyone grepping for `router-modes` hits both. Whether the landing copy must learn a third mode is a scope question for the caller, because the proposal's Impact section names contracts, engine, `gateway-canvas`, and the designs file only.

### Change and design artifacts

- `openspec/changes/conditional-router/proposal.md` (read in full)
- `openspec/changes/conditional-router/manifest.md` and `openspec/changes/conditional-router/specs/routers/spec.md` exist but I did not open them
- `designs/recompose.pen` exists; `proposal.md` line 3 attributes screens 0 to 7 to PR #267

## Gaps, stated rather than guessed

1. The open rider set is empty, so the deliverable the caller asked for returns no issue numbers. Confirmed against the label and against the all-state query rather than assumed.
2. The four closed riders above were judged from titles only; bodies not fetched.
3. `packages/contracts/src/engine-routing.ts` and `apps/desktop/src/renderer/src/pages/gateway-canvas/ui/router-general-info/router-general-info.tsx` are confirmed to exist and confirmed to match the routing-symbol grep, but the specific symbol each one references is unverified.
4. `openspec/changes/conditional-router/specs/routers/spec.md` and `openspec/changes/conditional-router/manifest.md` went unread inside the read budget, so any requirement stated only there is absent from this map.
5. `designs/recompose.pen` is encrypted and reachable only through the pencil MCP tools, so I could not confirm the screen 0 to 7 content that bounds the canvas work. Read via `pencil` if the canvas branch needs it.
6. No exported public surface of `packages/engine/src/routing/attempt-walk.ts` was enumerated. The two symbols the proposal leans on, `ChildPicker` and `PICK_BY_MODE`, are both module-private, so callers outside that file were not traced.
