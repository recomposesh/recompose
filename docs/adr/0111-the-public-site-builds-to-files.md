# 0111: The public site builds to files

**Status**: Accepted
**Date**: 2026-08-14

## Context

recompose had no public surface. This change stands one up at `apps/web`: a landing page and a
documentation shell, built once and served as files.

Two questions shaped it. Which stack carries a documentation site next to an Electron
application, and what exactly "static" means once a framework offers three ways to be it.

The renderer already runs TanStack Router 1.170, Tailwind 4.3, React 19.2, and Vite 8. Fumadocs
asks a TanStack Start site for that same set, supports the adapter officially, and marks its
`next` peer optional. A command confirmed all three before this change wrote a line.

The second question turned out to be the load-bearing one. TanStack Start carries two features
that sound alike. Single-page application mode prerenders one shell and expects the host to
rewrite unmatched paths to it. Static prerendering emits one document per route. The
distinction is invisible in a browser with JavaScript on, which is what makes it dangerous: a
site can look complete and ship one document.

## Decision

**The stack is TanStack Start carrying Fumadocs.** It reuses the router, the styling engine, and
the bundler the repository already runs.

**Static prerendering carries the build, and single-page application mode stays off.** Measured
rather than assumed: with it on, the landing route never received its own document and fell back
to `_shell.html`, and naming `/` in the prerender list changed nothing. With it off, all three
routes emitted their own document, and a plain static file server answered every one.

**No published route registers a server function.** The official template's documentation route
rides `createServerFn` with `staticFunctionMiddleware`, an experimental package carrying an open
defect where the function re-executes per visit. The route reads its content through the
content plugin in a client loader instead.

**The emitted directory is the contract, and a check reads it.** Not a dev server, and not a
review promise.

## Alternatives

- **Next.js carrying Fumadocs**: rejected. It's the better trodden Fumadocs path and would put
  a second framework family in a repository that runs one.
- **Single-page application mode alone**: rejected by measurement. One document where the first
  requirement asks for one per route.
- **The experimental static server function middleware**: rejected. Experimental, and carrying a
  defect that defeats the purpose it would serve here.
- **A separate repository for the site**: rejected. It would buy independent release timing and
  charge a second copy of the brand assets and every gate that guards them.

## Consequences

**Good**: the site has no runtime to be down. Deployment is an upload, rollback is the previous
upload, and nothing behind either holds state. The stack reuses knowledge the repository already
has, and the emitted directory is checkable rather than trusted.

**Bad**: the documentation route lost the copy-as-markdown affordance the template ships, which
rode the same server function. Static search downloads its whole index to the browser, which is
free at three pages and needs a budget before it isn't. Automatic path discovery skips the
documentation catch-all, so the page list derives from the content source and a page nothing
links to is a page nothing emits.

**Risks**: TanStack Start's own overview still describes itself as a release candidate while its
published version reads 1.168. The stack rests on that. Mitigation is the output check, which
fails on a build that stops emitting documents.

## Related decisions

- [0009](0009-two-tier-design-tokens.md): rejected a shared token package while recompose had one
  consumer. A second consumer now exists and still doesn't want it, so the site carries its own
  palette and that record stands.
