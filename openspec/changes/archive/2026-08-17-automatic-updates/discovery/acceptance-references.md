# Acceptance-references brief: `automatic-updates` (tier full)

## Scope and method

I read the change artifacts, the ADR that pins the decision, the packaging config and the release workflow on local disk, then hunted the electron-builder docs, the electron-builder and Electron issue trackers, Microsoft's Store policy text, Apple/Squirrel constraints and two security write-ups for the places each promised behavior is known to break. Every criterion below is written so a reviewer can turn it into a `.feature` scenario, a main-process spec, or a release-workflow assertion.

Repository files read, recorded repository-relative:

- `openspec/changes/automatic-updates/manifest.md`
- `openspec/changes/automatic-updates/specs/updates/spec.md`
- `docs/adr/0133-an-update-arrives-through-the-channel-that-installed-it.md`
- `apps/desktop/electron-builder.yml`
- `apps/desktop/package.json` (electron-builder `26.15.3`, Electron `43.2.0`, no `electron-updater` dependency yet)
- `.github/workflows/release.yml`
- `openspec/changes/archive/2026-07-30-settings-screen/discovery/acceptance-references.md` (format precedent)

**Stated gap:** I did not open `apps/desktop/src/main/index.ts` beyond a grep hit, nor the IPC contract in `packages/contracts`, nor `apps/desktop/src/main/ipc/push-events.ts`. So every claim below about how the "standing affordance" reaches the renderer is framed as a question, not a finding, and criteria 6.x may already be partly satisfied by the existing push-event transport.

---

## 1. The release pipeline may not be producing an update feed at all (highest priority, and the sources conflict)

**Finding.** electron-builder's own troubleshooting page states: "electron-builder generates `latest.yml` (Windows), `latest-mac.yml` (macOS), or `latest-linux.yml` **only when publishing**," and directs you to run with `--publish always` or `--publish onTagOrDraft` ([Troubleshooting, electron-builder](https://www.electron.build/docs/troubleshooting/)).

`.github/workflows/release.yml` lines 42, 44 and 46 call `build:mac` / `build:win` / `build:linux`, and all three scripts in `apps/desktop/package.json` (lines 29 to 31) end in `--publish never`. The workflow then greps `latest*.yml` out of `apps/desktop/dist` at line 52 and uploads whatever it finds.

This contradicts `docs/adr/0133-...` line 15, which asserts "`latest*.yml` and `.blockmap` have shipped with every release since 0035." Both cannot be true. **I am reporting this as a conflict, not a finding.** Resolve it by listing the assets on the last published release, or by reading the `ls -la release-out` output in the last release run.

If the docs are right, `electron-updater` has nothing to read and every criterion in the change is unreachable. The fix is not free: `--publish onTagOrDraft` makes electron-builder create and upload to the draft release itself, which displaces the `gh release create ... --draft` step at line 99 and the artifact hand-off between the `build` and `draft` jobs.

**Acceptance criteria**

