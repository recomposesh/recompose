# Solution design

## Header and change linkage

- Change id: adopt-machine-subscriptions
- Schema: recompose
- Proposal: [proposal.md](proposal.md)
- Specs: [specs/subscriptions/spec.md](specs/subscriptions/spec.md), scenarios in [gherkin/subscriptions/](gherkin/subscriptions/)
- Discovery: [code-map.md](discovery/code-map.md), [research-brief.md](discovery/research-brief.md), [machine-probe.md](discovery/machine-probe.md), [design-critique.md](discovery/design-critique.md), [mobbin-references.md](discovery/mobbin-references.md)
- Tasks: None yet, tasks derive from the decomposition hooks below

## Context

Connecting a subscription today opens a terminal and walks a person through a sign-in they already performed once, in the provider's own tool. The credential that sign-in would mint already sits on the machine. Claude Code keeps it in the login keychain under `Claude Code-credentials`, and Codex keeps it in `~/.codex/auth.json` or its own keyring service. This change reads what already sits there and connects it with one click, while the terminal sign-in stays reachable as the quieter act.

Two facts shape everything below. First, both providers rotate the refresh token on every renewal and reject the token that went before. A second owner renewing an adopted credential signs the person out of their own tool, so recompose must never renew one. Second, `credential-custody.ts:5` names one keychain service for two different jobs, and today a recompose sign-in parks, clears, and then overwrites the item the person's own Claude Code reads. Adoption reads that same item, so the custody repair lands before adoption reads anything.

The proposal carries twelve locked decisions. This design instantiates them against the code as it stands on this branch, which already carries the seeding commit for decision 12. It doesn't reopen any of them.

## Discovery inputs consumed

- `code-map.md`, the refresh finding: `refresh.ts:245` proves recompose already renews subscription credentials itself, so renewal becomes per account rather than global, and the grant carries the owner.
- `code-map.md`, the contested service name: one constant serves two jobs at `credential-custody.ts:5`, which turned the custody repair into this design's first move.
- `code-map.md`, the file-size warning: `subscriptions-ipc.ts` stands at 291 lines, so the detect and adopt handlers land in their own module.
- `code-map.md`, the fixture gap: no fixture plants a credential before launch and no fake `codex` exists, so the fixture seams enter the file map and the tasks.
- `code-map.md`, the platform gates: custody exists only on darwin (`subscriptions-wiring.ts:36`), which scopes the keychain work, so the specs take the platform as a parameter.
- `research-brief.md`, the rotation verdict: CodexBar shipped the copy design and regressed its users into daily sign-in, so delegation to the owning tool is the only renewal path for an adopted credential.
- `research-brief.md`, acceptance references 5, 6, 16, and 17: the fresher store wins, an empty shell adopts as nothing, a key-mode record isn't a subscription, and an absent file isn't a signed-out Codex. All four became detection states and test rows.
- `research-brief.md`, references 13, 15, 18, and 19: reads tolerate one torn write, forget never touches the vendor store, failure never deletes, and a reuse rejection stops rather than retries. All four became error-handling rows.
- `machine-probe.md`, the derivation scheme: a custom config home gets `Claude Code-credentials-` plus the first eight hex characters of the SHA-256 of the home path. The custody repair builds on this.
- `machine-probe.md`, the seed location: `CLAUDE_CONFIG_DIR` relocates `.claude.json`, which the landed seeding commit already uses.
- `machine-probe.md`, the `Codex Auth` keychain service: Codex may hold its credential in the keyring even when `auth.json` exists, so detection probes both.
- `design-critique.md`, findings 1 through 10: each one changed a surface below. Finding 1 made the repair a precondition, finding 3 moved the adopt act into the found row, finding 4 kept the connect step's anatomy, finding 7 split detection from adoption, and finding 8 set the prompt rules.
- `mobbin-references.md`, the row shape and the found-state naming: the found-account row states the account rather than offering a blank. The two-section split it also supported: consulted, superseded by critique finding 4.

## Goals and non-goals

**Goals:**

- A person connects the account the machine already holds with one click, per provider, with no sign-in.
- recompose never renews an adopted credential. Near expiry it runs the provider's own tool headless, behind a main-process lock that admits one renewal at a time.
- A recompose sign-in addresses the keychain item derived from the config home it created, and the person's own item stays untouched. Existing installs migrate without losing a credential.
- Every row reports where its account came from, and a lapsed row offers the remedy that matches its provenance.
- The seven missing fixtures land, so all 27 frozen scenarios run.

**Non-goals:**

- Minting a credential through recompose's own authorization flow. The provider's tool stays the only thing that signs a person in.
- An affordance for choosing which account the provider's tool answers to. `subscriptions:activate` keeps having no caller on screen.
- Enumerating more than one account per provider from the machine. One store, one account.
- A third button weight. Position carries the third level on this surface, and the gap stays named for a future surface.
- A production keyring probe outside macOS. Linux and Windows read files, and platform-parameterized specs cover the rest, the way `subscription-credential-store.test.ts` already does.
- Removing anything from a vendor store when a person forgets an adopted account. The row leaves, the machine credential stays.

## Constraints and invariants

