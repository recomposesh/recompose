# 0147: The license gate reads what a release installs

**Status**: Accepted
**Date**: 2026-08-20

## Context

[0035](0035-release-operations.md) put a license gate in front of every release leg and wrote
its contract as "no release ships with a license outside the allowlist." The script read the
whole workspace, `pnpm licenses list --prod --json`, and the
allowlist held twelve permissive Software Package Data Exchange (SPDX) identifiers.

That gate runs on a `v*` tag and nowhere else. Between the record and the first release, the
public site arrived and brought three production dependencies the allowlist refuses.
`@fontsource-variable/jetbrains-mono` ships under the Open Font License (OFL) 1.1. `gsap` and
`@gsap/react` ship under Webflow's standard no-charge terms for the GreenSock Animation
Platform (GSAP). pnpm reports those terms as free text rather than an identifier.
None of the three reaches a `.dmg`, an `.exe`, or a `.deb`. All three would have halted every
release leg before electron-builder started, on the first tag anyone pushed.

## Decision

**The gate reads the desktop app's production graph, not the workspace's.** The script runs
`pnpm --filter '@recompose/desktop...' licenses list --prod --json`. The trailing dots walk into
`@recompose/engine` and `@recompose/contracts` and pull their dependencies with them. A bare
`--filter @recompose/desktop` stops at the workspace link and misses `hono` and `js-tiktoken`,
which the engine serves every request through.

**The allowlist stays as [0035](0035-release-operations.md) wrote it.** Twelve identifiers, none
added. What an installer carries answers to the same bar it always did, and the site's
dependencies leave the gate rather than widen it.

## Alternatives

- **Adding the three licenses to the allowlist**: rejected. It widens the bar for the shipped
  binary to admit dependencies the binary never carries, and two of the three entries are free
  text pnpm rebuilds from each package's own `license` field, so a version bump retires the
  allowlist entry without telling anyone.
- **A second allowlist for the site**: rejected for now under You Aren't Gonna Need It (YAGNI).
  It answers a question nobody has asked, and the free-text problem follows it.
- **Dropping GSAP from the site**: rejected. The landing animation is a pinned scroll timeline
  over 265 lines, and the license permits this use. Webflow made GSAP free for commercial work
  in April 2025 and reserves refusal for tools that compete with its own visual animation
  builder, which recompose isn't.

## Consequences

**Good**: the gate's scope now matches the sentence [0035](0035-release-operations.md) wrote for
it, and the first release can build. Adding a dependency to the site never blocks a release
again, and adding one to the app still does.

**Bad, and accepted**: the site's production dependencies pass through no license check. Nothing
watches them, and a future site dependency under terms the project would refuse arrives unread.
The gate also still runs on tags alone, so any dependency the app adds surfaces its license at
release time rather than in the pull request that added it.

## References

- [Standard "No Charge" GSAP License](https://gsap.com/community/standard-license/)
- [Open Font License 1.1](https://openfontlicense.org/)