1. A release run produces exactly three channel files across the matrix: `latest.yml`, `latest-mac.yml`, `latest-linux.yml`. Assert it in the workflow with a failing step, not by eyeballing `ls`.
2. Each channel file names the same version as the tag, and its `sha512` matches the artifact uploaded beside it.
3. `merge-multiple: true` at line 97 never silently drops a channel file to a name collision. Today the three OS runners produce three distinct names, so the guard is a regression test, not a bug fix.
4. `.blockmap` files reach the release for NSIS and AppImage, since differential download depends on them ([Troubleshooting](https://www.electron.build/docs/troubleshooting/)).

---

## 2. Signing after the build invalidates the manifest, which is exactly what SignPath does

**Finding.** The sha512 recorded in `latest.yml` is computed by electron-builder when it produces the artifact. Any tool that rewrites the binary afterwards, including an Authenticode signature, changes both the hash and the size, and the updater then fails with `sha512 checksum mismatch` on every user's machine. electron-builder's troubleshooting page names the cause precisely: the artifact and the `.yml` "must have been generated together in the same build and not mixed from different builds" ([Troubleshooting](https://www.electron.build/docs/troubleshooting/)). The failure is reported repeatedly by people signing with an external service after packaging ([electron-builder#2111 "Code sign after exe generation - sha512 checksum mismatch"](https://github.com/electron-userland/electron-builder/issues/2111), [#6848](https://github.com/electron-userland/electron-builder/issues/6848), [#7004](https://github.com/electron-userland/electron-builder/issues/7004)).

The supported escape is signing **inside** the build through the custom hook: `win.signtoolOptions.sign` pointing at a script ([Code Signing for Windows, electron-builder](https://www.electron.build/docs/features/code-signing/code-signing-win/)). SignPath's own integration surface is a PowerShell module or a direct Web API call from the build ([SignPath build system integration](https://about.signpath.io/documentation/build-system-integration)); I found no SignPath page documenting an electron-builder recipe, so the hook script is ours to write and that is a gap in the vendor material, not a settled path.

`apps/desktop/electron-builder.yml` currently has no `win.sign`, no `win.signtoolOptions` and no `win.publisherName`.

**Acceptance criteria**

1. Windows signing happens through `win.signtoolOptions.sign` during the electron-builder run, never as a post-build step on the produced `.exe`.
2. A release-workflow check recomputes the sha512 of the uploaded `.exe` and compares it to the value in `latest.yml`. A mismatch fails the run before the draft is created.
3. The same check runs for the macOS `zip` and the AppImage, because notarization stapling and any post-processing carry the same hazard.
4. `actions/attest-build-provenance` at line 62 covers `latest*.yml` and `*.blockmap`, not only the binaries. The manifest is the integrity anchor the updater trusts; leaving it unattested while attesting the artifact protects the wrong file.

---

## 3. Windows: `publisherName` must equal the certificate Subject CN, and verification has a documented fail-open history

**Finding.** electron-updater compares the downloaded installer's Authenticode Subject CN against `win.publisherName`. When `publisherName` is unset, electron-builder derives it at packaging time from the certificate's **issuer** name rather than its subject, which produces "New version X is not signed by the application owner" on every update ([electron-builder#1773](https://github.com/electron-userland/electron-builder/issues/1773), [#7983](https://github.com/electron-userland/electron-builder/issues/7983), [#5580](https://github.com/electron-userland/electron-builder/issues/5580)). Accented or non-ASCII characters in the subject have also broken the comparison ([#3667](https://github.com/electron-userland/electron-builder/issues/3667)).

ADR 0133 sets `win.publisherName` to `SignPath Foundation`. That is the right shape of decision, but the value has to come from reading the actual signed artifact, not from the foundation's marketing name.

The verification path itself failed open in the past: an unescaped filename passed to PowerShell's `Get-AuthenticodeSignature` let an attacker force a parse error, which was treated as "could not verify" and the install proceeded, and the same vector allowed command injection. Patched in electron-updater v22.3.5, 24 February 2020, but Doyensec noted the fail-open condition persisted after the fix ([Doyensec, "Signature Validation Bypass Leading to RCE In Electron-Updater", 24 February 2020](https://blog.doyensec.com/2020/02/24/electron-updater-update-signature-bypass.html)).

**Acceptance criteria**

1. `win.publisherName` is set from the Subject CN read out of the signed installer (`signtool verify /v` or `Get-AuthenticodeSignature`), and a release step asserts the two strings are byte-identical.
2. An end-to-end update from version N to N+1 on a real signed Windows build succeeds. A unit test cannot cover this; it needs one manual or self-hosted pass per certificate change.
3. Changing the signing certificate is treated as a breaking change to the update path and gets its own checklist item, since a new Subject CN strands every installed copy.
4. Signature verification is never disabled (`verifyUpdateCodeSignature` left at its default), and no code path treats "verification threw" as "verification passed."
5. Artifact filenames stay free of quotes and shell metacharacters. `${productName}-${version}-setup.${ext}` yields `Recompose-0.3.0-setup.exe` today, which is safe; assert it rather than assume it.

---

## 4. Windows: NSIS install scope decides whether the update needs a password

**Finding.** With `nsis.perMachine: true` the app installs under `C:\Program Files` and every update needs UAC elevation. Reported consequences include `spawn UNKNOWN` failures with UAC enabled ([electron-builder#712](https://github.com/electron-userland/electron-builder/issues/712)), secondary users being asked for the original admin's password ([#5644](https://github.com/electron-userland/electron-builder/issues/5644)), a UAC dialog that appears and then does nothing after a reinstall ([#6425](https://github.com/electron-userland/electron-builder/issues/6425)), and update loops that leave the app unusable ([#6312](https://github.com/electron-userland/electron-builder/issues/6312)).

`apps/desktop/electron-builder.yml` does not set `nsis.perMachine`, so it defaults to per-user, which is the configuration that updates without a prompt. That is the correct default for this change and it should be asserted rather than left to inertia.

**Acceptance criterion**

1. A config spec asserts `nsis.perMachine` is absent or `false`. Turning it on is a decision that needs its own ADR line, because it converts a silent update into a password prompt and contradicts "a downloaded update waits for the person."

---

## 5. macOS: three hard preconditions, and one of them is not met by the current matrix

**Finding.** From the vendor docs:

- "macOS application must be signed in order for auto updating to work" ([Auto Update, electron-builder](https://www.electron.build/docs/features/auto-update/)). Direct distribution needs a Developer ID Application certificate, and macOS 10.15 onward requires notarization or Gatekeeper blocks the app ([Code Signing, Electron](https://www.electronjs.org/docs/latest/tutorial/code-signing)).
- The mac `target` default is "dmg and zip for Squirrel.Mac," and "Squirrel.Mac auto update mechanism requires both `dmg` and `zip` to be enabled, even when only `dmg` is used" ([macOS, electron-builder](https://www.electron.build/docs/mac/)). `apps/desktop/electron-builder.yml` sets no `mac.target`, so both ship today by default. The risk is a future edit that adds an explicit target list and drops `zip`.
- Notarization activates only when one of three env var triples is present: `APPLE_API_KEY`/`APPLE_API_KEY_ID`/`APPLE_API_ISSUER`, or `APPLE_ID`/`APPLE_APP_SPECIFIC_PASSWORD`/`APPLE_TEAM_ID`, or `APPLE_KEYCHAIN`/`APPLE_KEYCHAIN_PROFILE` ([macOS, electron-builder](https://www.electron.build/docs/mac/)). `mac.notarize` is `false` at line 27 today.

**The architecture gap.** `.github/workflows/release.yml` line 19 runs one macOS runner, `macos-26`, which is Apple Silicon. There is no x64 macOS build at all, so Intel users have nothing to update to. ADR 0133 chooses a universal build, which is the right call: two separate arch runs each emit a `latest-mac.yml` and the one that finishes last overwrites the other, stranding the losing architecture ([electron-builder#5592](https://github.com/electron-userland/electron-builder/issues/5592)).

**Runtime failure modes that ship silently.** Squirrel.Mac refuses to update from a read-only volume, and an app launched from Downloads or from a mounted DMG is translocated into one ([electron-builder#8914 "Cannot update while running on a read-only volume"](https://github.com/electron-userland/electron-builder/issues/8914), [Squirrel.Mac#252 "Application becomes translocated after auto-update"](https://github.com/Squirrel/Squirrel.Mac/issues/252), [electron#7357](https://github.com/electron/electron/issues/7357)). Electron exposes `app.isInApplicationsFolder()` for exactly this. Separately, "Could not get code signature for running application" is the canonical symptom of an unsigned or partly signed build ([electron#36640](https://github.com/electron/electron/issues/36640), [electron-builder#3983](https://github.com/electron-userland/electron-builder/issues/3983)). And there is a long tail of "downloads but never installs" on macOS 13 and later ([electron-builder#7356](https://github.com/electron-userland/electron-builder/issues/7356), [#7121](https://github.com/electron-userland/electron-builder/issues/7121), [#7054](https://github.com/electron-userland/electron-builder/issues/7054)).

**Acceptance criteria**

1. `mac.target` includes `zip` alongside `dmg`, asserted by a config spec so a later edit cannot remove it.
2. `mac.notarize` is `true` and the release job fails loudly when none of the three documented credential triples is present, rather than producing an unnotarized build that installs once and never updates.
3. The macOS artifact is universal, and exactly one `latest-mac.yml` reaches the release (guards electron-builder#5592).
4. On launch, when `process.platform === 'darwin'` and `app.isInApplicationsFolder()` is false, the app does not silently fail to update. It either reports that it must be moved to Applications or offers `app.moveToApplicationsFolder()`. Silence here is the exact behavior users report as "updates just stopped working."
5. A real N to N+1 update runs on a signed, notarized, universal build on both an Apple Silicon and an Intel machine before the change is called done.

---

## 6. Linux: the AppImage path has no signature check at all, and the file operations are fragile

**Finding.** electron-updater performs code signature validation on macOS and Windows and **nothing** on Linux ([Doyensec, "Building a Secure Electron Auto-Updater", 16 February 2026, Michael Pastor](https://blog.doyensec.com/2026/02/16/electron-safe-updater.html), which tabulates macOS: code signature plus custom validation, Windows: custom validation only, Linux: none). The only integrity check on an AppImage update is the sha512 recorded in `latest-linux.yml`, and that manifest sits on the same GitHub release as the artifact. Anyone who can write that release can write both. That is the trust boundary ADR 0133 accepts implicitly; the change should name it.

Reported AppImage failures:

- `ENOSYS: function not implemented` when the running AppImage is mounted by AppImageLauncher under `/run/user/<uid>/appimagelauncherfs/`, which does not support the unlink the updater needs ([electron-builder#4046](https://github.com/electron-userland/electron-builder/issues/4046), [AppImageLauncher#314](https://github.com/TheAssassin/AppImageLauncher/issues/314)).
- `mv: Executing stat not possible for '<file>': File not found` when moving the downloaded AppImage into place, a regression between electron-updater 6.3.2 and 6.3.3 tied to filenames containing spaces ([electron-builder#8698](https://github.com/electron-userland/electron-builder/issues/8698), reported 20 November 2024).
- The app downloads the new AppImage and then does not relaunch ([electron-builder#2200](https://github.com/electron-userland/electron-builder/issues/2200)).

`appImage.artifactName: ${productName}-${version}.${ext}` yields `Recompose-0.3.0.AppImage`, with no space, so the #8698 vector is closed by luck rather than by intent.

**Acceptance criteria**

1. The updater arms itself on Linux only when `process.env.APPIMAGE` is a non-empty string, and the deb path runs no check and renders no update control (spec scenario "a package tool owns a Linux install").
2. A config spec asserts no artifact name across all targets contains a space (guards electron-builder#8698).
3. An AppImage update failure caused by AppImageLauncher surfaces as a logged, named reason and leaves the app running. It never crashes and never loops (guards electron-builder#4046).
4. The ADR records, in one clause, that the Linux update path is protected by a checksum in a manifest that shares a trust domain with the artifact, so release-repository write access is the whole security boundary there.

---

## 7. Channel detection: `process.windowsStore` is narrower than the ADR assumes

**Finding.** Electron documents it exactly: "A `boolean`. If the app is running as an **MSIX package** (including AppX for Windows Store), this property is `true`, otherwise it is `undefined`" ([process, Electron](https://www.electronjs.org/docs/latest/api/process)). Note `undefined`, not `false`.

This matters because the Microsoft Store has two intake routes for a desktop app, and only one of them sets the flag. Store Policy **10.2.9** (version 7.19, published 10 September 2025, effective 14 October 2025) lets non-gaming products submit "an HTTPS-enabled download URL (direct link) to the product's installer binaries," where "the installer binary may only be an .msi or .exe," it "must be digitally signed with a code signing certificate that chains up to a certificate issued by a Certificate Authority that is part of the Microsoft Trusted Root Program," and "initiating the install must not display an installation user interface" ([Microsoft Store Policies, learn.microsoft.com](https://learn.microsoft.com/en-us/windows/apps/publish/store-policies)). **An app installed through 10.2.9 is an ordinary NSIS install. `process.windowsStore` is `undefined` and the built-in updater runs.** The self-update prohibition the ADR relies on is written at 10.2.5 and is scoped to games and Xbox products, not to a Win32 app taking the 10.2.9 route.

So the ADR's "two Windows channels" is really "one appx channel that suppresses the updater, or one direct-link channel that does not." Which one recompose submits changes the acceptance criteria.

**Acceptance criteria**

1. Channel detection is one pure function over `process.platform`, `process.windowsStore`, `process.env.APPIMAGE` and `app.isPackaged`, returning a closed set of states. The platform string never crosses the bridge, matching the pattern `docs/adr/0045-launch-at-login-absent-on-linux.md` already established for `loginItem`.
2. The `process.windowsStore` check treats `undefined` as "not a Store install" without coercing it through a truthiness bug. A spec pins `undefined`, `true` and `false` inputs.
3. When `app.isPackaged` is false, no check runs and no control renders. electron-updater otherwise logs "Skip checkForUpdates because application is not packed" and returns null, which is a confusing non-failure.
4. The change states which Store route recompose takes. If it is 10.2.9, criteria for "the Store owns a Windows install" are unsatisfiable as written and the requirement needs rewording, because the app cannot detect that channel.

---

## 8. "A downloaded update waits for the person": the defaults fight this requirement

**Finding.** Documented defaults ([AppUpdater, electron-builder](https://www.electron.build/docs/api/electron-updater.Class.AppUpdater/)):

- `autoDownload` defaults to `true`. "Whether to automatically download an update when it is found."
- `autoInstallOnAppQuit` "determines whether to automatically install a downloaded update on app quit," and is on by default. This one is compatible with the spec: it installs when the person quits anyway.
- `checkForUpdatesAndNotify()` raises a **native OS notification** when an update is ready. The spec says the app "MUST open no window and no dialog when a download finishes" and must "take no window focus." A toast is not a window, but it is an interruption the spec did not ask for, and it duplicates the standing affordance. Use `checkForUpdates()` and drive the UI from events.

`quitAndInstall()` "should only be called after `update-downloaded` has been emitted," and the docs carry a caveat that bites any app with an unsaved-work guard: "`autoUpdater.quitAndInstall()` will close all application windows first and only emit `before-quit` event on `app` after that. This is different from the normal quit event sequence" ([BaseUpdater, electron-builder](https://www.electron.build/docs/api/electron-updater.class.baseupdater/)).

The "it quit but never came back" family is large and long-lived: [electron#5289](https://github.com/electron/electron/issues/5289), [electron#5163](https://github.com/electron/electron/issues/5163) (single-instance lock), [electron#8418](https://github.com/electron/electron/issues/8418) (product name change), [electron#25626](https://github.com/electron/electron/issues/25626), [electron#50200](https://github.com/electron/electron/issues/50200) (March 2026), [electron-builder#3402](https://github.com/electron-userland/electron-builder/issues/3402), [electron-builder#5127](https://github.com/electron-userland/electron-builder/issues/5127).

**A version caveat.** The current docs show `quitAndInstall(options?: QuitAndInstallOptions)`, while electron-updater 6.x ships `quitAndInstall(isSilent?, isForceRunAfter?)`. `apps/desktop/package.json` pins electron-builder `26.15.3`, which pairs with electron-updater 6.x. Read the signature off the installed version rather than off the docs site.

**Acceptance criteria**

1. `checkForUpdatesAndNotify()` is never called. A lint or grep-level assertion is fair here; the spec forbids the dialog it produces.
2. No `dialog.showMessageBox`, no `BrowserWindow` creation, no `win.focus()` and no `win.show()` fires on `update-available`, `download-progress` or `update-downloaded`.
3. The affordance is state pushed to the renderer, not an event the renderer can miss. A renderer that mounts after `update-downloaded` fired still sees the waiting version. This is what "MUST outlive navigation between pages" actually requires, and it is where an event-only design breaks. **Open question I could not answer:** whether `apps/desktop/src/main/ipc/push-events.ts` already replays state to a late subscriber.
4. Choosing restart calls `quitAndInstall` only after `update-downloaded`, and any `before-quit` handler that calls `preventDefault()` is proven not to strand the update, given that windows are already closed by then.
5. Any single-instance lock the app holds is released before `quitAndInstall` (guards electron#5163).
6. The affordance names the waiting version string, taken from the `update-downloaded` payload, not from a hardcoded label.

---

## 9. "A failed check stays out of the way": one missing listener crashes the main process

**Finding.** `AppUpdater` is an `EventEmitter`. An emitted `error` with no listener becomes Node's "Uncaught, unspecified 'error' event" and takes the main process down ([electron#2276](https://github.com/electron/electron/issues/2276), [electron-builder#8053](https://github.com/electron-userland/electron-builder/issues/8053), [electron-builder#3488](https://github.com/electron-userland/electron-builder/issues/3488)). The spec's "an update check that fails MUST leave the app running" is therefore not a UI requirement, it is a listener-registration ordering requirement.

Two related traps:

- `checkForUpdates()` returns a promise that in several reported cases never resolves; awaiting it hangs the caller. The documented pattern is to fire it and listen to events ([electron-builder#7447](https://github.com/electron-userland/electron-builder/issues/7447), community guidance in the same thread).
- Concurrent calls are handled internally: a second `checkForUpdates()` while one is in flight logs "Checking for update (already in progress)" and returns the existing promise. So an interval timer overlapping a slow check is safe, but only for the check, not for the download.

For logging, the docs say "Just set `logger`. electron-log is recommended (it is an additional dependency that you can install if needed)" ([Auto Update](https://www.electron.build/docs/features/auto-update/)). `apps/desktop/package.json` has no `electron-log`, so the change either adds it or supplies an object with `{ info, warn, error }`, which is all the interface the docs require.

**Acceptance criteria**

1. An `error` listener is attached before the first `checkForUpdates()` call, in the same module and unconditionally. A spec drives an `error` emission with no update in flight and asserts the process survives.
2. The logged failure carries both the reason and the feed address, per the spec scenario. Assert the log line contains the resolved feed URL, not just the message.
3. `checkForUpdates()` is never awaited on a path that blocks startup or blocks an IPC reply.
4. A network-down launch produces exactly one logged failure and zero dialogs, and the app reaches its normal ready state.
5. `logger` is set to something with `{ info, warn, error }` before the first check, so failures land in the same place a maintainer already looks.

---

## 10. The interval check re-downloads what it already has

**Finding.** Calling `checkForUpdates()` again after `update-downloaded` restarts the download of a version already on disk ([electron-builder#3003](https://github.com/electron-userland/electron-builder/issues/3003), [#5534](https://github.com/electron-userland/electron-builder/issues/5534)), and the second download clears the pending-update directory, discarding the first ([#2006](https://github.com/electron-userland/electron-builder/issues/2006), [#5029](https://github.com/electron-userland/electron-builder/issues/5029)). The spec mandates "check once at launch and repeat the check on an interval," which walks straight into this.

macOS makes it worse: Squirrel.Mac has no differential path, so every re-download is the whole application. ADR 0133 already accepts that cost once per update; the bug makes it once per interval.

Differential download on Windows falls back to a full download on any blockmap problem, which is noisy but not fatal ([electron-builder#6399](https://github.com/electron-userland/electron-builder/issues/6399), [#4358](https://github.com/electron-userland/electron-builder/issues/4358), [#8452](https://github.com/electron-userland/electron-builder/issues/8452)).

**Acceptance criteria**

1. Once `update-downloaded` has fired for version V, the interval check does not start another download for V. The guard lives in our code, not in electron-updater.
2. The interval timer does not keep the app awake or fire while the machine is asleep in a way that stacks checks. Assert one check per interval, not one per elapsed interval.
3. A "Cannot download differentially, fallback to full download" event is logged at info, not error, and does not surface to the person.
4. The interval value is a named constant with a stated reason, and it is long enough that a person who leaves the app open for a week does not generate a download per hour.

---

## 11. Staged rollout is not a rollback, and the semantics surprise people

**Finding.** Staged rollouts are configured "by manually editing your `latest.yml` / `latest-mac.yml`" with `stagingPercentage`, an integer greater than zero and at most 100. electron-updater derives eligibility from a random persistent per-installation GUID. The docs are explicit that this is one-way: "If you want to pull a staged release because it hasn't gone well, you must **increment the version number** higher than your broken release" ([Auto Update, electron-builder](https://www.electron.build/docs/features/auto-update/)).

A practical trap for anyone testing it: "Using `stagingPercentage: 100` will guarantee the client is part of the staged rollout. Using any other value almost guarantees the client will NOT be part of the rollout," which is why people file bugs like [electron-builder#3891](https://github.com/electron-userland/electron-builder/issues/3891) after seeing "Staging percentage: 0" and concluding the feature is broken.

`allowDowngrade` defaults to `false`, which is correct here and should stay.

**Acceptance criteria**

1. Editing `stagingPercentage` in the published `latest*.yml` is a documented release step with the 10 / 50 / 100 ladder ADR 0133 chose, and each step is a manual action on the published release.
2. Editing the manifest after publication does not change any artifact hash, so criterion 2.2 (hash equality) is asserted **before** the staging edit and the staging edit touches nothing else.
3. `allowDowngrade` stays `false`, asserted by a spec. A rollback is a new higher version, never a downgrade.
4. The runbook states plainly that a bad release cannot be recalled from anyone who already took it, only withheld from those who have not.

---

## 12. The draft release is the gate, and the feed contract is not ours

**Finding.** electron-updater's GitHub provider cannot see draft releases; a draft release triggers no release workflow and is not returned by the public endpoints it reads ([GitHub community discussion #26954](https://github.com/orgs/community/discussions/26954)). `.github/workflows/release.yml` line 99 creates the release with `--draft`, so publishing it is the moment an update reaches anyone. That is a real property worth an assertion, not just an ADR sentence.

The feed contract has broken before without warning: on 28 January 2023 GitHub stopped honoring `Accept: application/json` on `https://github.com/{org}/{repo}/releases/latest`, returning HTML instead and breaking electron-updater plus several other installers, until GitHub reverted about a day later ([GitHub community discussion #45590](https://github.com/orgs/community/discussions/45590)). The lesson is not "avoid GitHub"; it is that a check failure can be entirely external and must not be treated as a defect in the app.

**Acceptance criteria**

1. A draft release produces no update for any installed copy. Verifiable in a self-hosted or manual pass by pointing a packaged build at a draft.
2. Publishing the draft makes the update available with no further action, and the release runbook names publication as the ship moment.
3. A malformed or non-JSON feed response is logged with the reason and the URL and leaves the app running, exactly like a network failure (guards discussion #45590).
4. `ERR_UPDATER_CHANNEL_FILE_NOT_FOUND` and `ERR_UPDATER_ZIP_FILE_NOT_FOUND` are treated as ordinary failed checks, not as crashes ([electron-builder#5562](https://github.com/electron-userland/electron-builder/issues/5562), [#4942](https://github.com/electron-userland/electron-builder/issues/4942)).

---

## 13. Prior art for the standing affordance

VS Code is the closest shipped analogue: a badge on the manage gear plus a "Restart to Update" item. Its bug tracker is a list of the ways this pattern goes wrong, and each one maps to a criterion:

- The badge shows an update that is not there, and the menu then says "no updates available" ([vscode#160530](https://github.com/microsoft/vscode/issues/160530), [vscode#99020](https://github.com/microsoft/vscode/issues/99020)).
- "Restart to update" closes the app and does not update or restart ([vscode#298179](https://github.com/microsoft/vscode/issues/298179)).
- The badge appears in only one window ([vscode#30178](https://github.com/microsoft/vscode/issues/30178)), which is the multi-window form of the spec's "outlives navigation."
- A pending update plus a newer one needs two restarts ([vscode#268531](https://github.com/microsoft/vscode/issues/268531)).

**Acceptance criteria**

1. The affordance appears if and only if an update is downloaded and staged. It never appears on `update-available` alone.
2. The affordance names the version, and that version equals what the app reports after the restart. A "restarted and nothing changed" outcome is a failure, not a no-op.
3. If a second, newer update arrives while one is staged, the affordance names one version and one restart reaches it (guards vscode#268531).
4. The affordance is reachable and announced to a screen reader wherever it lives, and it is not the only path to the information.

---

## 14. Where the sources conflict or the evidence is thin

1. **`--publish never` versus the ADR's claim that manifests already ship.** electron-builder's docs say the channel files are generated only when publishing. ADR 0133 says they have shipped since 0035. I could not resolve this without inspecting a published release, which is outside what I will fetch. This is the one item to check first, because everything else depends on it.
2. **`quitAndInstall` signature.** The docs site documents a `QuitAndInstallOptions` object; electron-updater 6.x, which pairs with the pinned electron-builder `26.15.3`, ships `(isSilent, isForceRunAfter)`. Read the installed `.d.ts`, not the website.
3. **Base64 versus hex sha512 in manifests.** The troubleshooting page says "as of version 27, manifests should use base64-encoded checksums." The repo is on 26.x. I did not confirm what 26.x emits, and a mixed-version release could produce a mismatch that reads like corruption.
4. **SignPath plus electron-builder has no vendor recipe.** SignPath documents PowerShell and Web API integration; electron-builder documents a custom `sign` hook. Nobody documents the two together. The glue script is ours and it is untested prior art.
5. **Store policy 10.2.5's self-update prohibition is scoped to games and Xbox products**, not to a non-gaming Win32 app. The general "install and update only through the Store" phrasing circulating in secondary sources is not what version 7.19 of the policy says for our case. Treat the Store-channel requirement as a design choice we make, not a rule Microsoft imposes on us.
6. **I did not read the main-process entry point or the IPC contract**, so I cannot say whether the existing push-event transport replays state to a renderer that mounts late. Criterion 8.3 may already be satisfied.
7. **The macOS "downloads but never installs on 13+" cluster** is community-diagnosed across many issues with no single root cause and no vendor statement. I list it as a risk to test for, not as a defect with a known fix.

---

## Recommendation

Order the work by what fails silently and irreversibly.

**First, before any code:** resolve item 1. If `--publish never` really suppresses the channel files, the change has a pipeline problem before it has a feature, and switching to `--publish onTagOrDraft` reshapes the `build` and `draft` jobs in `.github/workflows/release.yml`.

**Second:** make the sha512-versus-artifact check a workflow gate (criterion 2.2). It is cheap, it catches the signing-order mistake that would otherwise ship a release nobody can update to, and it catches the arch-overwrite mistake at the same time.

**Third:** treat these three as non-negotiable because each guards a failure that reaches users with no error on screen:

- **The `error` listener is attached before the first check.** Without it, a failed check is not "out of the way," it is a dead main process (criterion 9.1).
- **The staged affordance is state, not an event.** A renderer that mounts after `update-downloaded` must still see the waiting version, or the spec's "outlives navigation" requirement is decorative (criterion 8.3).
- **macOS refuses to update outside Applications and says nothing.** Detect it with `app.isInApplicationsFolder()` and say so (criterion 5.4).

**One scope question the change should answer before implementation:** which Microsoft Store route recompose takes. Under policy 10.2.9 the Store hands out a signed `.exe` and the resulting install is indistinguishable from a GitHub download, `process.windowsStore` stays `undefined`, and the requirement "the Store owns a Windows install" cannot be satisfied as written. Under an appx or MSIX submission the flag works as ADR 0133 assumes. The two routes produce different acceptance criteria and only one of them is currently specified.

---

## Sources

- [Auto Update, electron-builder](https://www.electron.build/docs/features/auto-update/)
- [Troubleshooting, electron-builder](https://www.electron.build/docs/troubleshooting/)
- [AppUpdater API, electron-builder](https://www.electron.build/docs/api/electron-updater.Class.AppUpdater/) and [BaseUpdater API](https://www.electron.build/docs/api/electron-updater.class.baseupdater/)
- [macOS target and notarization, electron-builder](https://www.electron.build/docs/mac/)
- [Code Signing for Windows, electron-builder](https://www.electron.build/docs/features/code-signing/code-signing-win/)
- [Code Signing, Electron](https://www.electronjs.org/docs/latest/tutorial/code-signing)
- [process API, Electron](https://www.electronjs.org/docs/latest/api/process)
- [Microsoft Store Policies version 7.19, published 10 September 2025, effective 14 October 2025](https://learn.microsoft.com/en-us/windows/apps/publish/store-policies)
- [SignPath build system integration](https://about.signpath.io/documentation/build-system-integration) and [SignPath Foundation conditions for open source projects](https://signpath.org/terms.html)
- [Doyensec, Signature Validation Bypass Leading to RCE In Electron-Updater, 24 February 2020](https://blog.doyensec.com/2020/02/24/electron-updater-update-signature-bypass.html)
- [Doyensec, Building a Secure Electron Auto-Updater, 16 February 2026](https://blog.doyensec.com/2026/02/16/electron-safe-updater.html)
- Manifest and signing: [electron-builder#2111](https://github.com/electron-userland/electron-builder/issues/2111), [#6848](https://github.com/electron-userland/electron-builder/issues/6848), [#7004](https://github.com/electron-userland/electron-builder/issues/7004), [#1773](https://github.com/electron-userland/electron-builder/issues/1773), [#7983](https://github.com/electron-userland/electron-builder/issues/7983), [#5580](https://github.com/electron-userland/electron-builder/issues/5580), [#3667](https://github.com/electron-userland/electron-builder/issues/3667)
- NSIS elevation: [electron-builder#712](https://github.com/electron-userland/electron-builder/issues/712), [#5644](https://github.com/electron-userland/electron-builder/issues/5644), [#6312](https://github.com/electron-userland/electron-builder/issues/6312), [#6425](https://github.com/electron-userland/electron-builder/issues/6425)
- macOS: [electron-builder#8914](https://github.com/electron-userland/electron-builder/issues/8914), [#5592](https://github.com/electron-userland/electron-builder/issues/5592), [#7356](https://github.com/electron-userland/electron-builder/issues/7356), [#7121](https://github.com/electron-userland/electron-builder/issues/7121), [#7054](https://github.com/electron-userland/electron-builder/issues/7054), [#3983](https://github.com/electron-userland/electron-builder/issues/3983), [electron#36640](https://github.com/electron/electron/issues/36640), [electron#7357](https://github.com/electron/electron/issues/7357), [Squirrel.Mac#252](https://github.com/Squirrel/Squirrel.Mac/issues/252)
- Linux AppImage: [electron-builder#4046](https://github.com/electron-userland/electron-builder/issues/4046), [#8698](https://github.com/electron-userland/electron-builder/issues/8698), [#2200](https://github.com/electron-userland/electron-builder/issues/2200), [AppImageLauncher#314](https://github.com/TheAssassin/AppImageLauncher/issues/314)
- quitAndInstall: [electron#5289](https://github.com/electron/electron/issues/5289), [electron#5163](https://github.com/electron/electron/issues/5163), [electron#8418](https://github.com/electron/electron/issues/8418), [electron#25626](https://github.com/electron/electron/issues/25626), [electron#50200](https://github.com/electron/electron/issues/50200), [electron-builder#3402](https://github.com/electron-userland/electron-builder/issues/3402), [electron-builder#5127](https://github.com/electron-userland/electron-builder/issues/5127)
- Error handling and repeated downloads: [electron#2276](https://github.com/electron/electron/issues/2276), [electron-builder#8053](https://github.com/electron-userland/electron-builder/issues/8053), [#3488](https://github.com/electron-userland/electron-builder/issues/3488), [#7447](https://github.com/electron-userland/electron-builder/issues/7447), [#3003](https://github.com/electron-userland/electron-builder/issues/3003), [#5534](https://github.com/electron-userland/electron-builder/issues/5534), [#2006](https://github.com/electron-userland/electron-builder/issues/2006), [#5029](https://github.com/electron-userland/electron-builder/issues/5029)
- Differential download: [electron-builder#6399](https://github.com/electron-userland/electron-builder/issues/6399), [#4358](https://github.com/electron-userland/electron-builder/issues/4358), [#8452](https://github.com/electron-userland/electron-builder/issues/8452)
- Staged rollout: [electron-builder#3891](https://github.com/electron-userland/electron-builder/issues/3891), [#3499](https://github.com/electron-userland/electron-builder/issues/3499)
- Feed and drafts: [GitHub community discussion #45590](https://github.com/orgs/community/discussions/45590), [#26954](https://github.com/orgs/community/discussions/26954), [electron-builder#5562](https://github.com/electron-userland/electron-builder/issues/5562), [#4942](https://github.com/electron-userland/electron-builder/issues/4942)
- Affordance prior art: [vscode#160530](https://github.com/microsoft/vscode/issues/160530), [vscode#99020](https://github.com/microsoft/vscode/issues/99020), [vscode#298179](https://github.com/microsoft/vscode/issues/298179), [vscode#30178](https://github.com/microsoft/vscode/issues/30178), [vscode#268531](https://github.com/microsoft/vscode/issues/268531)
