## Why

A person who installs recompose meets an empty canvas and a four-line checklist in the sidebar.
The checklist names what to do. It never does any of it. To reach a first answer they must find
the providers surface and work out which of thirty entries matches the plan they already pay
for. Then they open a gateway, learn what a virtual model is, compose one, and bind a target to
it. Then they hunt for the three environment lines that point their harness at the port. Every
one of those is a separate surface, and nothing in the app says the order.

The product's whole claim is that one gateway serves every harness and keeps working when a
provider stops. None of that's visible until the graph exists. The checklist asks a newcomer to
build the demonstration before they have seen the thing demonstrated.

The machine usually already holds most of the answer. Claude Code signs itself in, a local
runtime answers on its own port, and the app can see both. In the common case, the app could
propose the setup it currently asks a person to perform by hand.

## What changes

A setup wizard holds the whole window on a first session and walks the person from nothing to a
served request. Fourteen steps, every one already drawn in `designs/recompose.pen` under
`Onboarding · 01` through `· 14`, plus the refused state at `· 10b`.

The wizard looks at the machine, lists what it found, asks which harnesses the person works
with, and connects the sources they mark. Then it opens a gateway, composes one virtual model
behind a round-robin router, hands over the exact commands for each picked harness, and waits.
When a gateway serves a request, the wizard gives the window back and the graph it built stands
on the canvas.

Nothing about where the person stood reaches disk. The wizard reads the step it opens on from
the documents the profile already holds, which is the same rule the sidebar checklist has
followed since it shipped.

One defect gets fixed on the way. The record that a profile served its first request currently
fires when a spend grant resolves, which only means a request reached a target. The target can
still answer 401. The record moves onto the outcome the gateway wrote down, so `served` means
served. The sidebar checklist reads the same record, so its fourth step stops ticking on a
refused request too.

## Locked decisions

1. **The wizard renders over the standing route. No route of its own.** TanStack Router's
   authenticated-routes guide blesses exactly this alternative, and its tracker carries six
   separate redirect-loop reports of the shape a `beforeLoad` gate would hit. The drawn design
   agrees: the wizard "holds the whole window" and "resolves into the canvas," which describes a
   surface over a route rather than a route.
2. **The wizard takes its own settings field, at schema version 7.** Reusing
   `showOnboardingChecklist` would make dismissing the wizard also kill the sidebar checklist,
   and reopening from the menu also bring it back. A person who leaves setup early is exactly
   the person the checklist exists for. `apps/web/content/docs/reference/configuration-files.md`
   names the version and enumerates the fields, so the migration and that page land together.
3. **Escape does nothing.** The modal-dialog pattern says Escape closes a dialog, and that's
   right for a dialog whose dismissal costs nothing. Dismissing this one records a standing that
   never returns on its own, so one stray keystroke would permanently retire first-run setup
   behind a menu the person hasn't learned yet. `Skip setup` is the only way out, and it stays
   visible and keyboard-reachable on every step past the first.
4. **The wizard reads its opening step once per opening, and never after.** Recomputing
   continuously would let a deletion behind the wizard walk the person backwards under their
   hands, which is the change of context Web Content Accessibility Guidelines (WCAG) 3.2.2
   exists to prevent. Within a session the wizard drives its own step forward in memory, and
   nothing about it reaches disk.
5. **The finish signal is a `served` outcome, not a resolved grant and not a stored credential.**
   A provider can still turn away a credential the app holds, the first time a client spends it.
   Anthropic documents three separate first-use failures, and GitHub's own tracker carries years
   of reports where the Copilot device flow completes and inference then answers 403. The
   engine's outcome union is `live | served | failed`. The wizard finishes on `served` and waits
   on the other two. A `live` request that later turns `served` finishes it.
6. **A settings write that fails still resolves the wizard for that session.** The existing
   recorder logs and moves on by design, which suits a checklist that heals on the next read and
   fails a surface that holds the window. The person watched their request get served. The
   wizard must not argue with them over a file the operating system had locked. The next launch
   reopens on the waiting step, because nothing recorded that it finished.
7. **The way back in lives under View, beside the checklist toggle.** The merged app-menu spec
   already puts onboarding items there and asserts the macOS app menu carries none. This change
   widens that requirement from the checklist item to every onboarding item rather than
   contradicting it. Reopening shows the surface again; it resets nothing.
8. **The catalog reads its entries as the providers surface reads them.** The drawn grid carried
   shortened labels no screen renders. It now carries the offer titles `CatalogList` serves, so
   the wizard and the providers page can never disagree about what to call a provider.
9. **The router stands behind the virtual model even with one target.** A single-target
   round-robin is a graph a person can extend by dropping a second target on it. A virtual model
   bound straight to a target is a graph they would have to rebuild.
10. **Target models come from an ordered preference table, matched against what the provider
    actually listed, with the provider's own order breaking ties.** The prior art is models.dev,
    which carries one `default: true` per provider, and picks a capable low-cost model rather
    than the flagship. That's the opposite of what this step wants, since the first answer a
    person ever sees should be the good one. This change rejects fetching models.dev at setup
    time, because it puts a network dependency on the one screen that must work offline. It
    rejects curating a list per provider, because that can't cover an aggregator serving three
    hundred models or a custom endpoint. It rejects taking whatever the provider listed first,
    because `claudeSubscriptionModels` leads with Haiku.
