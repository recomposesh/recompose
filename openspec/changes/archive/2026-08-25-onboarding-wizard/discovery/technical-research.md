## Research brief: onboarding wizard (tier full, discovery)

Scope read: `openspec/changes/onboarding-wizard/specs/onboarding/spec.md`, `openspec/changes/onboarding-wizard/manifest.md`, plus the repository machinery the two requirements land on. Web research covered accessibility standards, the dialog primitive already on the dependency list, and the wizard-library market.

---

### 1. Headline finding: most of this feature already exists in the repository, in a different shape

The spec reads as new, but three of its four load-bearing mechanisms are already built and tested. This is a re-shaping job, not a greenfield one.

**Persistence already carries both bits the wizard needs.** `packages/contracts/src/settings.ts` defines `settingsSchema` at `SETTINGS_VERSION = 6` with two relevant fields:

```
firstRequestServed: z.boolean(),
showOnboardingChecklist: z.boolean(),
```

Both arrived through the `recordTheFirstSession` migration (version 4 to 5) in the same file. `defaultSettings()` seeds them `false` and `true`.

**The served-request signal is already wired, off the request path.** `apps/desktop/src/main/storage/settings-amend.ts` holds `recordFirstRequestServed`, which writes at most once per profile, and `firstRequestReporter`, whose `@summary` records the constraint that "the write happens off the grant path, because a turn must never wait on a settings file." The wizard's second requirement ("a served request finishes the wizard") can subscribe to this existing latch rather than inventing a second observer.

**The step derivation already exists and already matches the spec's "never store where a person stood" rule.** `apps/desktop/src/renderer/src/widgets/get-started/lib/get-started-steps.ts` computes four steps from four booleans (`gatewayExists`, `providerConnected`, `virtualModelComposed`, `firstRequestServed`) and picks the current step as the first one left undone. Its docstring states the invariant the spec restates: "Every step reads its record from stored documents rather than from a memory of its own, so the checklist can never disagree with what the app holds."

**The menu item exists too.** `apps/desktop/src/main/menu/app-menu-view.test.ts` pins a `Show Onboarding Checklist` checkbox item under View, and `apps/desktop/src/main/menu/app-menu-conductor.ts` (with `app-menu-conductor.test.ts`) already reflects `showOnboardingChecklist` into the menu tick and pushes the settings document to every window.

Recommendation: treat the design phase as deciding how the wizard surface relates to the existing `get-started` widget, not as specifying storage, a signal, or a menu from scratch.

---

### 2. Three conflicts between the new spec and what the repository already holds

These need resolving in design, before implementation. I flag them as conflicts rather than resolving them myself.

**a. Menu placement contradicts the existing app-menu spec.** The new spec says "The app menu MUST offer a way back in." `openspec/specs/app-menu/spec.md` says the opposite about the sibling surface: "The onboarding checklist item MUST live under View on every platform, because it shows and hides a surface rather than configuring the app," with a scenario asserting "the app menu carries no checklist item." If "app menu" in the new spec means the macOS application menu, the two specs collide. If it means the menu bar generally, they agree and the wording should be tightened.

**b. The outcome vocabulary does not exist as written.** The spec says the gateway "records it as refused." `packages/contracts/src/engine-traffic.ts` defines `requestOutcomeSchema` as a three-arm discriminated union on `outcome`: `live`, `served`, and `failed` (the last carrying `status` and `detail`). There is no `refused` arm, and the spec's binary framing has nothing to say about `live`. The clean-code rule "one concept = one name across the codebase" (`.claude/rules/clean-code.md`) makes this a real decision: either the spec adopts `failed`, or a rename lands across the engine contract.

**c. Reusing `showOnboardingChecklist` would conflate two surfaces.** The spec wants one standing that both finishing and dismissing write. The existing boolean means "show the checklist widget," which is a different question from "this profile has seen the wizard." Reusing it makes the View menu tick control the wizard, which is probably not intended. A new field plus a settings migration to version 7 is the likely path, following the migration pattern already in `packages/contracts/src/settings.ts`.

---

### 3. Standards: there is no wizard pattern, so compose one from patterns that exist

