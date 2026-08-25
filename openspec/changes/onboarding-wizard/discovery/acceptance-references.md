# Acceptance-references brief: `onboarding-wizard` (tier full)

## Scope and method

I read the change's spec and manifest, then the parts of the repository the two new requirements already touch (settings schema, the existing get-started checklist, the app-menu spec, the first-request recorder, the traffic outcome union). Then I hunted vendor docs, W3C normative text, and issue trackers for the places each promised behavior is known to break. Every criterion below is written so a reviewer can turn it into a `.feature` scenario or a unit spec.

Repository files read, recorded repository-relative:

- `openspec/changes/onboarding-wizard/specs/onboarding/spec.md`
- `openspec/changes/onboarding-wizard/manifest.md`
- `packages/contracts/src/settings.ts`
- `apps/desktop/src/renderer/src/widgets/get-started/ui/get-started-panel/get-started-panel.tsx`
- `apps/desktop/src/main/storage/settings-amend.ts`
- `openspec/specs/app-menu/spec.md`
- `openspec/changes/archive/2026-07-30-settings-screen/discovery/acceptance-references.md` (for the house format)
- Plus grep sweeps over `packages/contracts/src`, `apps/desktop/src/main`, and `packages/engine/src`

**Stated gap.** My fifteen-read budget ran out before I could open `apps/desktop/src/main/boot/stored-boot.ts`, which is the only file that imports `firstRequestReporter` (`apps/desktop/src/main/storage/settings-amend.ts:37-62`). So I could not confirm **what event fires the reporter**: whether it fires on a recorded `served` outcome, or on an admitted request before the answer is known. Section 3 turns that into the single most important criterion to verify, but I am reporting it as an open question, not a finding.

---

## 1. The standing the wizard wants to record already exists, and it is the checklist's own flag

**Repository finding.** `packages/contracts/src/settings.ts:38-48` is at `SETTINGS_VERSION = 6` and already carries exactly the two fields the new spec needs:

```
firstRequestServed: z.boolean(),
showOnboardingChecklist: z.boolean(),
```

Both arrived together in the `recordTheFirstSession` migration (`settings.ts:94-102`, v4 to v5). `showOnboardingChecklist` is precisely the "same standing" the spec asks finishing and dismissing to share: `apps/desktop/src/renderer/src/widgets/get-started/ui/get-started-panel/get-started-panel.tsx:120` writes `{ showOnboardingChecklist: false }` when the celebration finishes, and line 182 writes the identical patch when a person skips. Finish and dismiss already collapse to one switch.

**The design question this forces.** If the wizard reuses `showOnboardingChecklist`, then dismissing the full-window wizard also kills the sidebar checklist, and reopening from the menu also brings the sidebar checklist back. If the wizard takes a new field, a profile can stand "wizard done, checklist showing," and the two surfaces disagree about whether setup is over. There is no third option that keeps both honest.

**Acceptance criteria**

1. Finishing the wizard and dismissing it write the same field to the same value, asserted by two specs that read the stored document after each path (spec requirement 1, "MUST both record the same standing").
2. Whichever field carries the standing, a spec pins what the sidebar checklist does after the wizard is dismissed. Name the answer in the ADR rather than letting it fall out of the implementation.
3. If a new field lands, `SETTINGS_VERSION` goes to 7 with a migration whose spec covers: a v6 document migrating forward with the new field defaulted, idempotence on an already-v7 document, and a property over generated v6 documents. The existing suite in `packages/contracts/src/settings-migration.test.ts` already runs this shape for every prior step, so the pattern is set.
4. `apps/web/content/docs/reference/configuration-files.md:14` enumerates the v6 field list by name. A schema bump that leaves that line saying `schemaVersion: 6` ships a lie in published docs. Treat updating it as part of the migration's definition of done.
5. A profile that has never finished and never dismissed opens the wizard; every other launch does not. Assert both from a stored document, never from renderer state.

**Prior art on getting this wrong.** Home Assistant's architecture tracker carries a 2019 request to re-run onboarding wizards precisely because the completion flag was one-way and there was no path back in ([home-assistant/architecture#228](https://github.com/home-assistant/architecture/issues/228), 9 May 2019). The reopen path in this change's spec is the right instinct; make it a spec, not a follow-up.

---

## 2. The engine has no outcome called "refused"

