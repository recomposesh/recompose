# Solution design

## Header and change linkage

- Change id: landing-docs-site
- Schema: recompose
- Proposal: [proposal.md](proposal.md)
- Specs: [specs/website/spec.md](specs/website/spec.md)
- Discovery: [discovery/](discovery/)
- Tasks: [tasks.md](tasks.md)

## Context

recompose ships a desktop application and publishes nothing about it. A person who hears the
name reaches a repository page, and the only writing about the product addresses the people
building it. This change stands up the first public surface: one application at `apps/web`
holding a landing page and a documentation shell, built to static files and served from
Cloudflare.

The landing page isn't a blank canvas. A working prototype already carries the hero: an
orchestra in the dark, revealed under the pointer by a brush of light, with three spotlights
tracking the cursor. It runs as a WebGL pipeline over four hundred lines of plain
JavaScript, with the video and its poster frame embedded as base64 modules. That embedding
exists to satisfy the browser's origin check when the page opens from a local disk, and a served
page has no such check.

So the hero work is a port with three repairs, not a design. The repairs are the weight, the
lifecycle, and the reach. The documentation work is a shell with two example pages in it,
because writing the real documentation is its own change.

## Discovery inputs consumed

- Code map, `design-system/` absent: changed the token approach outright. The proposal claimed a
  shared token source that `.gitignore` excludes, so locked decision 5 now has the site owning
  its palette and the file map carries no token package.
- Code map, `probity.config.ts` glob `apps/*/src/**`: the edit-time test-first gate reaches
  `apps/web/src` with no config change. This drove the decision to pull the hero's motion
  math as a pure module, so there is something a failing test can drive.
- Code map, `.vale.ini` binds `[*.md]` only: drove the choice to author the example pages as
  `.md` rather than `.mdx`, and the task that moves the Vale version and the glob together.
- Code map, `turbo.json` outputs `dist/**` and `out/**`: adds the emitted directory to the task
  graph, or every run rebuilds the site uncached.
- Code map, `.dependency-cruiser.cjs` keys every rule on `^apps/desktop/`: the spec's ban on
  importing the desktop application becomes a new forbidden rule rather than an existing one.
- Code map, `hig-doctor.config.json` runs over `apps`: `apps/web` enters the Human Interface
  Guidelines gate automatically, so locked decision 9 needs an ignore entry to take effect.
- Research, single-page application mode against static prerendering: changed the build mode from one setting to
  two. That mode prerenders one shell by design. Only static prerendering emits a document per
  route, which is what the first requirement asks for.
- Research, TanStack Start defect 6787 on static server functions: kept server functions out of
  the design entirely rather than reaching for the experimental middleware.
- Research, Cloudflare Pages in maintenance for new work: chose Workers static assets.
- Research, Vite `assetsInlineLimit` defaults to 4096 bytes: confirmed the base64 weight comes
  from the prototype's import style, not from a bundler default, so plain files fix it.
- Acceptance references, success criterion 2.2.2: surfaced the accessibility gap the maintainer
  then ruled on. Recorded in locked decision 6 rather than designed around.
- Acceptance references, the download's four blockers: moved the download out of scope and into
  locked decision 8.
- Acceptance references, Cloudflare `not_found_handling`: the single-page-application setting
  turns every broken link into a 200 answer, so the design pins `404-page`.
- Acceptance references, documentation pages sit behind a catch-all route: automatic path
  discovery finds none of them, so the prerender list derives from the content source.
- Mobbin, Cloudflare AI Gateway documentation: the dialect selector row shaped how a later
  documentation page should show one request in two dialects. Consulted, no impact on this
  change, because the example pages predate that need.
- Rider 153, continuous integration concurrency and the visual baseline tolerance: consulted, no
  impact. This change adds no visual baseline and takes the serialized lane as it stands.
- Rider 118, the CodeQL workflow path list: the gate widening touches the same file, so those
  two edits need serializing rather than running in parallel.

## Goals and non-goals

**Goals:**

- One application at `apps/web` that emits a document for every published route.
- A landing page carrying the ported hero, working from a served origin rather than a disk.
- A documentation shell with a navigation tree, a browser-side search index, and two example
  pages.