- "Maximum strictness, always: `strict: true` plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noPropertyAccessFromIndexSignature`."
- "No `any`, no `as` casts to silence errors, no `@ts-ignore`/`@ts-expect-error` without a comment explaining why."
- "**Never write code comments.** Code must explain itself through naming and structure." The `@summary` docstring pattern on exported declarations stays, because tooling reads it.
- "**Never disable, override, loosen, or silence any gate.**" No lowered mutation threshold, no oxlint override, no silenced Vale or cspell rule.
- "Use the `feature-sliced-design` skill before creating or moving any file in the renderer." And: "**Every component under a `ui/` segment owns a folder: `ui/<component-name>/<component-name>.tsx`, beside every sibling that shares its basename.**"
- "**A new component under a `ui/` segment ships its `*.stories.tsx` sibling before the branch leaves your machine.**"
- "Test-first, always: red → green → refactor. No implementation code before a failing test." Work runs inside-out, and verification stays "state-based, not interaction-based."
- "**Test code changes if and only if behavior changes.**" The custody specs change because custody's behavior changes. That's the invariant working, not an exception.
- "Every property law on a mutate-listed file gets a deterministic twin spec that pins the same law with fixed values."
- Mutation scope: `stryker.config.json:8` mutates `src/main/**/*.ts`, so every new main-process file joins the list on creation. The exceptions stand at lines 16 through 19: `macos-keychain.ts`, `run-command.ts`, `sign-in-launch.ts`, and `subscriptions-wiring.ts`. The break threshold is 81. `packages/engine` carries its own `stryker.config.json`, so the engine changes carry mutation duty too.
- `packages/contracts/src/ipc-vocabulary.test-d.ts:38` sits inside a union spec that pins the channel surface at thirty-five names. Adding the two channels breaks it by design, and the spec changes to thirty-seven in the same task as the contract.
- Anything that reaches the screen gets looked at through `claude-in-chrome`, in both schemes, before it lands.
- One attention word covers "not working" on a row. A control that can't act stands inert rather than hidden.

## Design

Five moves, in dependency order. The custody repair unblocks everything, and the provenance field carries the new fact. Detection and adoption read the machine, delegated renewal protects the person's own tool, and the renderer folds the found account into the step it already has.

### The custody repair comes first

Today `credential-custody.ts:5` names `VENDOR_SERVICE = 'Claude Code-credentials'` and uses it for both what the machine already holds and what a recompose sign-in produces. `makeRoomForTheSignIn` at `subscriptions-ipc.ts:47` parks that item and clears it at line 61, and `placeFrom` at `credential-custody.ts:78` overwrites it. `machine-probe.md` settles that a modern Claude Code writes a custom home's credential under a derived name instead, so this machinery has operated on the person's own login.

The repair rests on one rule: **the item recompose addresses derives from the config home it created.** The derivation copies the tool's own scheme, `Claude Code-credentials-` plus the first eight hex characters of the SHA-256 of the home path. Once every recompose account owns its derived item, the musical chairs disappears:

- `readFor` and `writeFor` take the account's home and address `derived(home)`. The active flag stops mattering for addressing, because no account ever squats on a shared item.
- A read that misses `derived(home)` falls back to the plain name, per locked decision 7, so a provider version that never derived still resolves.
- `park`, `place`, `handOver`, and `clear` leave the custody surface. `activate` becomes a pointer move with no keychain surgery. `subscription-release.ts` removes the account's derived item and hands nothing back, because it took nothing.
- The sign-in flow snapshots the plain item before launching the tool, read-only. When the tool reports success, custody looks for `derived(pendingHome)`. Found means a modern tool wrote where expected. Missing while the plain item changed means an old tool overwrote the person's login, so custody moves that blob to the derived name and puts the snapshot back. This is the one remnant of parking, bounded to a sign-in, and it only ever restores.
- `promotePending` renames the pending home to the account's home, so the keychain item moves with it, from `derived(pendingHome)` to `derived(homeFor(provider, id))`. Each move writes the destination before removing the source.

**Existing installs.** An install today holds the active account's credential in the plain item, the person's pre-recompose login parked under `RESERVED_SLOT`, and each inactive account parked under its id in `PARKED_SERVICE`. A one-shot repair in a new `custody-repair.ts` runs before the first custody operation of a process, inside the custody lane:

1. When the active account's derived item misses and the plain item holds a blob, write that blob to the active account's derived item. The plain item's content is that account's freshest credential, because the person's tool has been rotating it.
2. Write the `RESERVED_SLOT` blob back into the plain item, returning the login recompose took. When no reserved blob exists, remove the plain item instead. Leaving recompose's chain there would keep two owners rotating one credential, which is the exact failure this change exists to end.
3. Move every other parked slot to its account's derived item, then remove the parked items, `RESERVED_SLOT` last.

Every step writes its destination before removing its source, so no ordering loses a blob. The repair is idempotent: a second run finds the derived items populated and the parked service empty, and does nothing. It runs on first custody use rather than at startup, because a launch-time keychain read on a locked keychain would raise a prompt nobody caused. The first custody read already happens on a person-driven surface today. `RESERVED_SLOT` and `PARKED_SERVICE` survive only as internal names inside `custody-repair.ts`, and leave `credential-custody.ts`'s exported surface.

### Detection splits from adoption

Locked decision 8 splits the read in two. Detection answers a person's pick with facts and no secret. Adoption answers a person's click with the material, in the main process, and records the account.

A new `machine-credential.ts` module owns both reads. Its detection reading is a discriminated union: the machine holds an account, holds nothing, holds a record with no account credential, or the store refused to open. The account arm names the address, the plan, and a standing, and no arm carries a secret.

On macOS the two halves use these invocations:

| Read                    | Invocation                                                       | Can it prompt                                                                                                                                                                                                 |
| ----------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existence probe         | `security find-generic-password -s <service> -a <user>`, no `-w` | No item-level prompt. `machine-probe.md` records that metadata reads without the secrets flag don't prompt. A locked keychain can still refuse, which reads as the store refusing, never as an empty machine. |
| Content read, detection | `security find-generic-password ... -w` on the plain service     | Yes, once, caused by the person's pick. The reading extracts facts and returns no material.                                                                                                                   |
| Content read, adoption  | The same `-w` invocation, run again on the click                 | Yes, and the click caused it. After a first allow the second read rides the same approval.                                                                                                                    |

