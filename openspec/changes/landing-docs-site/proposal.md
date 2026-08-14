## Why

recompose has no public face. The desktop application builds, signs, and ships, and a person
who hears the name has nowhere to go. No page says what the product does, and the only download
link anyone can follow is a release asset on a repository page.

The writing that exists was never written for that person. One hundred and three architecture
decision records, fourteen capability specs, and a parity ledger sit in the repository. Every
one of them addresses the people building recompose. None of them tells someone who installed
it how to connect an account, what a virtual model is, or why a gateway sits in front of one.

So the product ships to an audience it never introduces itself to, and the only writing about
it answers questions that audience never asked.

## What changes

A new application stands in the repository at `apps/web`. It holds both public surfaces: the
landing page a person arrives at, and the documentation that person reads after installing.
One application, one build, one deployment.

The landing page opens on the hero already built as a prototype. A symphony orchestra sits in
the dark, the pointer reveals it with a brush of light, and three spotlights track the cursor
from above. The prototype runs as a canvas and a render loop, so the port carries the pipeline
across rather than rebuilding it. The work is the mount, the teardown, and the weight.

The weight is where the prototype can't ship as it stands. It embeds its video and its poster
frame as base64 modules, because a page opened from a local disk fails the browser's origin
check on plain media files. A served page has no such check, so both become plain files and
fourteen megabytes leave the bundle.

The documentation opens on a first set: installing recompose, connecting a provider, and what a
virtual model is. Fumadocs supplies the layout, the navigation, and the search index. The
content faces the same prose gates as every other document in the repository, because people
write it rather than a generator.

Neither surface asks for a server. The site builds to files, and a content delivery network
answers every route.

## Locked decisions

1. **The site lives in the monorepo at `apps/web`.** The workspace, the task graph, and the
   gate suite already stand. A separate repository would buy independent release timing and
   charge a second copy of the design tokens, the brand assets, and the gates that guard them.
2. **TanStack Start carries Fumadocs.** The renderer already runs TanStack Router, Tailwind 4,
   React 19, and Vite, which is the exact set Fumadocs asks a TanStack Start site for. Fumadocs
   supports the adapter officially. Next.js is the better trodden Fumadocs path and would put a
   second framework family in a repository that has one.
3. **The build is static and the host is Cloudflare.** Nothing on either surface needs a
   request answered at runtime. A route that reaches for a server function forfeits this, so no
   route may hold one.
4. **The first release carries the landing page and a first documentation set.** A documentation
   shell holding nothing drags on the page and on the search index.

## Capabilities

### New capabilities

- **A landing page.** The hero, the product claim, and a download a person can act on.
- **A documentation site.** A first set of pages, a navigation tree, and search that runs in
  the browser.
- **A published site.** One build, static output, and a deployment a merge triggers.

### Modified capabilities

- **The repository gates.** Linting, prose, spelling, dependency, and license checks widen to
  cover a second application.

## Impact

The desktop application doesn't change. `apps/web` shares the design tokens under
`design-system/` and imports nothing from `apps/desktop`.

Two questions stay open into discovery. The hero footage is a graded test clip, and a public
launch needs licensed stock through the same crop, grade, and loop chain. The Typekit kit that
serves the brand typeface answers only the domains it names, and it blocks rendering from a
third party origin. Both the production domain and the self hosting terms need an answer.
