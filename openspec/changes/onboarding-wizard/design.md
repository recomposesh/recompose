# Solution design

## Header and change linkage

- Change id: onboarding-wizard
- Schema: recompose
- Proposal: [proposal.md](proposal.md)
- Specs: [specs/onboarding/spec.md](specs/onboarding/spec.md), [specs/app-menu/spec.md](specs/app-menu/spec.md)
- Discovery: [discovery/](discovery/)
- Tasks: [tasks.md](tasks.md)

## Context

A fresh profile opens on an empty canvas. Every piece the app rests on is reachable, and none of it exists yet: no provider account, no virtual model, no router, no gateway. Someone who just installed recompose has to assemble four concepts in the right order before one request goes through. Nothing on the screen says what that order is.

The drawn frames in `designs/recompose.pen` answer that with a takeover. Fourteen screens ask three questions, build the graph, then hand the window back with one virtual model standing behind one round-robin router. This document turns the frames into buildable shape.

The feature lands in four places. The contracts package gains the field that separates a first session from every later one. The main process learns when the first request is actually served, and offers the View menu a way back in. The renderer gains an `onboarding` page slice, and moves two catalogs down to `entities` so setup and the providers page can both read them. The e2e suite gains a seeding step, because every scenario starts on a fresh profile and would otherwise meet the wizard.

## Discovery inputs consumed

- `discovery/code-map.md`: named the shipped `firstRequestServed` latch as firing on a spend grant rather than a served outcome, which section 3 below repairs.
- `discovery/code-map.md`: fixed the catalog ownership problem. The harness and provider catalogs sat inside `pages/gateway-canvas` and `pages/providers`, so a setup step reading either would be a same-layer cross-import.
- `discovery/technical-research.md`: settled the surface question. A takeover that a route owns loses the canvas behind it, and the last frame celebrates on that canvas.
- `discovery/technical-research.md`: fixed Base UI's dialog as the primitive, because Escape needs an answer the app writes rather than one `showModal` supplies.
- `discovery/acceptance-references.md`: pinned the refused-step reading, which the drawn frames didn't carry until frame 10b joined them.
- `discovery/mobbin-references.md`: grounded the three-question shape and the checklist that survives the wizard.
- `discovery/rider-ledger.md`: no open rider touches onboarding.

## Goals and non-goals

**Goals:**

- A first session ends with one provider account, one virtual model, and one round-robin router inside one running gateway.
- The wizard holds the window until a person settles it on purpose. An outside press and an Escape both leave it standing.
- Leaving is permanent for the profile, and the View menu is the way back.
- Every step reads what the machine already holds rather than asking a person to type it.
- A step that refuses says which one refused and offers the run again, without losing the steps that finished.
- The last frame celebrates on the canvas the person just built, not over it.
- Upgrading isn't a first session: a profile that predates the field reads as settled.

**Non-goals:**

- A second wizard for any later gateway. Setup runs once per profile.
- New color families or theme tokens. Every piece composes from what `theme.css` already carries.
- Moving the providers page's connect sheet. Setup borrows it through the shell.
- Changing how any provider connects. Setup reuses the shipped flows verbatim.

## Constraints and invariants

- TypeScript maximum strictness, verbatim from the project rules. No `any`, no `as` casts to silence errors.
- "Never write code comments." The sole exception is a constraint or invariant the code genuinely can't express.
- "Test code changes if and only if behavior changes."
- Feature-Sliced Design (FSD) v2.1 placement per Architecture Decision Record (ADR) 0010. No same-layer cross-imports, and `steiger` proves it.
- Every component under a `ui/` segment owns a folder and ships its story sibling.
- Anything that reaches the screen gets measured from the page in both schemes.

## Shape

### 1. The field that separates a first session

`SETTINGS_VERSION` goes to 7 and `settingsSchema` gains `setupWizardSettled: boolean`. The migration from 6 writes `true`, not `false`. Someone has already worked in a profile that predates the field, so it isn't a first session. Reading it as one would take the window away mid-work after an update.

The renderer reads the field through the settings query it already holds, and writes it through the settings mutation it already holds. No new channel.

### 2. The surface, not the route

`SetupSurface` mounts in `__root.tsx` and stands over whatever route is showing. Base UI's `Dialog.Root` supplies the portal, the scrim, and the focus trap. Nothing inside it dismisses: `Dialog.Root` takes `open` with no `onOpenChange`, so an outside press and an Escape both leave the surface where it stood.

The surface claims the whole window and paints its own drag band across the top. A shell drag region under an overlay swallows nothing back, so a surface that merely stopped short of the chrome band would leave a bare strip above one continuous grid. The platform draws its window controls above the page, so they stay operable through the band. ADR 0188 carries the decision and the route alternative it beat.