The content read exists at detection because four frozen scenarios need facts that live inside the blob. Those are the lapsed-versus-absent split, the fresher of two disagreeing stores, the empty-shell record, and the keyring-held Codex identity. The prompt rules from critique finding 8 bind it. The existence probe runs first, so at most one secret read happens. Static text before the click explains the read, and the sheet holds while the read is in flight. A denial reads as the store refusing, with a way to ask again, and nothing re-asks on its own.

The reading never runs on mount. The renderer query carries `staleTime: Infinity` with `refetchOnMount: false`, and invalidates only on the acts that change the answer: a finished adopt, a finished sign-in, and the ask-again act. A second pick reuses the cache, which is what the second-look scenario proves.

Per provider, detection reads:

- **Anthropic, macOS:** the plain keychain item, plus identity from `~/.claude/.claude.json`. When `~/.claude/.credentials.json` also exists and disagrees, the record with the later `expiresAt` wins.
- **Anthropic, elsewhere:** `~/.claude/.credentials.json` and the same identity file.
- **OpenAI:** `auth.json` in the Codex home. A file carrying `OPENAI_API_KEY` and no `tokens` block reads as a record with no account credential. Address and plan come from the `id_token` claims, the way `subscription-standing.ts:103` already reads them. When the file is absent on macOS, the `Codex Auth` keychain service gets probed before the answer says nothing.

The adopt handler re-reads the material, validates that an account credential stands inside it, and records the row with `provenance: 'machine'` and the address as its label. It creates no config home, moves no active pointer, and touches no custody machinery, per locked decision 6. A credential that vanished between the pick and the click answers a typed `nothing-to-adopt` refusal. A sign-in that later lands the same address writes over the row, per the living spec's one-address rule. The row's provenance then flips to `sign-in`, because recompose now owns a home for it.

### Renewal splits at the process boundary

The engine child holds today's renewal code. `refresh.ts:245` calls the vendors' token endpoints, `reach-credential.ts:57` refreshes ahead of expiry, line 50 refreshes reactively on a 401, and `reach-credential.ts:26` persists the result back through the credential-update lane (`engine-child-lanes.ts:62`) into the store. An adopted credential must never reach any of it.

The "who renews this" fact travels like this:

```
stored row                    main process                      engine child
provenance: 'machine'
     |                             |                                 |
     |   spend-request from the child on each serving turn           |
     |                             |<--------------------------------|
     |---> resolveTargetCustody    |                                 |
     |     reads the row, sees     |                                 |
     |     provenance 'machine'    |                                 |
     |                             |---> machine-credential read     |
     |                             |     of the live store           |
     |                             |---> near expiry? delegated      |
     |                             |     renewal lane, one at a time |
     |                             |     runs the tool headless,     |
     |                             |     re-reads the store          |
     |                             |                                 |
     |     spend-grant with custody.renewal = 'owning-tool'          |
     |                             |-------------------------------->|
     |                             |          child serves, skips    |
     |                             |          both refresh paths     |
```

Concretely:

- The stored row carries `provenance`. `resolveTargetCustody` (`target-custody.ts:54` today reads the recompose store for every subscription) branches on it. A `machine` row reads the live vendor store through `machine-credential.ts` instead, per locked decision 1: no long-lived copy, every serving turn reads the store.
- The subscription custody shape at `engine-protocol.ts:39` gains `renewal: 'app' | 'owning-tool'`. Main stamps it from the row's provenance when it resolves the grant at `spend-grant.ts:64`. The shape feeds both the spend grant and the model-list look, so both carry it.
- In the child, `readySubscriptionCredential` returns the blob untouched when `renewal` reads `owning-tool`, whatever `credentialNeedsRefresh` says. `shouldRefreshUnauthorized` answers false for the same arm, so a 401 surfaces as the provider's refusal instead of spending the refresh token. `refreshedAndPersisted` throws on an `owning-tool` spend, because reaching it would be the bug this design exists to prevent.
- As a second wall, `engine-host-credential-update.ts` refuses to persist a credential for a row whose provenance reads `machine`, and logs the refusal. Only a child bug reaches it, and a refused write is better news than a rotated adopted token.

**The real lock.** The `refreshing` map at `refresh.ts:36` single-flights refreshes inside one engine child, which isn't the lock decision 2 asks for. Two gateways run two children, and none of them may renew an adopted credential anyway. The real lock is a per-provider `oneAtATime` lane in a new main-process `delegated-renewal.ts`. It works because every spend grant resolves in main. Children ask over the spend-request lane, so every serving turn for an adopted account funnels through one process and one lane. Inside the lane the renewal re-reads the store first, and a waiter whose predecessor already renewed sees a fresh credential and runs nothing. That yields exactly one tool run for two concurrent requests, which the concurrency scenario observes through the fake tool's renewal trace.

The delegated run spawns the provider's binary through `run-command.ts` with no terminal, no window, and no config-home override. The tool rotates its own default-home credential the way it does every day. The run is time-bounded. Every failure leaves the credential exactly as it stands and reports the account lapsed, per locked decision 3. A missing tool, a failed run, and a run that finishes without freshening the store all land in one typed outcome. The serving turn then proceeds with what the store holds, the provider refuses it, and the row reads lapsed on its next observation. Nothing retries on its own, per research reference 19.

An account recompose signed in keeps today's path end to end, per locked decision 4. The child refreshes it ahead of expiry and persists it back, because recompose owns that config home alone.

