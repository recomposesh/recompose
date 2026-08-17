## Implementation tasks

- [x] Task 1: the contract vocabulary. Owns `packages/contracts/` alone and hands off the
      widened enums, `view:command`, `system:surface-toggles`, `usageSearchRangeSchema`,
      `fileBrowserSchema`, and `revealLabelFor`.
- [x] Task 2: the lifecycle extraction and the Dock. Depends on task 1, owns
      `apps/desktop/src/main/tray/` and `apps/desktop/src/main/dock/`, and hands off
      `gatewayLifecycleSubmenu`, `lifecycleAvailabilityFor`, `gatewayServingIn`, and
      `dockRepainter`.
- [x] Task 3: the menu bar, the window seams, and the wire endings. Depends on tasks 1 and 2,
      owns `apps/desktop/src/main/menu/`, `apps/desktop/src/main/windows/`,
      `apps/desktop/src/main/ipc/`, and `apps/desktop/src/main/index.ts`, and hands off the
      installed bar, the conductor's new reflectors, and the bound seams.
- [x] Task 4: the renderer answers and the bridge. Depends on task 1, owns
      `apps/desktop/src/renderer/` and `apps/desktop/src/preload/`, and hands off the root ear,
      the widened command answers, and the fake-bridge stubs.
- [x] Task 5: the end-to-end layer. Depends on tasks 3 and 4, owns `apps/desktop/e2e/`, and
      hands off the two harness readers and the graduated scenarios.
- [x] Task 6: the three decision records. Depends on task 3, owns `docs/adr/`, and hands off
      the landed records.
- [ ] Task 7: the manual macOS pass over a packaged artifact. Depends on task 5, owns no
      files, and hands off the checked list from the test matrix.
