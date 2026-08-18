# Changelog surface design

Date: 2026-08-18
Status: Approved

## Context

The release pipeline creates every release with `--generate-notes`, so the release body is a raw pull-request title dump with renovate noise included. That dump is today the only changelog anywhere. The site has no changelog page, and the navigation's changelog links point at the GitHub releases listing. Two releases exist, the published v0.2.0 pre-release and the v0.3.0 draft, both wearing generated notes. The download surface design of the same date puts a release pill on `/download` whose changelog link needs a real destination, and its `release: published` workflow gives this design its trigger for free.

## Decisions

- **Curated markdown in the repository is the source of truth.** Each release gets `apps/web/content/changelog/<version>.md` (for example `0.3.0.md`) with `version` and `date` frontmatter. The body follows the design's shape: an opening prose paragraph, then `Features`, `Fixes`, and `Breaking changes`, with empty sections omitted. These files pass Vale like any other authored markdown.

- **The GitHub release body stops coming from a generator.** On `release: published`, a workflow requires `content/changelog/<version>.md` to exist and fails loud when it's missing. When it exists, the workflow replaces the release body with the curated text, keeping a single "Full commit log" compare link at the bottom. The generated notes stop being the release's face.

- **Retroactive entries cover v0.2.0 and the v0.3.0 draft.** Both derive from their pull-request lists, curated by hand into user-facing highlights rather than commit dumps. The maintainer reviews the prose.

- **Per-version routes, statically prerendered.** `/changelog` renders the latest entry, and `/changelog/<version>` renders each one. The left rail lists every version, newest first, grouped by month, with the current one highlighted. Record 0111 applies: no server functions, every version prerenders.

- **An Atom feed builds from the same entries.** `/changelog.xml` generates at build time from the curated files.

- **The changelog links move onto the site.** The navigation and footer changelog links and the download page's release pill changelog link point at `/changelog`. This supersedes the earlier note that kept them on the GitHub releases URL. `releasesUrl` in `src/lib/links.ts` stays only where an asset or release listing is genuinely meant.

- **One workflow serves both surfaces.** The download surface's redirect-rules update and this design's release-body sync live in the same `release: published` workflow as two jobs, each failing loud on its own.

- **The visual design is the `changelog / light` and `changelog / dark` frame pair in `designs/web.pen`.** Left version rail with month groups, right column with the big version number and a "latest" pill, meta rows, the opening prose, and numbered sections with dot bullets.

## Testing

- The changelog entry parser (frontmatter, opening prose, sections, items) carries Vitest specs written first.
- The feed proves itself against an Atom validator once, then the spec pins the shape.
- The release-body sync proves itself on the next published release.
- Both pages get looked at in both color schemes before they land.

## Out of scope

- Publishing the v0.3.0 draft or re-cutting its stale assets.
- A preview or beta release channel. The rail shows the one channel that exists.
- Backfilling entries for tags that never published.
