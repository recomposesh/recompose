# 0146: The site deploys from CI on two triggers

**Status**: Accepted
**Date**: 2026-08-20

## Context

[0111](0111-the-public-site-builds-to-files.md) decided the public site builds to files, and
nothing ever deployed them: recompose.sh answered 522 from placeholder Domain Name System (DNS)
records. The build
itself had drifted from that record too, because the prerender switch was never wired and
`vite build` emitted a node server with no documents in the public directory.

## Decision

**The build prerenders every published route and proves it.** The prerender list derives from
the content source in `apps/web/scripts/published-paths.mts`, and link crawling covers the
rest. A prerender error fails the build. After every build, `scripts/check-output.mts` asserts
a document per route, the markdown twins, the search index, the atom feed, and the not-found
document. It also asserts that the single-page fallback stays out.

**An assets-only Worker serves the emitted directory.** `apps/web/wrangler.jsonc` points at
`.output/public`, pins `not_found_handling` to `404-page`, and carries the apex custom domain.
A `/404` route emits that document, and the search route answers with the static export,
because the emitted file is the whole index.

**One workflow deploys on two triggers.** `deploy-web.yml` runs on a merge to main that touches
the site, on a manual dispatch, and by call from `release-surfaces.yml` after a release
publishes. The called run bakes the fresh version and date into the release pill. This revises
the landing-docs-site design note that kept deployment out of the release workflow: the release
pill made a published release change the site.

## Alternatives

- **Deploying the node server as a Worker**: rejected. [0111](0111-the-public-site-builds-to-files.md)
  chose files, and a runtime reintroduces everything that record removed.
- **Cloudflare Pages**: rejected during the change's research. Pages sits in maintenance for
  new work, and Workers static assets is the successor.
- **Prerendering the not-found document without a route**: rejected by measurement. The
  prerenderer refuses a 404-status response and emits nothing, so a real `/404` route carries
  the document.

## Consequences

**Good**: deployment is an upload and rollback is the previous version. A broken emitted
directory never deploys, because the output check gates the workflow. Both triggers share one
job, one secret pair, and one halt message.

**Bad**: a visit to a missing path hydrates the served 404 document under an address the router
can't match. The browser console prints a hydration warning while the identical screen
re-renders. Accepted until TanStack Start carries a first-class static not-found document. The
workflow reuses `CF_API_TOKEN` and needs it widened with the account-level Edit Cloudflare
Workers template, and it halts while the secret is empty, naming the fix. Wrangler reads the
account from the token, so a token that sees more than one account needs `account_id` pinned in
`wrangler.jsonc`. The apex custom domain can't attach while the placeholder DNS record stands,
so the maintainer deletes that record once before the first deploy.
