# 0133: An update arrives through the channel that installed it

**Status**: Accepted
**Date**: 2026-08-16

## Context

Record 0035 shipped the release pipeline and deferred everything that needs trust to a phase B it
never scheduled: signing, notarization, and automatic updates. Until now a person on any platform
updated recompose by downloading it again. The accounts that blocked phase B have since arrived, so
the deferral has nothing left to stand on.

Research across the ecosystem settled the facts this record turns on.

The packaging had already chosen the updater. recompose builds with electron-builder and publishes
to GitHub Releases, so `latest*.yml` and `.blockmap` have shipped with every release since 0035.
`electron-updater` reads exactly those files. Electron's own `autoUpdater` wants `Squirrel.Windows`,
which `electron-updater` doesn't support and which the Nullsoft Scriptable Install System (NSIS)
target rules out.

Automatic updates carry different requirements per platform. `Squirrel.Mac` refuses to update an app
that carries no signature and no notarization. It also takes the update from the `zip` artifact even
when a person installed the `dmg`. NSIS updates run unsigned and then verify nothing. AppImage
updates need no certificate at all. The deb and rpm updaters shell out to the system package tool,
so they ask for a password.

The Windows certificate market decided the rest. Azure Artifact Signing is the cheapest path and the
best integrated, and it asks for three years of verifiable business history. The organization behind
recompose is six months old. SignPath Foundation signs qualifying open-source projects for nothing.
recompose already meets its conditions: an Open Source Initiative (OSI) license with no commercial
dual-licensing, a public repository, and verifiable automated builds from source. The Microsoft Store
re-signs a submitted `appx` package with a Microsoft certificate, and it charges nothing to register.

## Decision

**Every install updates through the channel that installed it.** One rule settles Linux and the two
Windows channels at once, and the platforms already enforce it. An update path that crosses channels
either fights a package manager or ships a second copy of the app.

**`electron-updater` owns the channels recompose distributes itself.** The direct downloads from
GitHub Releases on all three platforms, and nothing else. It arrives as a runtime dependency rather
than a build-time one, because the packaged app loads it.

**Two runtime flags switch it off where another channel owns the update.** `process.windowsStore`
means the Store installed this copy, so the Store updates it. On Linux the updater runs only when
`process.env.APPIMAGE` carries a value, which leaves a deb install to apt. Neither case counts as an
error, and neither reports one.

**macOS signs and notarizes under the organization's Developer ID.** `mac.notarize` comes on and the
`APPLE_*` secrets bind in the release workflow. The `zip` target stays beside `dmg` whatever the
artifact list looks like, because removing it breaks the update path of the dmg beside it.

**macOS builds universal.** Two architectures produced in separate runs overwrite each other's
`latest-mac.yml`, and the surviving manifest strands the other architecture. One universal artifact
carries one manifest, and it also closes the Intel gap that 0035 left open.

**Windows gets two channels, and both are free.** Microsoft signs an `appx` package during Store
certification. SignPath Foundation signs the existing NSIS installer for the direct download.
Neither covers the other. The Store's signature never touches the file on GitHub Releases, and
Microsoft asks Win32 installers bound for the Store to carry a signature already.

**`win.publisherName` reads `SignPath Foundation`.** The foundation holds the certificate rather than
the project, and `electron-updater` compares the downloaded installer's certificate subject against
this value before installing. A name chosen for appearances would refuse every update.

**A draft release stays the publishing gate.** `electron-updater` can't see a draft, so the human
click that 0035 asked for is now the moment an update reaches anyone. The gate costs nothing extra
and gained a second job.

**A staged rollout is the only rollback there is.** `stagingPercentage` in the published manifest
moves an update out at 10, then 50, then 100. A shipped version never comes back and only gives way
to a higher one, so the percentage is where a bad release stops.

## Alternatives

- **Electron's built-in `autoUpdater` with `update.electronjs.org`.** Rejected. The service is free
  and it fits a public repository, but it wants `Squirrel.Windows` and Electron Forge. Migrating the
  whole packaging layer to reach a service buys nothing that `electron-updater` misses today.
- **Azure Artifact Signing.** Rejected on the three-year business history rule rather than on price
  or fit. It stays the first candidate to revisit when the organization qualifies.
- **A paid certificate from Certum or SSL.com.** Deferred as the backup if SignPath declines. A
  fresh certificate earns SmartScreen trust by download volume, so paying would buy a weaker
  reputation than the foundation's shared certificate already carries.
- **The Microsoft Store as the whole Windows answer.** Rejected. It leaves the installer on GitHub
  Releases unsigned, and that file is the one most people download.
- **Shipping Windows updates unsigned with verification turned off.** Rejected. It works, and it
  turns write access on the release repository into the only thing standing between a reader and
  code execution on their machine.
- **Automatic updates for the deb.** Rejected. The updater exists, it prompts for a password, and it
  duplicates what apt is for.
- **A self-hosted update server.** Rejected. GitHub Releases already serves the manifests, and
  nothing here needs per-user channels or a license check.

## Consequences

**Good**: a person stops reinstalling recompose to update it. macOS loses the Gatekeeper right-click
along with the update problem, on an account the project already pays for. Windows gains two signed
channels for nothing, and one of them never meets SmartScreen. The draft release that 0035 kept for
a human's last look becomes the switch that publishes an update.

**Bad, and accepted**: Windows names SignPath Foundation as the publisher while macOS names the
organization, which reads as two authors to anyone who checks both. Two Windows channels need the
same version at the same time. A person who finds a newer copy on the channel they skipped learns
that the two drifted. macOS downloads the whole application on every update, because `Squirrel.Mac`
carries no differential path. SignPath asks for a published code signing policy, defined author and
reviewer roles, and a manual approval per release, so a release gains a step. The Store adds a
certification review between a tag and its Windows package, and that review answers on its own
schedule.