11. **Headings set in outlined vectors, not in an embedded font.** Questa Grande's free release
    rides the Fontspring Desktop End User License Agreement. Its first clause permits a static
    vector made with a create-outlines tool, and its fifth clause puts computer applications,
    games, and software behind an additional fee. The nine headings hold fixed strings, so
    outlining costs the design nothing it wants. `recompose-wordmark.tsx` already works this way.
12. **The maintainer skipped the candidate-approach panel on 2026-08-25.** The fourteen screens
    stand drawn and approved, and they pin the approach. Three invented alternatives would have
    had nothing to choose between. Every other part of the `full` tier stands, including both
    approval gates. This entry records the decision rather than leaving it implicit, because the
    tier rubric forbids a silent downgrade.

## Design-system gap analysis

The renderer's `shared/ui` segment holds forty-four primitives. The wizard composes from them
where it can, and three pieces have no home yet.

**Already there, reused as is.** `Button`, `Sheet`, `Icon`, `BrandMark`, `VendorMark`,
`CommandLine`, `CopyButton`, `StatusIndicator`, `Chip`, `Badge`, `TextField`, `place-focus.ts`.
The provider connect sheets the source step opens are the shipped `ProviderCatalogSheet`, opened
from a second place rather than rebuilt. The compose step draws the real `GatewayNode`,
`VirtualModelNode`, `RouterNode`, and `ProviderNode` cards, so the teaching diagram and the
canvas can't drift apart.

Three seams the wizard rides rather than reinvents, each already carrying a consumer:

- `shared/lib/use-step-transition.ts` holds a directional entrance class against an ordered step
  list. `RoutingPicker` and `DropPicker` both drive their steps through it, so the wizard's steps
  move the way every other stepped surface in the app already moves.
- `shared/lib/visibility/modal-standing.ts` counts the questions standing over the surface, and
  `app/routes/-view-command-ear.ts` reads that count to report the menu's standing. Registering
  the wizard through that counter stands the View menu down, so the app-menu requirement in this
  change needs no second mechanism.
- `Sheet` already rides `@base-ui/react/dialog`, so the wizard's container follows a convention
  the segment set rather than introducing a primitive.

**Missing, and new work.**

- _A full-window surface._ `Sheet` and `ConsequenceDialog` both sit over a surface at panel
  scale. Nothing in the segment holds the whole window. This becomes the wizard's own container,
  built on the `@base-ui/react` Dialog already on the dependency list at 1.6.0, with
  `disablePointerDismissal` set and initial focus pinned by name rather than inherited from
  Chromium's first-focusable behavior. `ConsequenceDialog` shows the other route, a native
  `<dialog>` whose `onCancel` catches Escape, and the wizard turns it down. `showModal()` gives
  Escape a default the app would have to fight on every step.
- _A step indicator._ Five dots, one of them a pill. `SegmentedControl` is the nearest neighbor
  and answers a different question, since its segments take a press. Exactly one dot carries
  `aria-current="step"`.
- _A job row with three standings._ Finished, running, waiting, plus the refused standing this
  change adds. `ChecklistSteps` in the get-started widget carries three of the four and lives in
  a widget rather than in `shared/ui`. Whether it moves down a layer or the wizard grows its own
  is a solution-design question, not a proposal one.

**Tokens.** The wizard needs no new color. Every accent it draws already stands:
`--color-gateway`, `--color-virtual-model`, `--color-router`, `--color-subscription`,
`--color-local-runtime`, `--color-live`, `--color-down`. The refused job row reads `--color-down`
in both schemes, which is what the frames now draw.

**The window's own chrome.** This repository ships a custom chrome, so a surface that covers the
window overlaps a draggable region. Electron's tracker carries this as a decade of reports:
`-webkit-app-region: drag` swallows pointer events for anything under or overlapping it. Every
interactive element the wizard puts in that band carries `no-drag`, the window stays draggable by
its chrome, and the platform window controls stay visible and operable.

## Capabilities

### New capabilities

- **onboarding.** The setup wizard, the standing it records, the first-request signal it rests
  on, and the sidebar checklist that coaches the same journey. The checklist shipped without a
  spec of its own, so this change writes one for it rather than leaving half the capability
  undocumented.

### Modified capabilities

- **app-menu.** The View menu carries every onboarding item, not just the checklist toggle. The
  route-scoped menus and the gateway item read as unavailable while the wizard stands.

## Impact

**Behavior that changes for people already running recompose.** The checklist's fourth step
stops ticking when a request reaches a target and gets turned away. It ticks when a gateway
serves one. Nobody who has already served a request notices, because the record writes once and
never clears.

**Nothing regresses on an existing profile.** A profile carrying a gateway never sees the
wizard. The standing field defaults to what an existing profile has already done, and the
migration's scenarios pin that.

**Files the change reaches.** A new `onboarding` slice in the renderer, the settings contract
and its migration, the first-request wiring in the main process, and the View menu. It also
reaches the published configuration-files reference and the pen file that carries the frames.
The change reads the providers catalog, the connect catalog, and the node components rather than
changing them.

**Risk the review should look hardest at.** The refused state at `10b` has no published prior
art. Four shipped products draw the same three-state job list and not one of them draws a
failure, so its shape rests on judgment alone.