### The connect step keeps its anatomy

Per critique finding 4, the connect step keeps the shape `sign-in-way.tsx` already draws in its 320 pixel column (`sign-in-way.tsx:34`). The picked identity stands at the head, a verdict slot reserves its height, and the act follows. The machine reading becomes the verdict:

- **An account found:** the new `FoundAccountRow` leads, naming the address and the plan, with the adopt act trailing in the row per critique finding 3. The sign-in demotes to a quiet act beneath the primary, a link rather than a section at this width. The sheet's foot keeps Cancel and nothing else.
- **Nothing on the machine:** the step reads as today, with the sign-in as the primary act and one sentence saying the machine holds nothing.
- **A record with no account credential:** the same layout as nothing, with copy naming what the record lacks, and no claim that the machine holds nothing.
- **The store refused:** copy says the operating system refused, an ask-again act offers the retry the way `detect-runtime-step.tsx:122` already does in this slice, and the sign-in stays reachable.
- **The tool absent:** the absent branch at `sign-in-way.tsx:41` already owns this copy, and the adoption section doesn't render at all, per critique finding 5.

While either act runs, the other stands inert in place, so the sheet never resizes under the hand. When the adopt act carries the default button, its committing keydown prevents its default. An Enter that picks a provider has carried into a newly mounted step in this codebase before.

Two copy sites go stale in this branch. The catalog description at `catalog-flow.tsx:29` says "Sign in with a plan you already pay for." and becomes "Connect the plan this machine already signs into, or sign in with another account." The empty-state explanation at `subscriptions-empty-state.tsx:13` claims signing in is the only way in, and gains the machine as the first way. Both run through the `writing-guidelines` skill at implementation.

On the list, `subscription-account-row.tsx` reads the view's new provenance field. Every row carries a provenance word on its identity's first line, beside the plan badge, so the two-line rule holds. A lapsed signed-in row keeps its inline "Sign in again" act at lines 84 through 88. A lapsed adopted row replaces it with remedy text naming the tool to open, from `subscriptionProviders[provider].toolName`, and offers no sign-in anywhere, including the overflow at line 30. One attention word covers both lapses.

### Seeding stands landed

Commit `a9ce3575` on this branch already grew the Anthropic branch of `seedConfigHome` (`subscription-homes.ts:38`). It writes `.claude.json` with `hasCompletedOnboarding` and `hasTrustDialogAccepted`, both verified in the shipped 2.1.229 bundle by `machine-probe.md`. What remains for decision 12 is observability. The fake tool refuses when its home arrives without the seed, so the scenario can assert the absence of the first-run questions.

### The fixtures are part of this design

The seven fixtures from `FIXTURES.md` land as four file changes, folded into the file map and tasks 8 and 9:

1. **Planting before launch:** `subscription-tools.ts` gains a plant function that writes a vendor-shaped record into the fake keychain directory or a fake credentials file before the app starts. It takes the provider, the address, the plan, the expiry, and whether the record carries an account credential.
2. **A fake `codex`:** a new `fake-tools/codex.mts` obeys `CODEX_HOME`, writes `auth.json` in subscription or key mode, and holds a keyring mode that keeps the credential under `Codex Auth` in the fake keychain.
3. **Fake `claude` modes:** derived-name writing that mirrors the real tool's scheme, an expiry the scenario chooses, a headless renewal entry that rotates the record and appends to a renewal trace, a fail-on-purpose mode, a signed-in answer for a fresh run, and a refusal when the home arrives without the seed.
4. **Keychain modes:** `keychain.mts` gains a refuse mode that answers exit 51, and a prompting mode that counts each open, so the second-look scenario proves the store asked nothing new.

The serving-turn steps route one request, and two at once, through a virtual model targeting the subscription under test. They ride the served-gateway plumbing the e2e suite already has, and observe the fake store's renewal trace from outside.

## Data model and contracts

- **Accounts document, version 7 to 8.** The subscription row at `accounts.ts:21` gains `provenance: z.enum(['sign-in', 'machine'])`, required. A migration from 7 stamps `provenance: 'sign-in'` onto every stored subscription row, because every account stored today came from a sign-in. `ACCOUNTS_VERSION` at `accounts.ts:11` becomes 8.
- **The account view.** `subscriptionAccountViewSchema` at `subscriptions.ts:40` gains the same required `provenance` field, per locked decision 10. Views compute per read, so no migration applies.
- **The machine reading.** `subscriptions.ts` gains `machineCredentialReadingSchema`, a strict discriminated union on `holds`: an `account` arm with optional `signedInAs`, optional `plan`, and a standing, plus `nothing`, `no-account-credential`, and `store-refused` arms. No arm carries a secret, and `ipc.test-d.ts:107` extends to pin that.
- **Two Inter-Process Communication (IPC) channels.** `subscriptions:detect` takes `{ provider }` and answers the reading. `subscriptions:adopt` takes `{ provider }` and answers the views envelope the other subscription acts already answer. The channel union grows from thirty-five to thirty-seven, and `ipc-vocabulary.test-d.ts` changes with it, by design.
- **One error code.** `ipcErrorSchema` gains `nothing-to-adopt` for the credential that vanished between the pick and the click.
- **The grant.** The subscription custody shape at `engine-protocol.ts:39` gains `renewal: z.enum(['app', 'owning-tool'])`, required. It rides both `lookCustodySchema` and the granted spend, and the engine-protocol type specs change with the contract.
- **Storage contracts.** The keychain layout changes from one shared vendor item plus a parked service to one derived item per account home, with the plain item belonging to the person. The repair in `custody-repair.ts` owns the transition.

