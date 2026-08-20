# 0150: The release build signs without a network monitor

**Status**: Accepted
**Date**: 2026-08-20

## Context

The first signed release hung. `v0.3.0` built Linux and Windows in under four minutes each, and
the macOS leg sat for twenty-four minutes producing nothing until a person cancelled it.

The log names the moment. `codesign` opened at 19:26:39 against the Developer ID identity, and
`/usr/bin/security` asked for `ocsp2.apple.com` one second later, which is the certificate
revocation check every signature makes. Its lookup left for `192.168.64.1` on port 53. That
address is the network monitor's own resolver, installed by `step-security/harden-runner`. The
monitor recorded three file writes from `codesign`, then nothing at all for twenty-three minutes,
while unrelated system daemons kept resolving names.

The action gave macOS nothing in exchange. Its step carried `if: runner.os == 'Linux'`, so the
hardening never ran there. A step condition doesn't reach an action's pre entry point. The monitor
therefore installed itself on every runner in the matrix, took over name resolution, and stood in
the path of the one network call signing can't skip. The August 2 release passed the
same step in six seconds because it built unsigned, with `notarize: false`, so `codesign` never
reached out at all.

## Decision

**The release build carries no network monitor.** The `harden-runner` step leaves `release.yml`.
Signing and notarization both need Apple, and nothing may sit between them.

**The build job takes a 45 minute limit.** A hang cost twenty-four minutes of a person's evening
and would have run to GitHub's six hour default. The limit turns the next one into a failed job
within the hour.

`ci.yml` and the other workflows keep their `harden-runner` steps. The release also keeps the
gates that guard what it ships: the license allowlist, the Software Bill of Materials (SBOM), and
the build provenance and SBOM attestations.

## Alternatives

- **Splitting the matrix so Linux keeps the monitor**: rejected. It copies the whole build into a
  second job to preserve an audit-only log on one of three legs.
- **Keeping the step and giving the monitor an allowlist**: rejected. `egress-policy: audit` blocks
  nothing already, so an allowlist answers a policy that isn't refusing anything, and the failure
  sits in name resolution rather than in a verdict.
- **Turning off the revocation check**: rejected. `codesign` decides that, not the workflow, and a
  signature that skips revocation is a worse artifact than a slower build.

## Consequences

**Good**: macOS signs against Apple over the runner's own network, and a future hang fails inside
an hour instead of holding a runner for six.

**Bad, and accepted**: the release build no longer writes an egress audit for its Linux leg. That
record existed on one leg of three and refused nothing, so what it bought was a log nobody read
during an incident. Evidence for the diagnosis is circumstantial: the hang, the resolver address
and the silence line up, but no run has yet proven the build green without the monitor. The next
tag is that proof.
