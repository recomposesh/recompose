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
4. **The first release carries the landing page and one or two example documentation pages.**
   The pages exist to prove the shell: the navigation tree, the search index, the prose gates,
   and the crossing from the landing page. Writing the real documentation is its own change,
   and holding this one open until that writing lands would keep a finished site unshipped.
5. **The site owns its palette and shares no tokens.** The repository has no shared token
   package to read. `design-system/` at the root sits under `.gitignore`, so it never reaches a
   build, and the tokens that do exist live inside the one application the site must not import
   from. The hero already carries its own palette, and Fumadocs brings a theme for the
   documentation, so a shared package would exist to serve an agreement neither surface is
   asking for yet. Architecture decision record 0009 rejected that package while recompose had
   one consumer. A second
   consumer now exists and still doesn't want it, which is worth recording rather than
   assuming the record has expired.
6. **The hero ships as the prototype behaves, and it carries no pause control.** Success
   criterion 2.2.2 of the Web Content Accessibility Guidelines asks for a mechanism to pause,
   stop, or hide moving content that starts on its own, runs past five seconds, and sits beside
   other content. The loop runs 12.4 seconds behind the product claim and the download, so the
   criterion applies and a reduced-motion preference doesn't discharge it. The maintainer read
   that and chose the prototype's behavior. This records a known gap against a level A
   criterion, so a later reader finds a decision rather than an oversight. The still frame for a
   reduced-motion preference stays.
7. **A device with no pointer gets a reveal that wanders on its own.** A touch visitor then
   meets the scene rather than a dark rectangle. That wandering is itself motion nobody asked
   for, so it widens the gap decision 6 records rather than narrowing it.
8. **The download affordance waits, and the landing page points at the releases page.** Four
   facts stand between the promise and a working button: every artifact name carries the
   version, `release.yml` opens releases as drafts that the latest-release link can't see, a
   browser-side call to the GitHub interface allows sixty requests an hour for every visitor
   behind one address, and the disk image name holds no architecture. Resolving those edits the
   release workflow, which is its own change rather than a corner of this one.
9. **`apps/web` stays outside the Feature-Sliced Design and the Human Interface Guidelines
   gates.** Fumadocs imposes its own file layout, and laying a second methodology over it would
   set two rule sets against one directory. The guidelines gate judges a macOS application, which a
   marketing page isn't. Every other gate applies. The edit-time test-first gate reaches the new
   application through the `apps/*/src/**` glob it already carries, and narrowing that glob
   would weaken a gate for no reason anyone has given.
10. **The documentation stays in a format the prose gate can already read.** The gate binds a
    `*.md` glob, so a page authored as `.mdx` would pass it vacuously. Vale reads that format
    natively from version 3.18.0, which isn't released: the newest build is 3.17.1, from
    2026-08-05. The earlier reading of the vendor's page mistook forward-looking documentation
    for a shipped feature. Every page therefore stays `.md`, which Fumadocs renders all the
    same, and the format question reopens when 3.18.0 lands. Standing up the external
    converter the older versions need would install machinery for content nobody has written.

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

The desktop application doesn't change, and no file moves out of it. `apps/web` imports nothing
from `apps/desktop` and carries its own palette, so the two surfaces can drift. Realigning them
later costs a deliberate pass over both, and this change accepts that bill.

Two questions stay open into discovery. The hero footage is a graded test clip, and a public
launch needs licensed stock through the same crop, grade, and loop chain. The Typekit kit that
serves the brand typeface answers only the domains it names, and it blocks rendering from a
third party origin. Both the production domain and the self hosting terms need an answer.
