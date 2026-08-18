# Download surface design

Date: 2026-08-18
Status: Approved

## Context

The public site builds to plain files (record 0111), and the app's installers live as versioned assets on GitHub releases. Every download link today points at the GitHub releases page. The product's own domain never hands anyone an installer, and every deep link rots the moment a new version publishes. The `homebrew-bump` workflow already listens to the `release: published` event and reads the release's asset list, so the event and the asset naming contract both exist. Browser architecture detection is off the table: Safari reports Intel even on Apple Silicon. Client-side resolution against the GitHub API is also out. The unauthenticated limit is 60 requests per hour per address, and the endpoint sits behind Cross-Origin Resource Sharing (CORS) rules the site can't control.

## Decisions

- **A permanent URL contract lives on recompose.sh.** Once published, these paths never change:
  - `/download` renders the page.
  - `/download/mac-arm64` answers 302 to `Recompose-<version>-arm64.dmg`.
  - `/download/mac-x64` answers 302 to `Recompose-<version>-x64.dmg`.
  - `/download/windows` answers 302 to `Recompose-<version>-setup.exe`.
  - `/download/linux-appimage` answers 302 to `Recompose-<version>.AppImage`.
  - `/download/linux-deb` answers 302 to `Recompose_<version>_amd64.deb`.

  Targets are the real versioned assets on `github.com/recomposesh/recompose` releases. Always 302, never 301: browsers and intermediaries cache a permanent redirect, and the target changes on every release.

- **A workflow on `release: published` rewrites Cloudflare Redirect Rules.** A sibling of `homebrew-bump.yml` reads the release's asset list through `gh api`, derives the five targets, and replaces one Cloudflare Redirect Rules ruleset through the Cloudflare API. It fails before writing anything if an expected asset is missing from the release. After writing, it verifies itself: a `curl -I` against each public URL must answer 302 to the expected asset. The site redeploy on release publish will hang off the same workflow later. Deploy tasks 9.x in `openspec/changes/landing-docs-site/tasks.md` stay open, and this design doesn't build the deploy.

- **Two secrets gate the workflow: `CF_API_TOKEN` and `CF_ZONE_ID`.** The token carries ruleset-write scope only. Neither secret exists yet. The workflow fails loud when either one is absent instead of skipping in silence.

- **The page stays fully static.** Record 0111 holds: no server functions. Every button is a plain `href` to a `/download/<target>` URL.

- **The page detects the operating system, never the architecture.** A pure helper maps the browser's identification string to `'mac' | 'windows' | 'linux'` and decides which primary block renders. macOS shows two labeled buttons (Apple Silicon primary, Intel secondary), Windows shows one button plus a SmartScreen note, and Linux shows AppImage primary plus a Debian and Ubuntu secondary. The helper's Vitest spec comes first. The full platform list below the fold always renders regardless of detection, so a detection failure costs nothing.

- **The release pill bakes at build.** The page reads `import.meta.env.VITE_RELEASE_VERSION` and `VITE_RELEASE_DATE`. When they're absent it renders the pill without them. No fetches, no fallback version. Wiring the variables into continuous integration belongs to the later deploy task.

- **One typed module owns the target URLs.** `src/lib/download-targets.ts` exports the `/download/<target>` constants, so the docs Installation page can link the same values in a later docs pass. All landing download buttons (hero, nav, footer, closing section) point at `/download`, never at an asset and never at the GitHub releases listing. `gitHubUrl` and `releasesUrl` stay in `src/lib/links.ts` for links that genuinely mean the repository or a release listing.

- **The visual design is the `download / *` frame set in `designs/web.pen`.** Navigation, release pill (green dot, version and date, changelog link), the two-tone headline, subline, platform-primary buttons, and requirements microcopy. Below the fold: the "other platforms" box with colored platform tiles (Apple ink, Windows `#0078D4`, Linux Tux `#FCC624`, Ubuntu `#E95420` with the circle-of-friends mark), the full-width "prefer the terminal?" brew card, and the landing footer. Bezier cables with port dots sit behind the hero, with stronger alphas in dark. The three new platform colors land in the `@theme` block as tokens, not as inline hex.

## Rejected alternatives

- **Stable-named duplicate assets on `releases/latest/download`.** GitHub's `latest/download/<name>` path only works when the asset name never changes, which forces uploading a second, unversioned copy of every installer. Double storage, double attestation surface, and the updater manifests would still name the versioned files.
- **A runtime redirect Worker.** A Worker that resolves the latest release per request reintroduces a server the static-site decision removed. It also adds a GitHub API dependency on the hot path and needs its own cache invalidation story.
- **Client-side resolution through the GitHub API.** CORS plus the 60 requests per hour unauthenticated limit make the first download of a busy hour fail for everyone behind one office address.
- **Browser architecture detection.** Safari reports Intel on Apple Silicon, so the one platform with two artifacts is exactly the one the browser lies about. Two labeled buttons beat one wrong guess.

## Testing

- The detection helper and the download-target module carry Vitest specs written first.
- The workflow proves itself on the next published release. Preflight fails on the stale v0.3.0 draft asset list until the tag is re-cut with per-architecture disk image names, and the post-write verification curls each public URL.
- The page gets looked at in both color schemes before it lands.

## Out of scope

- The Cloudflare zone setup and the two secrets' creation.
- The site deploy pipeline (tasks 9.x of the landing-docs-site change).
- The docs Installation page edits. Its release links switch to the `/download` targets in a later docs pass.