**Repository finding, and it blocks a scenario as written.** `packages/contracts/src/engine-traffic.ts:27-30` defines the outcome union as three literals, confirmed by the type spec at `packages/contracts/src/engine-traffic.test-d.ts:20`:

```
expectTypeOf<RequestOutcome['outcome']>().toEqualTypeOf<'live' | 'served' | 'failed'>();
```

The change's second scenario says "a gateway answers a request with a refusal and records it as refused." Nothing records `refused`. The vocabulary is `failed`, and there is a third state, `live`, which is neither served nor failed and which the scenario does not mention.

**Acceptance criteria**

1. The spec text is rewritten to the vocabulary that exists: a `failed` outcome leaves the wizard waiting. Under the project's own consistent-vocabulary rule (`.claude/rules/clean-code.md`, "one concept = one name across the codebase"), shipping a fourth word for a state that already has one is a defect in the spec, not a gap in the engine.
2. A `live` outcome leaves the wizard waiting. This is the state the two written scenarios skip, and it is the one a streaming answer sits in longest. Without a spec, an implementation that tests `outcome !== 'failed'` passes both written scenarios and finishes the wizard on a request that has not answered yet.
3. A `live` outcome that later becomes `served` finishes the wizard; a `live` outcome that later becomes `failed` does not. The engine already has a commit latch that distinguishes a committed stream from an error before commit (`packages/engine/src/gateway-stream-commit.ts`, exercised across `packages/engine/src/gateway-stream-commit.test.ts`), so a stream that starts fine and rate-limits mid-flight is a real case with a real answer.

---

## 3. The served signal already exists, writes once, and swallows its own failure by design

**Repository finding.** `apps/desktop/src/main/storage/settings-amend.ts:26-62` already implements the whole path. `recordFirstRequestServed` returns `null` when the flag is already set, so the file takes at most one write per profile. `firstRequestReporter` does the write off the request path and catches its own error:

```
.catch((error: unknown) => {
  console.error('recompose could not write down the first served request.', error);
});
```

Its docstring states the intent plainly: "A record that fails is written down and the next grant is not retried here: the latch already closed, and the checklist heals on the next profile read."

That is a defensible trade for a sidebar checklist. It is a worse trade for a full-window wizard. The checklist healing on the next profile read means a stale checklist row for a while; a wizard that misses the write means **the person stays trapped on the waiting step for the rest of the session even though their request was served**, and the only way out is the dismiss action.

**Acceptance criteria**

1. The wizard's completion is driven by the same push the write triggers (`reflect` in `settings-amend.ts:49`), not by re-reading settings on an interval. Assert the wizard resolves without a settings refetch.
2. When the settings write fails, the wizard still resolves for the current session. The person saw the request get served; the wizard must not argue with them because a file was locked. A spec should force a write failure and assert the wizard leaves anyway, and that the next launch re-opens on the waiting step (honest, since nothing was recorded).
3. The docstring's phrase "the observer a grant latch calls" is the open question. Verify the trigger reads a recorded `served` outcome. If it fires on admission rather than on the answer, requirement 2 of this change ("It MUST read that signal from the outcome the gateway recorded for the request, and that outcome MUST stand as served") is already violated by shipped code, and the fix belongs in this change. **I could not confirm this; `apps/desktop/src/main/boot/stored-boot.ts:37` is the file to open.**
4. Two requests served in the same second produce at most one write. `recordFirstRequestServed` reads then writes without a lock, so two concurrent calls can both see `false`. The existing spec at `apps/desktop/src/main/storage/settings-amend.test.ts:56` covers the sequential case only.

---

## 4. A credential can be stored and still refused, which is why the wizard waits for a served request

The spec's claim that "the app can store a credential that a provider still turns away the first time a client spends it" is well supported and worth citing in the ADR rather than asserting bare.