- Every gate that applies to a second application applying to this one, with none weakened.

**Non-goals:**

- The real documentation set. Two example pages prove the shell; the writing is its own change.
- A working download button. Locked decision 8 defers it, and the landing page links to the
  releases page instead.
- Any change to the desktop application, the engine, or the contracts package.
- Shared design tokens or a token package. Locked decision 5 rules it out.
- A pause control on the hero. Locked decision 6 records the maintainer's ruling and the gap it
  leaves against a level A criterion.
- Licensed hero footage and a resolved typeface license. Both stay open and neither blocks the
  build.

## Constraints and invariants

- TypeScript at maximum strictness: `strict: true` plus `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`,
  `noPropertyAccessFromIndexSignature`. No `any`, no `as` casts to silence errors, no
  `@ts-ignore` or `@ts-expect-error` without a comment explaining why.
- Never write code comments. Code explains itself through naming and structure. The sole
  exception is a constraint the code genuinely can't express.
- Never disable, override, loosen, or silence any gate. A blocking gate is a design signal.
  Adding a rule or making one stricter is welcome; never weaken one.
- Gates run once at the end of authoring, and findings get fixed in one batch.
- Test code changes if and only if behavior changes.
- Never use an em dash in authored prose.
- Feature-Sliced Design doesn't bind this application. Locked decision 9 keeps `apps/web`
  outside that gate, so Fumadocs' own file layout governs placement.
- No published route may register a server function.

## Design

### The shape

Three pieces stand in `apps/web`, and they share only a Vite build.

1. **The documentation shell.** Fumadocs supplies the layout, the navigation tree, and the
   search index. Its content loader reads `content/docs` through the Fumadocs content plugin for Vite,
   so the pages compile into the bundle rather than arriving over a request.
2. **The landing page.** One route, holding the ported hero and the sections beneath it.
3. **The build contract.** Static prerendering emits one document per route, and a check
   asserts that against the emitted directory rather than against a running server.

### The build mode, which is two settings and not one

TanStack Start carries two features that sound alike and answer different questions. Single-page
application mode prerenders one shell and expects the host to rewrite unmatched paths to it.
Static prerendering emits one document per route and follows crawled links to find them.

The first requirement asks for a document per route, so static prerendering is the load-bearing
setting. The shell stays on as the fallback for a path no document covers. Fumadocs' own static
configuration turns both on together, which is the right shape.

Two traps follow, and both are silent:

- Every documentation page sits behind a catch-all route. Automatic path discovery skips routes
  carrying path parameters, so it finds none of them. The prerender page list derives from the
  content source, and a page nothing links to never gets emitted.
- The search route is the one place the framework invites a server handler. Static search needs
  three changes together: `staticGET` on the server side, the static client on the browser side,
  and the search path in the prerender list. Miss any one and the build still succeeds while
  search fails at runtime.

Because both failures are invisible in a browser with JavaScript on, the check runs against the
emitted directory in continuous integration, never as a manual pass.

### The hero port

The prototype is a canvas, a render loop, and two shader programs. The port keeps the shaders
verbatim and changes what surrounds them.

**Weight.** The video and poster ship as plain files under `public/`. That drops
fourteen megabytes of base64 out of the bundle and recovers the encoding's inflation. The loop
stays under the host's twenty-five mebibyte per-file ceiling with room, so no media service
enters the design.

**Lifecycle.** The prototype starts a render loop and a resize listener and never stops either.
Inside a router that survives navigation, that leaks. The mount returns a disposer that cancels
the frame request and removes the listener. The hero also stops painting when it leaves the
viewport, watched through an intersection observer, so scrolling to the documentation link
doesn't leave a WebGL loop running behind it.

**Reach.** Three behaviors the prototype doesn't have:

- Where no pointer reaches the hero, the reveal wanders the scene on its own.
- A refused playback holds the still frame rather than sitting dark. The browser may refuse for
  reasons the page can't detect, so the design treats the play promise as a real result.
- The hero watches the reduced-motion preference for the life of the page. It doesn't read the
  preference once at mount.

