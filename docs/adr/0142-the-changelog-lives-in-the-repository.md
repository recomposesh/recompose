# 0142: The changelog lives in the repository

**Status**: Accepted
**Date**: 2026-08-18

## Context

The release pipeline drafts every release with `--generate-notes`, so the only changelog anywhere
is a raw pull-request title dump with renovate noise. The site's changelog links point at the
GitHub releases listing. The download surface (record 0141) puts a release pill on `/download`
whose changelog link needs a destination the project actually writes.

## Decision

**Curated markdown is the source of truth.** Each release gets
`apps/web/content/changelog/<version>.md` with `version` and `date` frontmatter. The body opens
with a prose paragraph, then `Features`, `Fixes`, and `Breaking changes`, empty sections omitted.
The files pass Vale like any authored markdown.

**The release wears the curated text.** On `release: published`, a workflow requires the entry
for the published version and fails loud without it. With it, the workflow replaces the release
body with the curated text plus a single "Full commit log" compare link. Generated notes stop
being the release's face. The job shares one workflow with record 0141's redirect-rules update,
and the two fail on their own.

**The site renders the same files.** `/changelog` shows the latest entry and
`/changelog/<version>` each one, every version statically prerendered under record 0111.
`/changelog.xml` serves an Atom feed built from the same entries. Retroactive entries cover
v0.2.0 and the v0.3.0 draft.

## Alternatives

- **Keep generated notes and filter the noise in the renderer**: pull-request titles speak to
  contributors, not users. No filter turns "close every rider the first engine round left open"
  into a user-facing sentence.
- **Curate directly in the GitHub release body**: leaves the changelog outside the repository,
  outside Vale, and invisible to the static site at build time.
- **A changelog generator from Conventional Commits**: the commit log encodes intent for
  reviewers. Record 0035 already chose generated notes over a release bot, and this record
  replaces the generated text with a human's, not with a different machine's.

## Consequences

**Good**: one authored text serves the site, the feed, and the release. The prose gate covers it.
A release can't publish with an empty face unnoticed, because the sync fails loud.

**Bad**: publishing gains a manual step, since the entry must merge before the release publishes,
and a forgotten entry turns into a red workflow run instead of a blocked publish. The two
retroactive entries interpret history by hand and need the maintainer's review.