## Error handling

| Failure                                                                 | Typed as                                          | Routes to                                                                                                                                                         |
| ----------------------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Credential store refuses to open at detection                           | `holds: 'store-refused'` in the reading           | Copy says the operating system refused, with an ask-again act. Never claims the machine holds nothing.                                                            |
| Record carries no account credential                                    | `holds: 'no-account-credential'`                  | Nothing to adopt, sign-in stays primary. Covers the empty Anthropic shell and the key-mode Codex file.                                                            |
| Keychain prompt denied at adoption                                      | existing `keychain-denied` IPC error              | The refusal sentence renders in the step, nothing re-asks on its own.                                                                                             |
| Credential gone between pick and click                                  | new `nothing-to-adopt` IPC error                  | The refusal renders, and the reading invalidates so the step reflects the machine again.                                                                          |
| Delegated renewal can't run: tool missing, run fails, store stays stale | one typed outcome union in `delegated-renewal.ts` | The credential stands as it was, the turn proceeds with what the store holds, and the row reads lapsed on its next observation. Nothing deletes, nothing retries. |
| 401 on an adopted credential mid-serve                                  | the provider's refusal, surfaced                  | No refresh retry, per the `owning-tool` arm. The row's remedy names the tool to open.                                                                             |
| A child asks main to persist an adopted credential                      | refused write, logged with the account id         | Defense in depth. Only a child bug reaches it.                                                                                                                    |
| Torn read of a vendor file mid-rotation                                 | one parse retry before any verdict                | Per research reference 13, a single retry before the reading declares anything.                                                                                   |
| Keychain refuses during the custody repair                              | `CustodyOutcome` with `keychain-denied`           | The repair stops where it stands and reruns on the next custody use. Ordering makes a partial run safe.                                                           |

## File map

Contracts, `packages/contracts/src/`:

- `accounts.ts`: provenance on the subscription row, version 8, stamping migration (modify)
- `subscriptions.ts`: the machine-reading schema beside the view schema (modify)
- `ipc.ts`: the detect and adopt channels, the `nothing-to-adopt` code (modify)
- `engine-protocol.ts`: `renewal` on the subscription custody shape (modify)
- `ipc-vocabulary.test-d.ts`, `ipc.test-d.ts`, `engine-protocol.test-d.ts`, `accounts.test.ts`, `engine-protocol-grants.test.ts`: the specs that change because the contracts change (modify)

Engine, `packages/engine/src/subscription/`:

- `reach-credential.ts`: the `owning-tool` arm skips ahead-of-expiry and 401 refresh, `refreshedAndPersisted` throws on it (modify)
- `reach.ts`: the retry callback honors the renewal owner (modify)
- their specs beside them (modify)

Desktop main, `apps/desktop/src/main/`:

- `subscriptions/credential-custody.ts`: derived items per home, plain-name read fallback, the park machinery leaves (modify)
- `subscriptions/custody-repair.ts`: the one-shot migration of plain and parked items, holding the legacy names (create)
- `subscriptions/machine-credential.ts`: detection reading and adoption material per provider and platform (create)
- `subscriptions/delegated-renewal.ts`: the per-provider renewal lane, headless tool run, typed outcome (create)
- `subscriptions/subscription-release.ts`: removes the derived item, hands nothing back (modify)
- `subscriptions/subscription-credential-store.ts`: keychain addressing by home, the active flag leaves the read path (modify)
- `subscriptions/subscription-views.ts`: adopted rows observe the machine store, provenance reaches the view, the same-address check reads per provenance (modify)
- `subscriptions/subscription-standing.ts`: record readers extracted for reuse by `machine-credential.ts` (modify)
- `ipc/subscriptions-ipc.ts`: the park sequence leaves the sign-in path, the snapshot check replaces it (modify)
- `ipc/subscriptions-machine-ipc.ts`: the detect and adopt handlers, sharing the workshop's write lane (create)
- `ipc/subscriptions-workshop.ts`: the write lane moves onto the bench both handler modules share (modify)
- `ipc/register-ipc.ts`: registers the machine handlers (modify)
- `engine-host/target-custody.ts`: the provenance branch reads the live machine store and stamps the renewal owner (modify)
- `engine-host/engine-host-credential-update.ts`: refuses persists for machine-provenance rows (modify)
- `index.ts`: wires the machine source and the delegated-renewal lane into the custody context (modify)
- new and changed specs beside each (create and modify)

Preload, `apps/desktop/src/preload/index.ts`: bridge entries for the two channels beside line 62 (modify)

Renderer, `apps/desktop/src/renderer/src/`, all placements per Feature-Sliced Design:

- `pages/providers/ui/found-account-row/found-account-row.tsx`: the found account stated with the adopt act trailing, pages layer, providers slice, ui segment (create)
- `pages/providers/ui/found-account-row/found-account-row.stories.tsx`: found, lapsed, pending, and inert states (create)
- `pages/providers/ui/sign-in-way/sign-in-way.tsx`: the verdict slot renders the reading, the sign-in demotes beneath a found account, pages / providers / ui (modify)
- `pages/providers/ui/sign-in-way/sign-in-way.stories.tsx`: the new verdict states (modify)
- `pages/providers/ui/subscription-account-row/subscription-account-row.tsx`: the provenance word, the remedy branch on provenance, pages / providers / ui (modify)
- `pages/providers/ui/subscription-account-row/subscription-account-row.stories.tsx`: adopted and lapsed-adopted rows (modify)
- `pages/providers/ui/catalog-flow/catalog-flow.tsx`: the subscription description at line 29 (modify)
- `pages/providers/ui/subscriptions-empty-state/subscriptions-empty-state.tsx`: the explanation at line 13 (modify)
- `shared/api/subscriptions.ts`: the reading query with `staleTime: Infinity`, the adopt mutation, shared layer, api segment (modify)
- `shared/testing/fake-subscriptions.ts`: the two channels join the handler union, shared / testing (modify)

