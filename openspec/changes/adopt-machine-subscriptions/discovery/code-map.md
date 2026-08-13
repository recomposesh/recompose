# Code map: adopt machine subscriptions

Paths are repository relative. Line numbers are against `origin/main` at `0177367e`.

## Sign-in call chain today

| #   | Hop                                                                                                 | Note                                                                                                       |
| --- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1   | `apps/desktop/src/renderer/src/app/routes/__root.tsx:74`                                            | Window strip mounts `AddProviderAct` with the kind from the search param.                                  |
| 2   | `apps/desktop/src/renderer/src/pages/providers/ui/add-provider-act/add-provider-act.tsx:37`         | Opens the catalog sheet.                                                                                   |
| 3   | `apps/desktop/src/renderer/src/pages/providers/ui/catalog-flow/catalog-flow.tsx:95`                 | Two-step sheet: grid, then the connect step for the picked entry.                                          |
| 4   | `apps/desktop/src/renderer/src/pages/providers/ui/provider-connect-way/provider-connect-way.tsx:49` | A subscription way routes to the sign-in arm.                                                              |
| 5   | `apps/desktop/src/renderer/src/pages/providers/ui/sign-in-way/sign-in-way.tsx:28`                   | Reads the tools query; `present` gates the button, the absent branch sits at line 41.                      |
| 6   | `apps/desktop/src/renderer/src/pages/providers/ui/sign-in-action/sign-in-action.tsx:51`             | The click. The pending state renders the copyable command at line 24.                                      |
| 7   | `apps/desktop/src/renderer/src/shared/api/subscriptions.ts:49`                                      | Calls the bridge, then writes the answer into the views cache at line 51.                                  |
| 8   | `apps/desktop/src/preload/index.ts:64`                                                              | Bridge entry to `ipcRenderer.invoke`.                                                                      |
| 9   | `apps/desktop/src/main/ipc/dispatch.ts:67`                                                          | Sender trust, request parse at line 70, handler at 79, response parse at 81.                               |
| 10  | `apps/desktop/src/main/ipc/subscriptions-ipc.ts:281`                                                | The sign-in handler, inside the write lane at line 250.                                                    |
| 11  | `apps/desktop/src/main/subscriptions/tool-presence.ts:38`                                           | Resolves the binary on the login-shell PATH. An absent tool answers `tool-missing`.                        |
| 12  | `apps/desktop/src/main/ipc/subscriptions-ipc.ts:155`                                                | `activeSlot`: the active account id, else `RESERVED_SLOT`.                                                 |
| 13  | `apps/desktop/src/main/ipc/subscriptions-ipc.ts:47`                                                 | `makeRoomForTheSignIn` parks the machine's existing keychain blob, then clears the vendor item at line 61. |
| 14  | `apps/desktop/src/main/subscriptions/subscription-homes.ts:27`                                      | `seedConfigHome` writes a config only for `openai`. Anthropic gets an empty directory.                     |
| 15  | `apps/desktop/src/main/ipc/subscriptions-ipc.ts:88`                                                 | Launches the terminal. Launch errors are swallowed.                                                        |
| 16  | `apps/desktop/src/main/subscriptions/sign-in-launch.ts:102`                                         | macOS writes a `.command` and calls `open`; Windows starts PowerShell; Linux walks a terminal list.        |
| 17  | `apps/desktop/src/main/subscriptions/subscription-sign-in.ts:28`                                    | Polls every second up to five minutes (`subscriptions-wiring.ts:13`).                                      |
| 18  | `apps/desktop/src/main/subscriptions/subscription-standing.ts:133`                                  | Observes the pending home, then the outside credential at line 116.                                        |
| 19  | `apps/desktop/src/main/ipc/subscriptions-ipc.ts:103`                                                | On nothing landing, the parked credential is put back.                                                     |
| 20  | `apps/desktop/src/main/ipc/subscriptions-ipc.ts:140`                                                | `promotePending` renames `pending` to the account id.                                                      |
| 21  | `apps/desktop/src/main/ipc/subscriptions-ipc.ts:142`                                                | The newly landed vendor credential is copied into the parked service under the account id.                 |
| 22  | `apps/desktop/src/main/ipc/subscriptions-ipc.ts:118`                                                | The active pointer is symlinked at the new account.                                                        |
| 23  | `apps/desktop/src/main/engine-host/target-custody.ts:54`                                            | Later, at serving time, the stored credential is read for the engine.                                      |

## The finding that reshapes the change: recompose already refreshes

`packages/engine/src/subscription/refresh.ts:245` holds `refreshSubscriptionCredential`. The token endpoints and client identifiers sit at lines 22 to 29, and they are the vendors' own. `credentialNeedsRefresh` at line 39 uses a five-minute margin.