The ARIA Authoring Practices Guide documents 31 patterns and none of them is a wizard, stepper, or multi-step form. The relevant pattern is Dialog (Modal), "a window overlaid on either the primary window or another dialog window." Source: [ARIA APG patterns index](https://www.w3.org/WAI/ARIA/apg/patterns/) (W3C, living document).

The pieces to compose:

- **Step indicator semantics.** `aria-current="step"` is the standard marker, defined as "the current step within a process such as the current step in an enumerated multi step checkout flow." Source: [MDN aria-current](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-current), last modified 29 October 2025.
- **Focus on step change.** "At a new step, set the focus preferably on the next relevant form element, or relevant heading or container (a heading or container would need the `tabindex="-1"` attribute to programmatically receive focus)." The same source recommends carrying "Step x of y" in the heading so the change is announced and visually scannable. Source: [ESDC self-paced web accessibility course, module 6: multi-step forms](https://bati-itao.github.io/learning/esdc-self-paced-web-accessibility-course/module6/multi-step-forms.html). This is a government training resource rather than a normative standard, so treat it as good practice, not as a conformance requirement.
- **WCAG 2.2 SC 3.3.7 Redundant Entry (Level A)** applies directly, since the wizard is a multi-step process. Information already entered in the process must be auto-populated or available to select, unless re-entry is essential or security-required. Source: [Understanding SC 3.3.7](https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html) (W3C). The spec's derive-don't-store rule satisfies this by construction: a profile that already holds a gateway never gets asked for one again.

Note that the project's own rule already covers verification: anything reaching the screen goes through `claude-in-chrome` in both schemes, and the suite proves semantics rather than appearance.

---

### 4. Library choice: use the dialog primitive already on the dependency list, and skip wizard libraries

**Recommendation: `@base-ui/react` Dialog, already declared in `apps/desktop/package.json` at version `1.6.0`.**

The Dialog composes Root, Trigger, Portal, Backdrop, Viewport, Popup, Title, Description, and Close. Its `modal` prop defaults to `true`, which traps focus, locks page scroll, and disables outside interaction; `'trap-focus'` traps focus while leaving scroll and outside interaction alone. Focus moves to the first tabbable element inside the popup on open, except on touch. `initialFocus` and `finalFocus` control focus movement explicitly. Source: [Base UI Dialog](https://base-ui.com/react/components/dialog).

Two details matter for a first-run surface that "holds the whole window":

- The prop that stops a stray backdrop click from dismissing setup is `disablePointerDismissal`, not a `dismissible` flag. Since the spec treats dismissal as a deliberate, recorded act, dismissal should be an explicit control rather than an outside press.
- Base UI's own accessibility note is "Always offer a visible close button," which lines up with the spec's dismissal path and with the Apple guidance below.

The repository already has modal precedent to follow rather than duplicate: `apps/desktop/src/renderer/src/shared/ui/consequence-dialog/consequence-dialog.tsx`, `apps/desktop/src/renderer/src/shared/ui/sheet/sheet.tsx`, `apps/desktop/src/renderer/src/shared/lib/visibility/modal-standing.ts`, and `apps/desktop/src/renderer/src/shared/lib/asked-modal.ts`. I did not open these four; they are named as the places design should look for the existing convention.

**Version note:** v1.6.0 shipped 18 June 2026 and included four Dialog fixes (focus confirmation return, programmatic focus return, positioning and viewport edge cases, and non-modal focus-out close and tabindex management), with no Dialog breaking changes. Source: [Base UI v1.6.0 release notes](https://base-ui.com/react/overview/releases/v1-6-0). The current line is 1.7.0, so the pin is one minor behind; that is a separate decision, not a blocker for this feature.

**Reject third-party wizard libraries.** The npm options (`react-multistep`, `react-multistep-wizard` and similar) all own an internal step index and drive transitions from it. The spec forbids exactly that: "The wizard MUST NOT store where a person stood inside it. It MUST read its opening step from what the profile already holds." Adopting one would mean fighting its core abstraction. A state-machine library such as XState is the same mismatch for the same reason: there is no machine state to keep, because the profile is the state. The existing `getStartedSteps` function is the correct shape and should be extended or paralleled rather than replaced.

---

### 5. Prior art on the product decision: celebrate the served request, not the stored credential

The spec's second requirement is the sharper design idea in the change, and it matches Apple's stated onboarding posture: onboarding runs after launch completes rather than as part of it, should be brief and optional, and should let experienced users skip straight to the content they want, with a first-launch experience that supports a step-by-step approach without blocking those who do not need it. Source: [Apple Human Interface Guidelines, Launching](https://developer.apple.com/design/human-interface-guidelines/patterns/launching).

**Evidence caveat:** I could not retrieve the body of the Apple HIG Launching or Onboarding pages. Both returned title-only content to the fetcher, so the summary above rests on search-result excerpts rather than on the pages themselves. Treat the HIG points as directionally supported and verify them through the `hig` MCP server or the `macos-design-guidelines` skill before citing them in an ADR. The same applies to two step-indicator design-system references I could not load ([USWDS step indicator](https://designsystem.digital.gov/components/step-indicator/) and [PatternFly progress stepper accessibility](https://www.patternfly.org/components/progress-stepper/accessibility/), both ECONNRESET); they are listed as pointers, not as evidence.

---

### 6. Recommendation

1. Compose the wizard from `@base-ui/react` Dialog with `modal` at its default, an explicit dismiss control, `disablePointerDismissal` set, and focus moved to the step heading on each step change.
2. Derive the opening step from the same profile reads that already feed `apps/desktop/src/renderer/src/widgets/get-started/lib/get-started-steps.ts`, and add no step state of the wizard's own.
3. Subscribe the finish condition to the existing `firstRequestReporter` latch in `apps/desktop/src/main/storage/settings-amend.ts` rather than adding a second observer of engine traffic.
4. Add a distinct settings field for "this profile has seen the wizard" with a version 7 migration, and leave `showOnboardingChecklist` owning the checklist widget alone.
5. Resolve the three conflicts in section 2 during design, since each one changes a requirement's wording or a contract's vocabulary.

---

### 7. Stated gaps

- I did not open the 14 wizard frames in `designs/recompose.pen`; the file is encrypted and reachable only through the pencil MCP tools, so the visual design of the steps is unread here and should be pulled in before UI work starts.
- I did not open the four modal primitives named in section 4, the root route at `apps/desktop/src/renderer/src/app/routes/__root.tsx`, or `apps/desktop/src/main/menu/app-menu-conductor.ts` itself; I read their tests and their grep context only. The mount point for a full-window surface is therefore named but not verified.
- The Apple HIG claims rest on search excerpts, not on the pages, as noted in section 5.
