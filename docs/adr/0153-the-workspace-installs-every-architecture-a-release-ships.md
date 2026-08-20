# 0153: The workspace installs every architecture a release ships

**Status**: Accepted
**Date**: 2026-08-21

## Context

Every macOS build printed the same warning and nobody read it:

```
platform-specific optional dependencies not bundled — add them to your project's
optionalDependencies (pnpm 10+ does not auto-install transitive platform binaries)
dependencies=["@koromix/koffi-darwin-x64@3.1.4", "@node-wreq/darwin-x64@3.1.0", ...]
```

`koffi` and `node-wreq` are native, and the engine loads both on every request. Each publishes one
package per platform and lists them as its own optional dependencies. pnpm installs only the ones
matching the machine it runs on, and it stopped following those lists transitively at version 10.

The macOS runner is arm64 and the release builds both architectures on it. So the Intel disk image
carried no `koffi` and no `node-wreq` binary, while `electron-builder.yml` unpacks both out of the
archive as though they were there. That artifact would have installed and then failed on the first
request, and the run before this record was the run that would have published it.

`node-wreq`'s platforms were already named in `optionalDependencies`, which wasn't enough: naming
a package doesn't make pnpm install it for a platform the machine isn't.

## Decision

**`supportedArchitectures` names what the release ships.** `pnpm-workspace.yaml` asks for `darwin`,
`win32` and `linux` across `x64` and `arm64`, which is pnpm's own answer for packaging toward more
than one target. `koffi`'s four platform packages join `node-wreq`'s in the desktop app's
`optionalDependencies`, so both libraries state their needs the same way.

**The watchdog looks where the hang is.** The sampler from
[0152](0152-signing-stops-waiting-on-a-revocation-answer.md) reported no `codesign` process at all
during a hang, which ends every signing theory this repository has tried. It now dumps the process
table and samples the `electron-builder` process itself, so the next hang names its own stack.

## Alternatives

- **Building each architecture on its own runner**: rejected. It doubles the macOS legs and the
  notarization to sidestep a setting pnpm publishes for this.
- **Listing every platform `koffi` offers**: rejected. FreeBSD, OpenBSD, loong64 and riscv64 stay
  out, because the release ships none of them and the warning about them is correct.
- **Reading the warning as noise**: rejected by what it said. It named the two packages the app
  can't run without.

## Consequences

**Good**: the Intel disk image carries its native libraries, and a build for any platform the
release names can find them. The next hang arrives with a stack.

**Bad, and accepted**: every install now pulls binaries for platforms the developer isn't on, which
costs disk and a little install time on every machine and every CI leg. The warning also stays in
the log for the platforms the release doesn't ship, so a future reader still has to know which
names matter.