End-to-end, `apps/desktop/e2e/`:

- `subscription-tools.ts`: the plant function and the keychain mode switches (modify)
- `fake-tools/claude.mts`: derived-name writing, expiry, renewal entry, fail mode, first-run refusal (modify)
- `fake-tools/codex.mts`: the fake Codex with file, key, and keyring modes (create)
- `fake-tools/keychain.mts`: refuse and prompt-counting modes (modify)
- `features/subscriptions/`: the four frozen feature files wired from this change's gherkin (create)
- `steps/`: the machine-credential steps, the serving-turn steps (create)

OpenSpec: `openspec/specs/subscriptions/spec.md` absorbs the delta at archive time, not in this branch.

## Interfaces

- Consumes: `SubscriptionProviderId`, `subscriptionProviders`, and the standing enum from `@recompose/contracts`. `KeychainSeam` and `CustodyOutcome` from `credential-custody.ts`. `runCommand` from `run-command.ts`. `oneAtATime` from `storage/one-at-a-time`. `loadAccountsFile` for the repair's account list.
- Produces, contracts: `MachineCredentialReading`, the `provenance` enum on `SubscriptionAccount` and `SubscriptionAccountView`, `renewal` on the subscription custody arm of `LookCustody` and `SpendGrant`, `IpcRequest<'subscriptions:detect'>`, and `IpcRequest<'subscriptions:adopt'>`.
- Produces, main: `readMachineCredential(provider): Promise<MachineCredentialReading>` and `machineCredentialMaterial(provider): Promise<MachineMaterial | null>` from `machine-credential.ts`, where `MachineMaterial` holds the blob and its parsed facts and never crosses IPC. `delegatedRenewal(provider): Promise<DelegatedRenewalOutcome>` from `delegated-renewal.ts`. `repairCustody(deps): Promise<CustodyOutcome>` from `custody-repair.ts`. `createSubscriptionsMachineIpcHandlers(ctx, shop)` typed as `Pick<IpcHandlers, 'subscriptions:detect' | 'subscriptions:adopt'>`.
- Produces, custody: `readForHome(home)`, `writeForHome(home, blob)`, `removeForHome(home)`, and `moveBetweenHomes(from, to)` replace the slot-and-active surface on `CredentialCustody`.
- Produces, renderer: `machineReadingQueryOptions(provider)` and `useAdoptSubscription()` beside `useSignInSubscription` in `shared/api/subscriptions.ts`, and the `FoundAccountRow` component with its reading, its act, and its inert state as props.

## Decisions

### 1. Derived items per home dissolve the parking machinery

One keychain item per account home, named by the tool's own derivation, replaces the shared vendor item plus the parked service. The park dance existed only because custody assumed one name, so repairing the name removes the machinery rather than patching it.

**Alternatives considered:** Keep park and place but target a derived name, rejected because the machinery would guard an item nothing contests anymore. Keep the plain item for the active account, rejected because that's the takeover this change ends.

**Architecture Decision Record (ADR) draft:** lands with the implementing PR as "the keychain item follows the config home," through the `architecture-decision-records` skill.

### 2. The repair restores the person's login or removes recompose's chain

The one-shot repair moves recompose's credentials to derived names, then puts the `RESERVED_SLOT` blob back into the plain item. The restored login may have lapsed, and the person's tool then asks them to sign in, which is the honest outcome of undoing a takeover. Leaving recompose's chain in the plain item would keep two owners rotating one credential.

**Alternatives considered:** Leave the plain item as it stands, rejected because the wrong-account defect from critique finding 1 would persist. Delete the plain item without restoring, rejected because recompose holds the person's original blob and returning it costs nothing.

**ADR draft:** folded into the decision-1 record.

### 3. The renewal owner rides the grant

A required `renewal: 'app' | 'owning-tool'` field on the subscription custody shape carries the fact from the stored row into the child. The child branches on data main handed it rather than knowledge it can't have, and the type system makes the arm impossible to ignore.

**Alternatives considered:** Send provenance itself and let the child infer, rejected because the child would own a policy that belongs to main. Strip the credential from the grant and have the child call back per turn, rejected as a protocol change three times the size for the same guarantee.

**ADR draft:** lands as "renewal ownership follows the account across the process boundary."

### 4. Delegated renewal runs in main, and the lane is the lock

Main resolves every spend grant, so a per-provider `oneAtATime` lane in `delegated-renewal.ts` serializes renewals across every child and gateway. The waiter re-reads the store inside the lane and skips its own run when the predecessor freshened it.

**Alternatives considered:** A lock in the child, rejected because two children share nothing. A lock file beside the vendor store, rejected because the store belongs to the vendor's tool, and writing beside it would be the kind of touching decision 6 forbids.

**ADR draft:** folded into the decision-3 record.

### 5. Detection reads under the pick and returns facts only

The pick triggers at most one secret read, guarded by an existence probe, and the reading that crosses IPC carries no material. The renderer caches it with `staleTime: Infinity` and invalidates only on acts.

**Alternatives considered:** Detection without any content read, rejected because four frozen scenarios need blob-borne facts, and on macOS the expiry lives nowhere else. Detection on the existing tools channel, rejected because that query takes a fresh reading on every mount (`shared/api/subscriptions.ts:32`), which is the behavior locked decision 8 exists to avoid.

### 6. Detect and adopt land in their own module