- Anthropic documents 401 `authentication_error` as covering a key that is "malformed, revoked, or expired," and 403 `permission_error` as a key that lacks permission for the resource, both of which a client only discovers by spending the key ([Claude API errors](https://platform.claude.com/docs/en/api/errors)). 402 `billing_error` is a fourth way a syntactically perfect key fails on first use.
- GitHub Copilot is the sharper case, and this repo already ports its device flow (`docs/adr/0101-recompose-runs-copilot-device-flow.md`). The device flow completes and hands back a valid GitHub token, and the Copilot endpoint then answers 403 because the account carries no Copilot subscription. GitHub's community tracker carries this as a recurring report across years ([discussion #52546](https://github.com/orgs/community/discussions/52546), [#56256](https://github.com/orgs/community/discussions/56256), [#165646](https://github.com/orgs/community/discussions/165646)). Sign-in succeeding and inference failing are genuinely independent events.
- This repository has already hit the same shape from the other direction: OpenRouter's `/api/v1/credits` 403s a normal inference key, so a stored key that works for inference fails a naive validity probe.

**Acceptance criteria**

1. Connecting an account advances the wizard's account step but never finishes the wizard. A spec connects an account, asserts the wizard still stands on the waiting step, and asserts nothing recorded the standing.
2. A probe request the app makes on the person's behalf does not count. Only a request a client sent through a gateway and the gateway recorded as served counts. Otherwise the wizard celebrates the app talking to itself.
3. A 401, 403 or 402 from the provider on the first spent request surfaces on the waiting step naming the provider and the reason, per `.claude/rules/clean-code.md` ("Fail with context: error messages carry the attempted operation and why it failed").

---

## 5. The full-window surface: Escape is a permanent dismissal waiting to happen

The wizard "holds the whole window," which is a modal dialog by every definition that matters to assistive technology.

**Normative requirements** from the [WAI-ARIA APG modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/): focus moves to an element inside the dialog on open; Tab and Shift+Tab wrap within it; **Escape closes the dialog**; the container carries `role="dialog"` with `aria-modal="true"` and a name from `aria-labelledby` or `aria-label`; on close, focus returns to the invoking element.

**The trap.** Escape closing a normal dialog is harmless. Escape closing this one records a standing that never returns on its own. A stray Escape keypress permanently dismisses first-run setup. If the surface is a native `<dialog>` opened with `showModal()`, Escape is browser behavior you cannot suppress by ignoring the event; the only supported way off it is `closedby="none"`, and MDN notes that attribute is **not yet widely supported** ([MDN `<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog)).

**Chromium focus divergence.** Chrome moves focus to the first focusable element on `showModal()` where Safari and Firefox focus the dialog, and React's `autoFocus` prop does not behave as the HTML attribute does inside a dialog ([Matuzovic, "O dialog focus, where art thou?", 2023](https://www.matuzo.at/blog/2023/focus-dialog/); [react#23301](https://github.com/facebook/react/issues/23301)). Electron is Chromium, so the app gets Chrome's behavior, but a Storybook or browser-project spec written against a different engine would not catch a regression. Pin initial focus explicitly.

**Acceptance criteria**

1. Escape does not record the dismissal standing. Either Escape does nothing on the wizard, or Escape routes through the same confirmed dismissal action a visible control offers. A spec presses Escape and asserts the stored document is unchanged.
2. The surface carries `role="dialog"`, `aria-modal="true"`, and an accessible name tied to the visible heading. If it is a native `<dialog>` opened with `showModal()`, do not add `role="dialog"` or `tabindex` by hand; both are MDN-documented mistakes.
3. Everything behind the wizard is inert. MDN's `inert` page warns there is no visual signal that a subtree is inert, so the criterion is behavioral: a Tab press from the last control in the wizard lands back inside the wizard and never on a canvas node ([MDN `inert`, baseline April 2023](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inert)).
4. Initial focus is asserted by name, not by "something inside." Assert the specific element in a browser spec, so the Chromium first-focusable behavior is pinned rather than inherited.
5. Reopening from the menu and then leaving returns focus to a defined place. The APG's "return focus to the invoking element" has no answer when the invoker was a native menu item, so pick a target and spec it.
6. A visible dismissal control exists and is reachable by keyboard. MDN states this outright for dialogs, and Nielsen Norman's onboarding research says every onboarding step should be skippable ([NN/g, Mobile-App Onboarding](https://www.nngroup.com/articles/mobile-app-onboarding/)).

---

## 6. Do not gate this with a router redirect

**Finding.** TanStack Router's own [Authenticated Routes guide](https://tanstack.com/router/latest/docs/framework/react/guide/authenticated-routes) documents both approaches, and explicitly blesses the non-redirect one: "show a login form that either replaces the main content or hides it via a modal." The redirect approach has a long tail of loops in the tracker, all of the shape this feature would hit (a condition evaluated in `beforeLoad` that redirects to a location whose own `beforeLoad` re-evaluates it): [#1882](https://github.com/TanStack/router/issues/1882), [#2142](https://github.com/TanStack/router/issues/2142), [#1728](https://github.com/TanStack/router/issues/1728), [#2418](https://github.com/TanStack/router/issues/2418), [#2767](https://github.com/TanStack/router/issues/2767), [#2871](https://github.com/TanStack/router/issues/2871).

The spec's own wording favors the overlay reading: the wizard "holds the whole window" and "resolves into the canvas," which is a surface over a route, not a route of its own.

**Acceptance criteria**

1. The wizard renders over the standing route; no `/onboarding` route exists and no `beforeLoad` throws a redirect for onboarding standing. Guards the loop class above.
2. Deep-linking to any route while the wizard stands leaves that route underneath, so resolving the wizard lands on it rather than on a default.
3. The wizard's presence is not encoded in the URL or in search params, matching "The wizard MUST NOT store where a person stood inside it."

**Recommendation.** Render in place. It is the vendor's documented alternative, it avoids the loop class entirely, and it matches the spec's own language.

---

## 7. Deriving the step from stored state: the failure is a wizard that walks backwards

The spec requires the opening step be computed from what the profile holds. It says nothing about what happens to the step **while the wizard stands** if that state changes.

A profile with a gateway and a virtual model opens on the waiting step. If the person deletes the virtual model from behind the wizard, or the wizard's own step lets them remove one, a purely derived step recomputes and the wizard jumps backwards under their hands. That is a change of context they did not ask for, which is what WCAG 3.2.2 On Input exists to prevent ([W3C Understanding 3.2.2](https://www.w3.org/WAI/WCAG22/Understanding/on-input.html)).

**Acceptance criteria**

1. The opening step is computed once per opening, from stored state. A spec asserts the four openings the requirement names: never seen, dismissed, finished then reopened, and gateway-plus-virtual-model.
2. Deleting the last virtual model while the wizard stands on the waiting step does not throw the person back to an earlier step mid-session. Pick forward-only-within-a-session or full recomputation, spec it, and name the rejected option in the ADR.
3. Reopening from the menu on a finished profile lands on the derived step for that profile's actual state, not on welcome and not on the last step. A finished profile carrying a gateway and a virtual model reopens on the waiting step, which is the same rule the launch path uses.
4. Nothing writes a step index, a step name, or a progress counter to disk. Assert it as a serialisation property over the stored document.

---

## 8. The way back in conflicts with the app-menu spec that is already merged

**Repository conflict.** The change says "The app menu MUST offer a way back in." The merged `openspec/specs/app-menu/spec.md:14` says the opposite about the closest existing item:

> "The onboarding checklist item MUST live under View on every platform, because it shows and hides a surface rather than configuring the app."

with a scenario at line 17 asserting "the app menu carries no checklist item." The wiring already exists: `apps/desktop/src/main/menu/app-menu-conductor.ts:47` calls `amendStoredSettings` to flip the checklist standing from the menu.

Two readings are possible: "app menu" in the new spec means the application menu bar generally, in which case there is no conflict and the item belongs under View beside the existing one; or it means the macOS app menu specifically, in which case the new spec contradicts a merged one. **This has to be settled before implementation, not during review.**

**Prior art.** VS Code separates the two actions and it is worth copying: "Welcome: Show Welcome Page" reopens the surface, while `workbench.action.resetGettingStartedProgress` resets progress; there is still no per-walkthrough reset ([microsoft/vscode#212819](https://github.com/microsoft/vscode/issues/212819), reported from search results, not fetched directly). Reopening and resetting are different intents and a single menu item that does both will surprise someone.

**Acceptance criteria**

1. The way back in lives where the merged app-menu spec puts onboarding items, or that spec is amended in this change's diff. No third outcome.
2. Taking it on a finished profile opens the wizard, and the wizard opens on the derived step (see 7.3).
3. While the wizard stands, the route-scoped menus and New Gateway render as unavailable. The merged spec already requires this for any modal surface (`openspec/specs/app-menu/spec.md:72`, "so an armed accelerator never acts behind a question"), and the wizard is one. A spec should press a gateway lifecycle accelerator with the wizard standing and assert nothing happened.
4. Reopening does not clear `firstRequestServed`. Reopen is a view action, not a reset.

---

## 9. A full-window surface in a frameless window eats its own clicks

This repository ships a custom window chrome (commit `c1145270`, "give Windows its own window chrome"), so the wizard's top edge will overlap a draggable region.

`-webkit-app-region: drag` swallows pointer events for anything under or overlapping it. Electron's tracker carries this as a decade-long recurring report: [#1354](https://github.com/electron/electron/issues/1354) ("eats all click events"), [#741](https://github.com/electron/electron/issues/741), [#11994](https://github.com/electron/electron/issues/11994) (blocks listeners attached to `window`), [#12150](https://github.com/electron/electron/issues/12150), [#18529](https://github.com/electron/electron/issues/18529) (drag elements always paint above), [#33462](https://github.com/electron/electron/issues/33462). The vendor's own remedy is explicit: mark every interactive element inside or overlapping a drag region `no-drag` ([Electron, Custom Window Interactions](https://www.electronjs.org/docs/latest/tutorial/custom-window-interactions)).

**Acceptance criteria**

1. Every control in the wizard's top region is clickable, asserted by a real click in a browser or e2e spec rather than by reading the class list.
2. The window is still draggable by its chrome while the wizard stands. A full-window overlay that sets `no-drag` across its whole surface makes the window immovable.
3. The wizard covers the content area without hiding the platform window controls. On macOS the traffic lights must stay visible and operable.

---

## 10. Announcing the wait, and honouring reduced motion

The waiting step's whole job is to change state without the person touching anything. WCAG 4.1.3 Status Messages is the criterion that covers exactly this: "status messages can be programmatically determined through role or properties such that they can be presented to the user by assistive technologies without receiving focus," and the Understanding document's own example is a waiting state ending ([W3C Understanding 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)).

The step indicator wants `aria-current="step"` on exactly one step, updated as the current step changes ([MDN `aria-current`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-current)).

The existing checklist celebrates completion with a twelve-piece confetti burst (`get-started-panel.tsx:22-53`). If the wizard reuses that, WCAG 2.3.3 Animation from Interactions applies ([W3C Understanding 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)).

**Acceptance criteria**

1. The waiting step's status is in a live region, so a screen reader hears "served" without the person tabbing to find it (4.1.3).
2. Exactly one step carries `aria-current="step"`, and it moves when the step moves.
3. Under `prefers-reduced-motion: reduce`, the celebration does not animate and the wizard still resolves. Assert the resolution, not the pixels.
4. The wizard resolving does not move focus somewhere arbitrary on the canvas. Define the landing focus target and spec it.

---

## 11. Testability

Playwright's own Electron fixture creates a fresh user-data directory per test and hands it to the app, which is the supported way to exercise a first-run path ([microsoft/playwright `tests/electron/electronTest.ts`](https://github.com/microsoft/playwright/blob/main/tests/electron/electronTest.ts); [Playwright Electron API](https://playwright.dev/docs/api/class-electron)).

**Criteria:** the first-run scenario runs against a fresh profile directory, never against a shared one; a second scenario relaunches the same profile and asserts the wizard does not return; the menu reopen scenario runs on a profile seeded as finished. Native menu clicks are not drivable through the page, so the reopen path is exercised through the main process, consistent with how the repository already tests menus (`apps/desktop/src/main/menu/app-menu-template.test.ts`).

---

## Where the sources conflict or the evidence is thin

1. **The reporter's trigger is unverified.** I never opened `apps/desktop/src/main/boot/stored-boot.ts`. The phrase "grant latch" in `settings-amend.ts:40` reads like admission, not answer. Criterion 3.3 is the one to check first; if it is admission, this change has a defect to fix, not just a feature to build.
2. **"App menu" is ambiguous** in the change's own text, and the two readings land on opposite sides of a merged spec. Settle it before implementation.
3. **`refused` is my strongest spec-level finding**, and it is a wording fix, not a behavior fix. I am confident the union is `live | served | failed` because the type spec asserts it exactly; I am less confident about whether the spec author meant `failed` or meant to introduce a new state.
4. **Apple's HIG has nothing usable** on where a re-run-setup menu item belongs. I searched and found only the Menu Anatomy page and unrelated Setup Assistant deployment docs. Do not attribute a placement to Apple.
5. **`closedby="none"` support is unconfirmed for this Electron version.** MDN says not yet widely supported and gives no baseline date. If the wizard is a native `<dialog>`, verify against the shipped Chromium before relying on it; otherwise handle Escape at the application level.
6. **Several search results for "onboarding wizard reappears" pointed at repositories I could not verify as real projects.** I dropped them. The Home Assistant issue and the VS Code walkthrough behavior are the two pieces of prior art I stand behind, and the VS Code one comes from search summaries rather than a fetched page.
7. **I did not verify how the wizard would receive the served push in the renderer.** The reflect callback exists in the main process (`settings-amend.ts:49`); which channel carries it and whether the renderer already subscribes is unread.

---

## Recommendation

Three criteria are non-negotiable, because each guards a failure that ships silently:

- **Escape must not record the dismissal standing.** It is one keystroke between a first-run person and an onboarding surface they can only recover through a menu they have not learned yet.
- **A failed settings write must not trap the person on the waiting step.** The existing recorder catches and logs by design, which is right for a checklist and wrong for a modal surface.
- **A `live` outcome must leave the wizard waiting.** Neither written scenario covers it, and the naive implementation gets it wrong while passing both.

And one scope item to settle before any code: **decide whether the wizard shares `showOnboardingChecklist` with the sidebar checklist or takes its own field.** Everything in section 1 and the migration work in criterion 1.3 hangs off that answer, and the change cannot be implemented without it.

---

## Sources

- [WAI-ARIA APG, Modal Dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [MDN, `<dialog>` element (`closedby`, Escape, accessibility notes)](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog)
- [MDN, `inert` global attribute (baseline April 2023)](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inert)
- [MDN, `aria-current`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-current)
- [W3C Understanding WCAG 4.1.3 Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)
- [W3C Understanding WCAG 3.2.2 On Input](https://www.w3.org/WAI/WCAG22/Understanding/on-input.html)
- [W3C Understanding WCAG 2.3.3 Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)
- [TanStack Router, Authenticated Routes guide](https://tanstack.com/router/latest/docs/framework/react/guide/authenticated-routes)
- TanStack Router redirect-loop reports: [#1882](https://github.com/TanStack/router/issues/1882), [#2142](https://github.com/TanStack/router/issues/2142), [#1728](https://github.com/TanStack/router/issues/1728), [#2418](https://github.com/TanStack/router/issues/2418), [#2767](https://github.com/TanStack/router/issues/2767), [#2871](https://github.com/TanStack/router/issues/2871)
- [Electron, Custom Window Interactions (drag regions and `no-drag`)](https://www.electronjs.org/docs/latest/tutorial/custom-window-interactions)
- Electron drag-region click-swallowing reports: [#1354](https://github.com/electron/electron/issues/1354), [#741](https://github.com/electron/electron/issues/741), [#11994](https://github.com/electron/electron/issues/11994), [#12150](https://github.com/electron/electron/issues/12150), [#18529](https://github.com/electron/electron/issues/18529), [#33462](https://github.com/electron/electron/issues/33462)
- [Claude API errors (401 `authentication_error`, 402 `billing_error`, 403 `permission_error`)](https://platform.claude.com/docs/en/api/errors)
- GitHub Copilot token-valid-but-403 reports: [community #52546](https://github.com/orgs/community/discussions/52546), [#56256](https://github.com/orgs/community/discussions/56256), [#165646](https://github.com/orgs/community/discussions/165646)
- [home-assistant/architecture#228, re-running onboarding wizards (9 May 2019)](https://github.com/home-assistant/architecture/issues/228)
- [microsoft/vscode#212819, reset walkthrough progress](https://github.com/microsoft/vscode/issues/212819)
- [Manuel Matuzovic, "O dialog focus, where art thou?" (2023)](https://www.matuzo.at/blog/2023/focus-dialog/) and [react#23301, `autoFocus` inside `<dialog>`](https://github.com/facebook/react/issues/23301)
- [Nielsen Norman Group, Mobile-App Onboarding](https://www.nngroup.com/articles/mobile-app-onboarding/)
- [Playwright Electron API](https://playwright.dev/docs/api/class-electron) and [Playwright's own Electron test fixture](https://github.com/microsoft/playwright/blob/main/tests/electron/electronTest.ts)