**Dead code found in the prototype.** The composite shader carries a `protect` path that dims
the light behind the text, driven by `u_shades`. Nothing ever fills the rectangle array that
feeds it, so every frame writes zeros and the feature has never run. The port either wires it to
the heading and paragraph elements or removes it. This design removes it: the text already
carries a shadow that answers the same problem, and an unproven feature isn't a thing to port.

**The testable core.** The motion math is a pure function. It takes the previous head and aim
positions, the pointer, and the elapsed time, then produces the next positions. Pulling it out
of the render loop gives the edit-time test-first gate something to drive. It also leaves the
WebGL calls as a thin shell, and makes the wandering behavior an input rather than a branch.

### The palette

The site defines its own tokens in its own stylesheet. Fumadocs ships a theme layer whose
variables a Tailwind `@theme` block can redefine. The documentation therefore takes the site's
palette through a mapping rather than through a fork of the preset.

## Data model and contracts

None. The site holds no entities, no state transitions, and no storage. Its only contract is the
emitted directory, which the build-output check asserts against.

## Error handling

The site has one runtime failure worth modeling, and it belongs to the hero.

- **Playback refused.** The play promise rejects. The hero holds the poster frame and the reveal
  keeps answering movement. This is an expected state, not a thrown surprise.

Build-time failures fail the build rather than emitting a partial site. A prerender error stops
the build. A missing document for a content page fails the output check.

## File map

- `apps/web/package.json`: the workspace member manifest, its scripts named to match the task
  graph (create)
- `apps/web/vite.config.ts`: the Vite build, the TanStack Start plugin, the prerender
  configuration, and the Fumadocs content plugin (create)
- `apps/web/tsconfig.json`: extends the repository's strict base (create)
- `apps/web/source.config.ts`: the Fumadocs content source definition (create)
- `apps/web/wrangler.jsonc`: the assets-only Worker, its directory and its not-found handling
  (create)
- `apps/web/src/routes/__root.tsx`: the root route and the Fumadocs provider (create)
- `apps/web/src/routes/index.tsx`: the landing route (create)
- `apps/web/src/routes/docs/route.tsx`: the documentation layout (create)
- `apps/web/src/routes/docs/$.tsx`: the documentation page catch-all (create)
- `apps/web/src/lib/source.ts`: the content loader the routes and the prerender list read
  (create)
- `apps/web/src/hero/hero-motion.ts`: the pure motion state, the one piece under test (create)
- `apps/web/src/hero/hero-motion.test.ts`: its behavior specs (create)
- `apps/web/src/hero/hero-canvas.tsx`: the canvas element, the mount, and the disposer (create)
- `apps/web/src/hero/shaders.ts`: the trail and composite programs, carried across verbatim
  (create)
- `apps/web/src/styles/main.css`: the Tailwind entry, the site palette, and the Fumadocs
  variable mapping (create)
- `apps/web/public/orchestra-loop.mp4`: the hero loop as a plain file (create)
- `apps/web/public/poster.jpg`: the first frame, serving as the poster (create)
- `apps/web/content/docs/index.md`: the introduction page (created already)
- `apps/web/content/docs/connecting-a-client.md`: the second example page (created already)
- `apps/web/scripts/check-output.mts`: asserts a document per route, no server function manifest,
  and a search index in the emitted directory (create)
- `apps/web/e2e/features/website/`: where the approved scenarios graduate. The Gherkin skill
  names a desktop path, which predates a second application, so a web capability graduates
  beside the application that owns it (create)
- `apps/web/e2e/steps/website-hero.steps.ts`: the steps answering `hero.feature` (create)
- `apps/web/e2e/steps/website-documentation.steps.ts`: the steps answering
  `documentation.feature` (create)
- `apps/web/e2e/steps/website-serving.steps.ts`: the steps answering `serving.feature` (create)
- `apps/web/e2e/playwright.config.ts`: the suite over a plain static server, holding no
  application runtime (create)
- `turbo.json`: the emitted directory joins the build outputs (modify)
- `pnpm-workspace.yaml`: exclude entries for the packages whose releases outrun the supply chain
  window (modify)
- `mise.toml`: Vale moves to 3.18.0 or later, which reads the documentation format natively
  (modify)