The surface reports its standing into `shared/lib/visibility/setup-standing.ts`, the same store family the sidebar and inspector already use, so the View menu's ticks stay honest without the menu asking.

### 3. The served outcome, not the spend grant

The shipped `firstRequestServed` latch fired when a spend grant resolved, which only means a request reached a target. A refused target, a broken answer, and a served answer all resolved the same grant, so the checklist could tick on a request that never came back.

`openTrafficDesk` gains an observer that takes each parsed `EngineTrafficReport`. `noticingTheFirstServed` latches on the first report whose `request.outcome` reads `served`. The existing push carries a snapshot and can't say which row changed. That's why the observer is a second seam rather than a reading of the push. ADR 0189 carries it.

### 4. The rank that picks a first model

Setup builds a virtual model over whatever the connected account serves, and the model it picks is the first thing a person meets. A filter would refuse a listing that carries only small models. A rank never refuses: it orders every id and takes the head.

`PASSED_OVER` demotes the ids naming a small model: `haiku`, `mini`, `nano`, `lite`, and their kin. `REACHED_FOR` promotes the ids naming a large one: `opus`, `ultra`, `max`, `pro`, `sonnet`, `large`, `sol`. Version digits break the remaining ties, read off the id with any date stamp stripped, so a date never outranks a version. ADR 0190 carries the rank and the models.dev alternative it beat.

The virtual model's name follows the harnesses a person picked: `claude-my-model` where Claude Code is among them, because Claude Code reads a `claude-` prefix, and `my-model` otherwise.

### 5. The graph is always a router

The built graph is a round-robin router at the entry with one target under it, even where only one account connected. A person who connects a second account later drops it into a seat rather than rebuilding the entry, and the drawn frames show a router in every state. Each seat takes the name of its place: `seat:1`, then `seat:2`.

### 6. The run, and the step that refuses

`jobsFor` cuts the plan into named jobs. `standingOf(run, index)` reads each job as `finished`, `running`, `refused`, or `waiting`. A refused job stops the run where it stood, so the jobs before it keep their `finished` reading and the run again resumes rather than restarts.

The last job waits on traffic rather than on the app. It settles when the served-request push arrives, which is the seam section 3 built.

### 7. Catalogs move down, the sheet composes from above

Two catalogs moved from `pages` to `entities`, because setup and the shipped pages both read them and FSD forbids a same-layer import:

- `entities/harness` carries the connect catalog, the connect facts, and `ClientLead`.
- `entities/provider` carries the offer catalog, the local catalog shape, and `ProviderLead`.

The providers page's connect sheet didn't move. Moving a twenty-five-folder UI tree to reuse one sheet costs more than it buys. The shell imports both slices instead and hands the sheet to setup as a prop. That's Strategy C, composition from the upper layer, and the FSD skill names it for exactly this case.

### 8. The e2e suite meets a fresh profile

Every e2e scenario launches on a fresh profile, so the wizard would stand over the whole existing suite. `settled-setup.ts` writes a settings document with `setupWizardSettled: true` before launch, and `fixtures.ts` applies it unless a scenario carries `@fresh-profile`. The two onboarding features carry the tag.

## Data model and contracts

- `settingsSchema` gains `setupWizardSettled: z.boolean()`, `SETTINGS_VERSION` goes to 7, and the migration from 6 writes `true`.
- The `view:command` union gains `open-setup`.
- `system:surface-toggles` gains `setup: boolean`.
- No new Inter-Process Communication (IPC) channel. Setup reads and writes through the settings, providers, and gateways channels the app already carries.

## Error handling

- A refused job stops the run at its index and reads `refused`. The run again resumes from that job.
- A listing that carries no model at all returns nothing from the rank, and the compose step says so rather than naming a model that doesn't exist.
- A connect flow that refuses is the shipped providers flow refusing, and it reports the way it always has.

## Migration and rollout

- Schema 6 to 7 writes `setupWizardSettled: true`, so no shipped profile meets the wizard on update.
- The published settings reference names schema 7 and the field.
- No feature flag. The wizard is the first-run path for a profile created after this lands.

## Test layers

- Contracts: schema specs for the field and the migration, plus the type-level spec for the widened union.
- Main: node specs for the served-outcome latch, the traffic observer, and the View menu item.
- Renderer model: node specs for the rank, the graph, the jobs, the standings, and the counters.
- Renderer UI: stories in both schemes for every component under a `ui/` segment, with axe on each.
- E2E: `first-session.feature` for the surface's standing, and `setup-run.feature` for the run.