`packages/engine/src/subscription/reach-credential.ts:57` refreshes ahead of expiry, line 50 refreshes reactively on a rejection, and line 26 persists the result. The persisted blob travels back through the credential-update lane (`packages/engine/src/engine-child-lanes.ts:66`) to `apps/desktop/src/main/engine-host/engine-host-credential-update.ts:33` and into the store, which on macOS with Anthropic writes the keychain (`subscription-credential-store.ts:62`).

For a subscription recompose signed in itself, this is correct: recompose owns that credential alone, so rotating it races nobody. For an adopted credential it is exactly the behaviour the research arm found breaks the person's own tool. **Adoption therefore cannot reuse the existing serving path unchanged. The refresh decision has to become per-account rather than global.**

`refreshing` at `refresh.ts:37` is a single-flight map inside one engine child. It is not a cross-process lock and gives no protection against the vendor's own tool refreshing at the same moment.

## The second finding: the plain service name is contested

`credential-custody.ts:5` names one constant, `VENDOR_SERVICE = 'Claude Code-credentials'`, and uses it for two different jobs: reading what the machine already holds, and receiving what a recompose sign-in produces. `machine-probe.md` establishes that a custom config home writes a derived name instead, so those two jobs do not address the same keychain item on current Claude Code. Whether recompose's own flow still works in production, and by what route, was not established here and is not this change's job to settle. It is recorded as a risk because adoption reads the same constant.

## Release and the reserved slot

`subscription-release.ts:13` removes the home, heals the active pointer, forgets the parked slot for the account, and if the removed account was active, places whatever remains, falling back to `RESERVED_SLOT`. When nothing is parked, `placeFrom` removes the vendor item outright (`credential-custody.ts:78`).

`RESERVED_SLOT` (`credential-custody.ts:7`) holds the login that existed before recompose. It is parked at the first sign-in (`subscriptions-ipc.ts:56`), and handed back in exactly two places: a sign-in that fails (`subscriptions-ipc.ts:105`) and the last subscription leaving (`subscription-release.ts:35`). On a successful sign-in it stays parked for the life of the install, and no path deletes it.

## Downstream credential consumers

Serving resolves a grant (`engine-host/spend-grant.ts:64`), loads custody (`engine-host/target-custody.ts:156`), and for a subscription reads the stored blob at line 54, answering `missing-credential` when absent. The grant reaches the child (`engine-host/engine-host.ts:115`), and the proxy routes a subscription custody to `packages/engine/src/subscription/reach.ts:206`.

## Contracts

`packages/contracts/src/subscriptions.ts` carries the provider identifier enum at line 5, the `subscriptionProviders` record at line 9 with `toolBinary`, `toolName`, `configHomeVariable`, and `signInArguments`, the standing enum at line 38, the account view at line 40, and the tool reading at line 52. Both objects are strict.

`packages/contracts/src/accounts.ts:21` holds the subscription account row: `id`, `provider`, `kind`, `label`, and optional `credentialPolicy` and `transportPolicy`. `ACCOUNTS_VERSION` is 7 at line 11.

`credentialPolicy` is **not** a usable seam for refresh ownership. `packages/contracts/src/credential-policy.ts` shows it carries in-flight and concurrency tuning only. Marking an account as adopted needs a new field and an accounts-document migration.

## Renderer surface

Everything below sits under `apps/desktop/src/renderer/src/`, and every `ui/` component in the providers slice already follows the folder rule and already has a stories sibling.

| File                                                                         | Layer / slice / segment | Changes                                                                                             |
| ---------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------- |
| `shared/api/subscriptions.ts`                                                | shared / api            | A hook beside `useSignInSubscription` at line 43.                                                   |
| `pages/providers/ui/sign-in-way/sign-in-way.tsx`                             | pages / providers / ui  | The primary surface. Today a two-way split on the command's presence at line 41.                    |
| `pages/providers/ui/sign-in-action/sign-in-action.tsx`                       | pages / providers / ui  | One action slot today at line 47. A second act is a layout decision.                                |
| `pages/providers/ui/subscriptions-empty-state/subscriptions-empty-state.tsx` | pages / providers / ui  | Copy at line 13 says signing in is the only way in.                                                 |
| `shared/testing/fake-subscriptions.ts`                                       | shared / testing        | Its handler type is keyed on the channel union, so a new channel breaks the type until it is added. |

Nothing on screen calls `subscriptions:activate` today. The channel is contracted, exposed, handled, and faked, but the only callers are the fake bridge and its spec. There is no affordance for choosing the active account.

## Test surface