- `.vale.ini`: a section naming the `.mdx` extension (modify)
- `.oxlintrc.json`: the second Tailwind entry point (modify)
- `.oxfmtrc.json`: the second stylesheet for class sorting (modify)
- `.dependency-cruiser.cjs`: a forbidden rule stopping `apps/web` from reaching
  `apps/desktop` (modify)
- `knip.json`: a workspace block naming the site's entry points and its generated route tree
  (modify)
- `hig-doctor.config.json`: an ignore entry keeping `apps/web` out of that gate (modify)
- `.github/workflows/ci.yml`: the site joins the check job (modify)
- `.github/workflows/deploy-web.yml`: the deployment a merge triggers (create)
- `docs/adr/0104-the-public-site-builds-to-files.md`: the stack and build-mode record (create)

## Interfaces

- Consumes: the Fumadocs content loader (`loader` from `fumadocs-core/source`), the Fumadocs UI
  layout components, the TanStack Start route primitives, and the browser's canvas, pointer, and
  media element APIs.
- Produces: `heroMotionStep(previous: HeroMotion, input: HeroMotionInput): HeroMotion` as the
  pure motion transition; `mountHero(canvas: HTMLCanvasElement, options: HeroOptions): () => void`
  returning its disposer; and the emitted static directory, which is the contract the output
  check reads.

## Decisions

### 1. Static prerendering carries the build, and the shell stays only as a fallback

Single-page application mode alone prerenders one shell, which fails the first requirement while
looking correct in any browser with JavaScript on. Turning both on gives a document per route
and keeps a fallback for unmatched paths.

**Alternatives considered:** single-page application mode alone, rejected because it emits one
document and the requirement asks for one per route. Server-side rendering at request time,
rejected because it forfeits locked decision 3.

**Architecture decision record draft:** `docs/adr/0104-the-public-site-builds-to-files.md`

### 2. No route holds a server function, and the build output proves it

The framework offers build-time server functions, and the feature carries an open defect where
they re-execute on every visit rather than only at build. Reading the content through the Vite
plugin inside client loaders needs no such function.

**Alternatives considered:** the static server function middleware, rejected because it's
experimental and carries that open defect. A code review promise instead of a check, rejected
because the search route is exactly where the framework invites a handler back in.

### 3. The hero's motion math leaves the render loop

The edit-time test-first gate reaches `apps/web/src` through a glob it already carries. A render
loop that reads the pointer, mutates state, and issues draw calls in one function gives that gate
nothing to drive. A pure transition function does, and it makes the wandering reveal an input
rather than a branch.

**Alternatives considered:** porting the loop as one function, rejected because it leaves the
only logic in the change untested. Narrowing the probity glob to exempt the site, rejected
because it weakens a gate for convenience.

### 4. The dead protect path leaves the port

The composite shader dims light behind the text, driven by a rectangle array nothing ever fills.
The feature has never run. Porting it would carry an unproven code path into a new application,
and the text shadow already answers the legibility problem.

**Alternatives considered:** wiring it to the heading and paragraph elements, rejected because
nobody has established that the effect is worth having. Every review of the prototype happened
while the path wrote zeros.

### 5. The example pages are `.md`, not `.mdx`

The prose gate binds a `*.md` glob today. Authoring the examples as `.mdx` would ship two pages
nothing lints. Neither page wants JSX. The Vale version and the glob still move in this change,
so the first page that does want JSX lands on a gate that reads it.

**Alternatives considered:** `.mdx` from the start, rejected because it opens the silent pass
before the gate closes it.

## Test matrix

| Layer          | What this layer proves (or why none)                                                                                                                                                                                                                    | Check command                                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Unit           | The hero's motion transition: the aim positions follow the head with their own lag, the trail decays rather than accumulating, the wandering path advances when no pointer reports, and a reduced-motion input stills the loop while leaving the reveal | `pnpm --filter @recompose/web run test`          |
| Integration    | The emitted directory: one document per published route including every content page, a search index present and queryable, and no server function manifest                                                                                             | `pnpm --filter @recompose/web run test:output`   |
| End-to-end     | The served output over a plain static file server: the crossing from landing to documentation, search returning a result, the reveal answering pointer movement, and a reduced-motion preference holding a still hero. Semantics only, never appearance | `pnpm --filter @recompose/web run test:e2e`      |
| Property       | The motion transition's invariants: the aim positions stay bounded regardless of pointer input, and the trail value never rises without an input. Each law pairs with a deterministic twin, because a property test never carries mutation duty alone   | `pnpm --filter @recompose/web run test`          |
| Mutation scope | The motion module and the output checker, the only two pieces of logic in the change. The routes and the layout hold no branches worth mutating                                                                                                         | `pnpm --filter @recompose/web run test:mutation` |

