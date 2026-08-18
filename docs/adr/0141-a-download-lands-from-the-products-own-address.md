# 0141: A download lands from the product's own address

**Status**: Accepted
**Date**: 2026-08-18

## Context

Installers live as versioned assets on GitHub releases (`Recompose-<version>-<arch>.dmg`,
`Recompose-<version>-setup.exe`, `Recompose-<version>.AppImage`, `Recompose_<version>_amd64.deb`),
so every link to one rots on the next publish. The public site builds to plain files (record 0111)
and can't resolve "latest" at request time. Docs, the README, and the site all need one download
address that survives releases.

## Decision

**recompose.sh owns a permanent URL contract.** `/download` is the page. `/download/mac-arm64`,
`/download/mac-x64`, `/download/windows`, `/download/linux-appimage`, and `/download/linux-deb`
redirect to the current release's real versioned assets on GitHub.

**Always 302, never 301.** The target changes on every release, and browsers and intermediaries
would cache a permanent redirect to a stale asset forever.

**A workflow on `release: published` rewrites Cloudflare Redirect Rules.** A sibling of
`homebrew-bump.yml` reads the release's assets through `gh api`, derives the five targets, and
replaces one ruleset through the Cloudflare API using `CF_API_TOKEN` (ruleset-write scope only)
and `CF_ZONE_ID`. It fails before writing when an expected asset is missing or a secret is absent.
After writing, it verifies each URL answers 302 to the expected asset.

**The page detects the operating system, never the architecture.** A pure helper maps the
browser's identification string to mac, Windows, or Linux and picks the primary buttons. The full
platform list below always renders, so a wrong guess costs one scroll.

## Alternatives

- **Stable-named duplicate assets on `releases/latest/download`**: forces a second unversioned
  copy of every installer, doubling storage and attestation surface while the update manifests
  still name the versioned files.
- **A runtime redirect Worker**: reintroduces the server record 0111 removed and puts the GitHub
  API on the hot path.
- **Client-side resolution through the GitHub API**: Cross-Origin Resource Sharing rules plus the
  60 requests per hour unauthenticated limit break the first download behind any shared address.
- **Browser architecture detection**: Safari reports Intel even on Apple Silicon, so the one
  platform with two artifacts is the one the browser lies about. Two labeled macOS buttons
  replace the guess.

## Consequences

**Good**: docs and READMEs link addresses that never rot. The site stays static. The redirect
layer is data, replaced as one unit per release and verified before the workflow goes green.

**Bad**: downloads now depend on Cloudflare answering for the zone, and the redirect targets go
stale if the workflow fails after a publish. The loud failure plus self-verification make that
state visible rather than silent. The two secrets don't exist yet, so the workflow fails on every
publish until the maintainer creates them.