Every subscriptions file is on the Stryker mutate list except `macos-keychain.ts`, `run-command.ts`, `sign-in-launch.ts`, and `subscriptions-wiring.ts` (`apps/desktop/stryker.config.json:8`). The break threshold is 81 and `ignoreStatic` is true. No renderer providers-slice file is mutated. Coverage repeats the same four exclusions at `apps/desktop/vitest.config.ts:67`.

Specs exist per production file, listed in full in the arm's output; the load-bearing ones for this change are `credential-custody.test.ts` (park, place, hand-over, and a spec that hand-over never loses the blob at line 229), `subscription-standing.test.ts`, `subscription-credential-store.test.ts` (which parameterises platform at lines 29, 37, 49), and the four `subscriptions-ipc-*` specs.

Type specs: `packages/contracts/src/ipc-vocabulary.test-d.ts:38` pins the channel-name union, so **adding a channel breaks it by design**. `ipc.test-d.ts:107` pins the subscription channels' shapes and that none carries a secret.

End-to-end features live at `apps/desktop/e2e/features/subscriptions/`. The fake tools are `claude.mts`, `keychain.mts`, and `sign-in-launcher.mts`. **There is no fake `codex`, and every subscription scenario is Anthropic.** The fake keychain is planted only by the fake CLI (`fake-tools/claude.mts:28`), so no fixture can seed a credential that was on the machine before recompose ran.

## Platform branches

The two gates that matter: `subscriptions-wiring.ts:36` makes custody exist only on darwin, and `subscription-credential-store.ts:42` chooses keychain over file only for darwin with Anthropic. The rest are the pointer kind (`subscription-homes.ts:63`), the Windows shim suffixes and PATH separator (`tool-presence.ts:24,30,43`), the command quoting (`subscription-commands.ts:25,33`), and the terminal launch per platform (`sign-in-launch.ts:85,109,115,121`).

Consequence: on macOS the machine's Anthropic credential is already reachable through `vendorHolds()`. On Linux and Windows `machineCustody()` returns null, and the file readers only ever look inside a recompose-owned home, so **no path exists today to read a machine credential on those platforms.**

## Files this feature will touch

| Path                                                        | What changes                                                                | Risk     | Why                                                                                                                                                                    |
| ----------------------------------------------------------- | --------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/contracts/src/accounts.ts`                        | A field marking an account adopted, plus a version bump and migration       | medium   | `ACCOUNTS_VERSION` is 7; the refresh decision hangs off this field.                                                                                                    |
| `packages/contracts/src/subscriptions.ts`                   | A reading for what the machine holds                                        | low      | Additive to a strict object.                                                                                                                                           |
| `packages/contracts/src/ipc.ts`                             | An adopt channel beside the five at line 180                                | low      | Additive; the response can reuse the views envelope.                                                                                                                   |
| `packages/contracts/src/ipc-vocabulary.test-d.ts`           | The channel union                                                           | low      | The type spec changes because the contract changes. That is the invariant working.                                                                                     |
| new file under `apps/desktop/src/main/subscriptions/`       | Machine-credential detection across three platforms                         | **high** | Nothing today reads outside a recompose home. New boundary, new platform matrix, and it is mutated.                                                                    |
| `apps/desktop/src/main/subscriptions/credential-custody.ts` | Separating the two roles of `VENDOR_SERVICE`, and a read that does not park | **high** | Every reordering of park and place risks losing a real credential.                                                                                                     |
| `packages/engine/src/subscription/reach-credential.ts`      | Refresh becomes conditional on the account                                  | **high** | This is the behaviour change that keeps the person's own tool working.                                                                                                 |
| `apps/desktop/src/main/subscriptions/subscription-homes.ts` | `seedConfigHome` grows an Anthropic branch                                  | medium   | The pending-to-active rename assumes a pending step that adoption does not have.                                                                                       |
| `apps/desktop/src/main/subscriptions/tool-presence.ts`      | Possibly reports what the machine holds                                     | medium   | `reportTools` runs on every tools call and the renderer refetches on mount, so a keychain read here would prompt on every mount. Detection belongs on its own channel. |
| `apps/desktop/src/main/ipc/subscriptions-ipc.ts`            | An adopt handler                                                            | **high** | 291 lines already, and the park sequence is the most delicate code in the subsystem. Watch `max-lines`; it may want splitting rather than growing.                     |
| `apps/desktop/e2e/subscription-tools.ts`                    | A seam that plants a credential before recompose runs                       | **high** | No fixture does this today.                                                                                                                                            |
| new `apps/desktop/e2e/fake-tools/codex.mts`                 | A fake Codex                                                                | medium   | Only if OpenAI adoption gets end-to-end cover.                                                                                                                         |
| `openspec/specs/subscriptions/spec.md`                      | New requirements                                                            | low      | The requirement at line 24, that the provider's own tool performs the sign-in, is the one adoption qualifies.                                                          |