`subscriptions-machine-ipc.ts` holds the two handlers. `subscriptions-ipc.ts` stands at 291 lines under a `max-lines` gate, and machine reads are a separate responsibility from the sign-in lifecycle. Both modules share the workshop bench and its write lane, so an adopt and a sign-in never interleave their writes.

**Alternatives considered:** Growing `subscriptions-ipc.ts`, rejected by the gate and by single responsibility. Splitting the sign-in file itself first, rejected as churn the repair already shrinks it out of.

### 7. Provenance is a required field stamped by migration

The version-8 migration writes `provenance: 'sign-in'` onto every stored subscription row, and the schema requires the field from then on. An optional field would push the default into every reader.

**Alternatives considered:** Reusing `credentialPolicy`, rejected because `credential-policy.ts` carries in-flight and concurrency tuning, which locked decision 5 already settled.

### 8. An adopted account keeps no config home

Adoption records a row and nothing else on disk. Standing, address, and plan for a machine row come from the live machine store at view time, through the same readers detection uses. The active pointer stays where it stands, because it names recompose-owned homes.

**Alternatives considered:** Materializing a home to reuse the observation path unchanged, rejected because a copied credential is the exact artifact decision 1 forbids.

### 9. Forgetting an adopted account leaves the machine store alone

Removal takes the row out of the registry and touches nothing the vendor's tool wrote. Research reference 15 shows the vendor's own sign-out doesn't revoke tokens, so recompose's forget is registry-scoped and claims nothing more.

### 10. The fixture seams mirror the production seams

The plant function writes the same shapes the fake tools write, through the same fake keychain directory the production seam already points at (`RECOMPOSE_FAKE_KEYCHAIN_DIR`). The fake `codex` mirrors `claude.mts` in structure. No fixture touches production code paths beyond the environment seams `subscriptions-wiring.ts` already honors.

## Test matrix

| Layer          | What this layer proves (or why none)                                                                                                                                                                                                                                                                                                                                                                | Check command                                                                                                 |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Unit           | Custody derivation, fallback, and repair ordering never lose a blob. The machine readers classify each store state per platform, parameterized like `subscription-credential-store.test.ts`. The renewal lane admits one run and leaves failures untouched. The child skips both refresh paths on `owning-tool`. The migration stamps version 8. Views branch on provenance.                        | `CI=1 pnpm run test`                                                                                          |
| Integration    | The detect and adopt handlers over the fake keychain seam answer every reading arm and record the adopted row. The grant pipeline stamps `renewal` end to end from a stored row. The credential-update wall refuses machine rows.                                                                                                                                                                   | `CI=1 pnpm run test`                                                                                          |
| End-to-end     | All 27 frozen scenarios across the five feature files, on the planted-credential, fake-codex, expiry, renewal-trace, and keychain-mode fixtures.                                                                                                                                                                                                                                                    | `pnpm run build`, then `pnpm run test:e2e`                                                                    |
| Property       | The derivation law: for any home path, the derived name differs from the plain name and stays stable at eight hex characters. The fresher-store law: the pick between two records ignores their order. The hygiene law: no reading field ever contains material from the source blob. Each law carries a deterministic twin with fixed values, because the property alone carries no mutation duty. | `CI=1 pnpm run test`                                                                                          |
| Mutation scope | Every new and changed main-process file sits in `src/main/**/*.ts` on the mutate list, and the engine changes sit under the engine's own config. The four wiring-and-spawn exclusions stand unchanged, and the break threshold stays 81.                                                                                                                                                            | `pnpm --filter @recompose/desktop run test:mutation`, and `pnpm --filter @recompose/engine run test:mutation` |

Type-level: the channel union spec breaks and changes by design, the no-secret spec extends over the reading schema, and the grant type spec pins the `renewal` arm. All run inside the typecheck battery, `pnpm run typecheck`.

## Task decomposition hooks

- Task 1: contracts (depends on: none, hands off: the provenance enum, the reading schema, the two channels, the `renewal` arm, and version 8)
- Task 2: custody repair (depends on: none, hands off: the per-home custody surface and `custody-repair.ts`, with `subscriptions-ipc.ts`, `subscription-release.ts`, and `subscription-credential-store.ts` reworked over it)
- Task 3: machine readers and the renewal lane (depends on: task 1, hands off: `machine-credential.ts` and `delegated-renewal.ts`)
- Task 4: detect and adopt handlers plus views (depends on: tasks 1, 2, and 3, hands off: `subscriptions-machine-ipc.ts`, the workshop lane, and provenance-aware views)
- Task 5: the engine child's renewal gate (depends on: task 1, hands off: the `owning-tool` arm through `reach-credential.ts` and `reach.ts`)
- Task 6: the engine host's grant path (depends on: tasks 1, 3, and 5, hands off: the provenance branch in `target-custody.ts`, the stamped grant, and the persist wall)
- Task 7: the renderer (depends on: task 1, with the fake bridge standing in until task 4, hands off: `FoundAccountRow`, the verdict slot, the row remedies, the copy, and the api hooks)
- Task 8: the fixtures (depends on: none, hands off: the plant seam, `codex.mts`, and the tool and keychain modes)
- Task 9: the end-to-end features and steps (depends on: tasks 4, 6, 7, and 8, hands off: the 27 scenarios green)
- Task 10: the first-run observability scenario (depends on: task 8, hands off: the seeded-home scenario against the landed seeding commit)

Tasks 1, 2, and 8 run in parallel from the start: they own disjoint files, contracts against desktop custody against e2e fixtures. Tasks 3, 5, and 7 fan out once task 1 lands, again on disjoint files across main, engine, and renderer. Tasks 4 and 6 serialize behind their named producers because they consume what those tasks hand off. Task 9 reads what 4, 6, 7, and 8 produce, and runs last with task 10 beside it.

