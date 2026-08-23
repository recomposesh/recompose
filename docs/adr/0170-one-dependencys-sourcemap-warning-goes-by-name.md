# 0170: One dependency's sourcemap warning goes by name

**Status**: Accepted
**Date**: 2026-08-23

## Context

`zbsearch` reaches the site through `fumadocs-core/search/client/orama-static`, which is how the
docs search reads its static index. Every file the package ships carries a `sourceMappingURL`, and
every map beside it names `../../src/*.ts` under `sources` while carrying no `sourcesContent`. The
package publishes no `src` tree, so those files resolve to nothing.

Vite reads a served module's map to inject the sources a debugger needs. When a source is missing it
warns once per file. The search client pulls in 46 of them, so `pnpm dev` printed 46 lines of
`Sourcemap for "…" points to missing source files` on the first server render. The lines a developer
starts the server to read sat under the pile.

## Decision

**A `customLogger` drops the message when it names `zbsearch`, and passes every other warning
through.** The filter matches the package name together with the warning text. A broken map in the
site's own code still reaches the terminal, and so does one in a package the site can act on.

**Pre-bundling the dependency is the answer upstream gives, and no environment took it.**
`optimizeDeps.include` on the client environment left Vite serving the raw files. The same option
under `ssr` failed to resolve `zbsearch` at all, since the site depends on it only through
`fumadocs-core`, and naming the chain as `fumadocs-core > zbsearch` resolved without changing the
count. The site renders through Nitro, which owns a third Vite environment, and pre-bundling there
left the same 46 lines.

**Externalizing it moves a dev annoyance into the deployed server.** `ssr.external` also left the
count at 46. Marking a package external asks the built server to resolve it at runtime, which is a
real change to what ships, bought for a warning nobody can act on.

## Consequences

`pnpm dev` starts quiet. A sourcemap warning from anything other than `zbsearch` still prints.

The filter reads the message text, so a Vite release that rewords the warning lets those 46 lines
back in. That's a loud failure rather than a silent one. The lines reappear, and the fix is to match
the new wording, or to drop the filter once the package publishes its sources.

Nothing about bundling, externals, or the built output changes.
