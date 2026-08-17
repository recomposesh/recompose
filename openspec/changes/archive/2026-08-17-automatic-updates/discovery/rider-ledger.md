## Rider ledger for `openspec/changes/automatic-updates` (tier full)

**Lookup status: succeeded, not a failure.** `gh issue list --repo recomposesh/recompose --label rider --state open --limit 200 --json number,title,body` returned two open rider issues: #245 and #244. Both were judged by body text against the three requirements in `openspec/changes/automatic-updates/specs/updates/spec.md` (channel-owned update source, a downloaded update that waits for the person, a failed check that stays out of the way).

**Result: no prior rider carries into this feature.** The ledger is clean, and the lookup that produced it worked, so this is an empty ledger by judgement rather than by gap.

### Rider #245 — "Shortcut discoverability surfaces: palette, Find, shortcuts overlay" — does not apply

Body defers a Cmd+K command palette, a Find surface, a Cmd+/ keyboard-shortcuts overlay, and a Help-menu item pointing at that overlay. The body names no update, version, restart, release-feed, or install-channel concern, and none of the three spec requirements asks for a discoverability surface. The spec's only interface obligation is a standing affordance that names the waiting version and outlives navigation (spec.md, "A downloaded update waits for the person"), which is renderer chrome, not a palette.

One seam worth naming for the caller, flagged as speculative rather than as a rider claim: both this rider and a possible "Check for Updates…" item would edit the same Electron menu template, `apps/desktop/src/main/menu/app-menu-template.ts`, where the macOS app submenu already carries `{ role: 'about' }` at line 53 — the conventional neighbor for such an item. The automatic-updates spec never asks for a menu item, so this stays a coordination note, not an inherited rider.

### Rider #244 — "Gateway rename has no canvas affordance" — does not apply

Body concerns a Gateway menu Rename item, the missing rename handler on `GatewayGeneralInfo`, the `gateways:update` channel, and the `ModelGeneralInfo` `onRenamed` pattern. Both symbols resolve in this checkout:

- `apps/desktop/src/renderer/src/pages/gateway-canvas/ui/gateway-general-info/gateway-general-info.tsx` — FSD **pages** layer, `gateway-canvas` slice, `ui/` segment
- `apps/desktop/src/renderer/src/pages/gateway-canvas/ui/model-general-info/model-general-info.tsx` — FSD **pages** layer, `gateway-canvas` slice, `ui/` segment

The rider is real and grounded, but its subject is gateway naming on the canvas. No spec requirement in this feature touches gateways, the canvas, or `gateways:update`.

### Grounding for the "greenfield" reading

No update-delivery implementation exists in `apps/desktop/src`. A filename search for `*update*` under that tree returns only `apps/desktop/src/main/ipc/storage-ipc-gateway-update.test.ts` and `apps/desktop/src/main/engine-host/engine-host-credential-update.ts`, both about gateway storage and engine credentials rather than app updates. A content search for `autoUpdater`, `electron-updater`, and `checkForUpdates` across `apps`, `packages`, and `docs` hits documentation only: `docs/adr/0035-release-operations.md`, `docs/adr/0133-an-update-arrives-through-the-channel-that-installed-it.md`, `docs/superpowers/plans/2026-07-25-release-ops.md`, and `docs/superpowers/specs/2026-07-25-release-ops-design.md`. A feature with no prior code surface has had no prior change to shed riders into it, which is consistent with the empty ledger.

### Gaps, named rather than guessed

1. **Rider #245's cited path resolves to nothing in this checkout.** The body points at `openspec/changes/app-menu-shortcuts/discovery/mobbin-references.md`. That change folder is absent both live (`openspec/changes/` holds only `archive`, `automatic-updates`, `landing-docs-site`) and archived (24 entries under `openspec/changes/archive/`, none named for menus or shortcuts), and a content search for the string `app-menu-shortcuts` across `openspec` and `docs` returns nothing. I did not open the referenced Mobbin discovery, so any reference designs it carries are unread.
2. **Both riders were filed against a code state this branch does not hold.** `git log -- apps/desktop/src/main/menu` on `worktree-update-delivery` ends at `352027c8 feat(desktop): the usage explorer as Usage v2 draws it (#167)`, so the app-menu-shortcuts work that spawned #244 and #245 has not landed here. If that change merges before automatic-updates, re-read #245 against the merged `apps/desktop/src/main/menu/app-menu-template.ts` before treating the menu seam above as settled.
3. The judgement rests on issue body text as instructed; I read no issue comments, so a rider whose update-delivery tie-in was added in a comment rather than the body would have been missed.