## Risks

- [Risk] The custody repair mishandles an install state nobody enumerated → Mitigation: every step writes before it removes, the repair is idempotent, and the unit suite drives it over every combination of plain, reserved, and parked contents.
- [Risk] An old Claude Code writes the plain name during a recompose sign-in → Mitigation: the snapshot-and-compare in the sign-in flow moves the blob to the derived name and restores the person's item, and the custody spec pins it.
- [Risk] The delegated run opens a browser or hangs on a broken credential → Mitigation: the run is time-bounded and windowless, a failure marks the account lapsed without retry, and the remedy names the tool for the person to run themselves.
- [Risk] A detection prompt surprises a person on a locked keychain → Mitigation: the existence probe runs first, the read happens only under a pick, the sheet holds while it runs, and a denial reads as the store refusing with an ask-again act.
- [Risk] The Codex eight-day staleness timer rotates a credential recompose just read → Mitigation: every serving turn reads the live store, so a rotation between turns is the next read's fresh answer, never a conflict.
- [Risk] The verdict slot swells `sign-in-way.tsx` past the size gates → Mitigation: the found state lives in `FoundAccountRow`, and each verdict arm stays a small branch.
- [Risk] An Enter that picks the provider commits the adopt act on the freshly mounted step → Mitigation: the committing keydown prevents its default, the pattern this codebase already carries for Enter-opened surfaces.
- [Risk] The mutation gate finds the repair's orderings under-pinned → Mitigation: the ordering laws get deterministic specs per step, and no threshold moves.

## Migration and rollout

- **Accounts document:** version 8 with a stamping migration. Older builds refuse a version-8 file with the existing `accounts-newer-schema` error, so a downgrade stops with a stated error rather than misreading provenance.
- **Keychain:** the one-shot repair migrates every existing install on first custody use, as designed above. It needs no flag and no timing beyond the lane it runs in.
- **Rollback:** a build downgraded past this change reads the plain item and the parked service again. After the repair those hold the person's restored login and nothing, so the old build sees signed-out accounts and offers sign-in again. Nothing disappears without a word, and the person's own login stands. This design accepts that cost and records it here.
- **Deploy:** ships as one release. The engine child and main ship together inside the desktop bundle, so the grant's new field never crosses a version boundary.

## Open questions

- The exact first-run key set beyond the two seeded flags. `machine-probe.md` couldn't enumerate the minified bundle's gates, so implementation drives a seeded home against the real CLI and adds what it observes. The seed mechanism and its location stand settled.

## Settled during implementation

**The headless renewal run, per provider.** `subscriptionProviders[provider].renewArguments` carries it, and an empty list means the tool names none.

- Anthropic runs `claude auth status`. It answers the signed-in address, the organization, and the plan, which are facts the provider holds rather than the record does, so the run has to carry a token the provider still accepts. CodexBar reached the same path before the subcommand existed, driving an interactive session at `/status` and pressing return on a timer to make the tool touch its auth path (`ClaudeStatusProbe.touchOAuthAuthPath`). The shipped subcommand is that same touch without the terminal.
- OpenAI names none. `codex login status` loads the record and prints which sign-in it carries, touching nothing (`codex-rs/cli/src/login.rs`, `run_login_status`). `codex doctor` leaves it alone too, proven against a record whose identity token lapsed five days earlier. Only a spent turn renews, and no background refresh may cost a person a turn. An adopted Codex account therefore stands on what Codex last wrote, and lapses openly when that runs out.

**Where a Codex record lapses.** Codex decides its own freshness from the `access_token`'s claim, falling back to eight days past `last_refresh` when that token carries none (`codex-rs/login/src/auth/manager.rs`, `should_refresh_proactively`). The identity token beside it lapses an hour after issue, and Codex renews it only alongside the other. Reading its claim therefore reported every Codex account lapsed within the hour while Codex itself was content for days. `credential-records.ts` reads the spent token's claim, which is what `credentials.ts:68` in the engine already did.

**Where a control-plane call lands under test.** The token endpoint and the profile lookup name the vendor's own host rather than an account's, so no target origin redirects them. `controlPlaneUrl` honours `RECOMPOSE_CONTROL_ORIGIN` on exactly the terms the probe and runtime origins already use: a loopback host or nothing.

## End-to-end verification

Take a macOS machine where Claude Code holds a live sign-in, and run the app through the `run-desktop` skill. Open the subscriptions surface, add a provider, and pick Anthropic. The found account leads the step, named by address and plan, with sign-in beneath it as the quiet act. Adopt it. The list shows one connected row carrying the machine-provenance word, and `claude` in a fresh terminal still answers as the person's own account, with no login prompt. Then remove the row and confirm `claude` still answers signed in.

Review criteria for a fresh-context reviewer:

- Every scenario in the five frozen feature files passes, unchanged.
- `rg 'RESERVED_SLOT|PARKED_SERVICE' apps/desktop/src/main` answers only inside `custody-repair.ts` and its spec.
- `rg 'refreshSubscriptionCredential|refreshedAndPersisted' packages/engine` shows every caller behind an `renewal === 'app'` guard or a throw.
- The detect response schema contains no field that could carry a token, and `ipc.test-d.ts` pins it.
- `found-account-row.tsx` sits in its own folder with its stories sibling, and `pnpm run lint:stories` passes.
- Both schemes of the connect step and the account row pass the `claude-in-chrome` look, with the inert states measured from the page.
- The mutation runs for desktop main and engine hold the 81 threshold with no config change in the diff.
