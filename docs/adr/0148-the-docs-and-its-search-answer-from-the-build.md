# 0148: The docs and its search answer from the build

**Status**: Accepted
**Date**: 2026-08-20

## Context

[0146](0146-the-site-deploys-from-ci-on-two-triggers.md) put the site behind an assets-only Worker,
and two surfaces kept asking a server that no longer stands there.

The `/docs/$` route called a server function from its loader. A visitor who typed the address got
the prerendered document, which carries the loader's answer inside it, so the call never happened
and the page looked healthy. A visitor who clicked "docs" got a live call to `/_serverFn/`, read
the 404 document back, and landed on the not-found screen. Clicking a page in the sidebar raised
the error boundary the same way. Every route into the documentation broke the moment anyone used
a link.

Search had the mirror of that fault. `/api/search` emits the whole index as a file, and the client
that ships by default asks that address to run the query. It answered with the index, the dialog
tried to map over it, and the page died on `e?.map is not a function`.

## Decision

**The docs loader answers from the build.** `staticFunctionMiddleware` from
`@tanstack/start-static-server-functions` runs the function during prerender and writes one JSON
answer per page under `__tsr/staticServerFnCache`. A client-side navigation reads the file. The
middleware has to stand last in the chain.

**Search runs in the browser.** `staticClient` from `fumadocs-core/search/client/orama-static`
downloads the exported index once and queries it in the page. A small dialog composed from the
search primitives carries it, because `RootProvider` reaches for the address-asking client
whenever a caller names no dialog of its own.

**The output check proves both.** `check-output.mts` counts the cached answers against the
published docs pages and fails when the build leaves any page to call a server. A spec pins the
search client to one download and no query address.

## Alternatives

- **Deploying the app as a server-side rendering Worker**: rejected. Cloudflare's own framework
  guide names it the recommended shape for TanStack Start, and it would make both faults vanish
  with no static machinery. It also reverses [0111](0111-the-public-site-builds-to-files.md) and
  [0146](0146-the-site-deploys-from-ci-on-two-triggers.md), puts a runtime under a site that
  serves documents, and buys nothing this site asks for. Both vendors ship a static mode, and
  those modes are what this record uses.
- **Dropping the server function and reading the source in the loader**: rejected. It works,
  because the page data already reaches the browser for the content component, but it hand-rolls
  what the framework offers and drags the whole page tree into the first bundle.
- **The `type="static"` prop on the search dialog that ships with the library**: rejected. It does
  the same work in one prop, and the library deprecates it and asks callers to compose the dialog
  themselves.

## Consequences

**Good**: every link into and inside the documentation works, and search answers without a server.
The site stays files, so [0111](0111-the-public-site-builds-to-files.md) and
[0146](0146-the-site-deploys-from-ci-on-two-triggers.md) stand as written. A build that forgets
either piece fails its own check rather than reaching a visitor.

**Bad, and accepted**: the first search downloads the whole index before it answers, which grows
with the documentation. `@tanstack/start-static-server-functions` pins to a version whose peer
range names the `@tanstack/react-start` this repository holds, so the two move together from here.
A page added to the documentation without a prerender entry gets no cached answer, and the output
check is what says so.