## Task decomposition hooks

- Task 1: the workspace member and its build (depends on: none, hands off: a building
  `apps/web` with an empty landing route)
- Task 2: the gate widening (depends on: task 1, hands off: every gate reading the new
  application, and Vale reading the documentation format)
- Task 3: the hero motion module and its specs (depends on: task 1, hands off:
  `heroMotionStep`)
- Task 4: the hero canvas, the shaders, and the disposer (depends on: task 3, hands off:
  `mountHero`)
- Task 5: the media as plain files, the poster, and the playback fallback (depends on: task 4,
  hands off: a hero that holds its frame when the browser refuses playback)
- Task 6: the documentation shell, the source loader, and the static search (depends on: task 1,
  hands off: a documentation tree the prerender list reads)
- Task 7: the prerender list from the content source, and the output check (depends on: tasks 5
  and 6, hands off: a proven emitted directory)
- Task 8: the landing sections beneath the hero, and the link to the releases page (depends on:
  task 4, hands off: a complete landing route)
- Task 9: the deployment workflow and the Worker configuration (depends on: task 7, hands off: a
  deployed site)
- Task 10: the architecture decision record (depends on: task 7, hands off: the written record)

Tasks 3 and 6 run in parallel on disjoint files. Task 2 touches the repository root files alone.
The CodeQL workflow edit inside task 2 serializes against rider 118.

## Risks

- [Risk] The prerender list misses a content page, and the page never emits →
  Mitigation: the output check compares the emitted document set against the content source and
  fails on any page with no document.
- [Risk] The search route slips back into a server handler during a later refactor →
  Mitigation: the output check asserts no server function manifest in the emitted directory.
- [Risk] The hero footage stays unlicensed at launch → Mitigation: the clip is swappable by
  replacing one file under `public/`, so the licensed clip lands without touching code.
- [Risk] The typeface license forbids shipping the cached font files → Mitigation: the site
  loads the typeface through the vendor's embed rather than from the repository, and the four
  cached files never enter `apps/web`.
- [Risk] The supply chain window blocks a needed release for three days → Mitigation: the
  exclude entries land with the dependency rather than after a failed install.
- [Risk] A canvas end-to-end test proves appearance and turns flaky → Mitigation: the suite
  asserts semantics only, and the pointer-driven checks read state rather than pixel values.

## Migration and rollout

Nothing migrates. The site is new, it stores nothing, and no existing surface changes.

Rollout is a merge. The deployment workflow builds the site and uploads the emitted directory to
an assets-only Worker. Rollback is the host's previous version, because the emitted directory is
the whole artifact and nothing behind it holds state.

The deployment stays out of the release workflow. A published release doesn't yet change the
site, because locked decision 8 defers the download.

## Open questions

- Which host name the site answers on. It changes one Worker setting and no code.
- Whether the landing page carries a section beneath the hero in this change or a later one. The
  hero and the crossing to the documentation satisfy every requirement without it.

## End-to-end verification

Build the site, serve the emitted directory with a plain static file server holding no
application runtime, and drive it in a browser:

1. The landing route answers, and the hero reveals the scene as the pointer crosses it.
2. The link to the documentation opens a documentation page inside the same site.
3. Search returns a result for a word that appears only in the example pages.
4. A route nothing published answers with the site's own not-found document rather than a 200.
5. Turning on the operating system's reduced-motion preference stills the loop without a reload.

A fresh-context reviewer diffs the result against the three requirements in
[specs/website/spec.md](specs/website/spec.md), the ten locked decisions in
[proposal.md](proposal.md), and this document's file map.
