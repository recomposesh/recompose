# Acceptance references for `landing-docs-site`

## 0. Scope and stated gaps

Repository reads: `openspec/changes/landing-docs-site/proposal.md`, `.../specs/website/spec.md`, `.../manifest.md`, `.../discovery/code-map.md`, `openspec/changes/archive/2026-08-08-gateway-virtual-models/discovery/acceptance-references.md` (voice reference), `package.json`, `apps/desktop/electron-builder.yml`, plus greps over `.vale.ini` and `.github/workflows/release.yml`. Three gaps I could not close and am not guessing at:

- **The hero prototype is not in the tree.** The code map already records this at `designs`: greps for a canvas render loop and for base64 media returned nothing. Every hero criterion below is written against the behaviour the spec describes, not against code anyone has read. The port needs a second pass once the prototype lands.
- **I could not confirm whether TanStack/router#4798 (SPA-mode prerender emits only the shell) is still open or was fixed in a later release.** I read the issue's summary through search, not its current state.
- **`design-system/`, which the proposal and `BRAINSTORM-NOTES.md` both name as the shared token source, does not exist** (Glob over `design-system/**` returned nothing). The tokens sit in `apps/desktop/src/renderer/src/app/styles/`, the one application the spec forbids the site to import from. That is a spec-versus-tree conflict the design arm owns, but it blocks the criterion "carrying the same brand and typeface".

## 1. The finding that outranks everything else

**The spec's Requirement 1 and the Fumadocs maintainer's recommended deployment path contradict each other, and the spec is the stricter of the two.**

The spec says: "The build MUST emit a document for every route the site publishes, and serving the emitted directory over static hosting alone MUST answer every one of them."

The Fumadocs maintainer's guidance for CDN hosting is SPA mode. In [fumadocs discussion #2442](https://github.com/fuma-nama/fumadocs/discussions/2442) (Oct 2025) he wrote "If you're deploying to platforms like S3, I think you're actually looking for SPA mode instead of pre-rendering," and by Oct 22 to 31 2025 had shipped official SPA templates for React Router and TanStack Start that resolved the reporter's Netlify deploy. A community reply on [TanStack/router discussion #5478](https://github.com/TanStack/router/discussions/5478) dated 2026-06-26 points at the template "Tanstack Start SPA: Fumadocs MDX (not RSC)" with a working example on Cloudflare Workers.

SPA mode does not satisfy the spec. [TanStack/router#4798](https://github.com/TanStack/router/issues/4798) reports that in SPA mode "prerendering additional pages doesn't result in html files with their proper content. Only the root route gets rendered," and that the only file in `dist/client` is `_shell.html`. The same discussion carries the counter-path: bcheung, 2025-12-05, "if you want full SSG (no SPA mode at all with blank index.html shell page), you can just use static prerendering."

So the acceptance test the spec already wrote ("static hosting serves the emitted directory with no application runtime behind it, then every published route answers with its own document") is exactly the test that separates the two configurations. Write it as a build-output assertion, not a manual check, because the difference between a passing and a failing build here is invisible in a browser that has JavaScript on.

**Second-order trap in the same area.** [TanStack Start static prerendering docs](https://tanstack.com/start/latest/docs/framework/react/guide/static-prerendering) state that `autoStaticPathsDiscovery` excludes "Routes with path parameters (e.g., `/users/$userId`) since they require specific parameter values". The Fumadocs TanStack Start install ([manual installation, TanStack Start](https://www.fumadocs.dev/docs/manual-installation/tanstack-start)) puts every documentation page behind a catch-all at `routes/docs/$.tsx`. Automatic discovery therefore finds zero documentation pages. The page list has to be enumerated from the content source or reached through `crawlLinks`, and a page that no link points at is silently never emitted.

## 2. What the search index costs, stated by the vendor

Fumadocs' default search route is a server handler: `createFromSource(source)` serving GET at `routes/api/search.ts`. For a static build the [Orama search docs](https://www.fumadocs.dev/docs/headless/search/orama) require three changes at once, and the TanStack Start example is given verbatim:

- server: `GET: async () => server.staticGET()` instead of `GET`
- client: `staticClient` from `fumadocs-core/search/client/orama-static` instead of `fetchClient`
- vite: `prerender: { enabled: true }` with `pages: [{ path: '/api/search' }]`

Miss any one and the build still succeeds while search 404s against a route that no longer exists at runtime. The vendor's own caveat: "Static Search requires clients to download the exported search indexes" and "For large docs sites, it can be expensive." For the first documentation set (installing, connecting a provider, what a virtual model is) that cost is negligible, and the criterion worth writing now is a budget that trips before it stops being negligible.

## 3. Cloudflare, where the static assumption meets the host

- **Per-file ceiling 25 MiB, unchanged.** [Increased static asset limits changelog, 2025-09-02](https://developers.cloudflare.com/changelog/post/2025-09-02-increased-static-asset-limits/): free plan 20,000 assets per Worker version, paid and Workers for Platforms 100,000, requiring Wrangler 4.34.0 or higher; "The individual file size limit of 25 MiB remains unchanged for all customers." The fourteen megabytes the proposal moves out of the bundle land under that ceiling with room, but the number belongs in a criterion so the licensed replacement clip does not quietly cross it.
- **Trailing slashes are a host decision that the build has to match.** [Cloudflare static site generation routing](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/) defaults `html_handling` to `auto-trailing-slash`: individual files such as `foo.html` serve without a trailing slash, folder index files such as `foo/index.html` serve with one. TanStack's `autoSubfolderIndex` defaults to emitting `/page/index.html`. One canonical form, links written in it, no redirect chain on internal navigation.
- **Do not reach for `not_found_handling = "single-page-application"` on a prerendered site.** That setting exists to serve the SPA entry point instead of a 404 for any unmatched route ([Cloudflare SPA routing](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/)). On a site where every route has its own document, it converts every broken link into a 200 answer. The SSG path is `404-page` with a `404.html` in the emitted directory.
- **Range requests and the hero clip.** Community reports document that a video served through Cloudflare with a compression header loses byte-range serving and returns 200 with the whole file rather than 206 ([Fixing Cloudflare not serving Range requests](https://blog.lattemacchiato.dev/fixing-cloudflare-not-serving-range-requests-on-cached-files/); [Webm range requests return 200 instead of 206](https://community.cloudflare.com/t/webm-range-requests-return-200-instead-of-206/548696)). These are community sources, not vendor documentation, so treat the mechanism as a hypothesis and the observable as the criterion: assert `206` on a ranged request against the deployed media URL.

## 4. The hero, where the spec is thinner than the standard

**WCAG 2.2.2 covers more people than the reduced-motion scenario does.** The normative text of [SC 2.2.2 Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html): "For any moving, blinking or scrolling information that (1) starts automatically, (2) lasts more than five seconds, and (3) is presented in parallel with other content, there is a mechanism for the user to pause, stop, or hide it unless the movement, blinking, or scrolling is part of an activity where it is essential." A looping orchestra clip behind a product claim and a download button is moving information presented in parallel with other content, it starts automatically, and it lasts longer than five seconds. The spec's third requirement handles only the person who asked the operating system for reduced motion. The mechanism SC 2.2.2 asks for has to be available to everyone.

**Autoplay cannot be assumed, and the failure mode is silent.** [Chrome's autoplay policy](https://developer.chrome.com/blog/autoplay) grants muted autoplay unconditionally, so desktop Chrome is fine. iOS Safari in Low Power Mode is not: Apple blocks automatic playback outright, and "iOS does not expose a way to detect if Low Power Mode is enabled" ([Autoplay does not work on Mobile Safari in Low Power Mode](https://wojtek.im/journal/safari-autoplay-not-working-in-low-power-mode)). The only sound approach is to treat the `play()` promise as a real result: it rejects with `NotAllowedError` ([MDN HTMLMediaElement.play()](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/play)), and the hero must fall back to the still frame rather than sitting dark. The spec already reaches for this idea in "the hero must show its scene before the loop has loaded"; the criterion needs to extend to "the loop never arrives at all."

**The poster is the Largest Contentful Paint element.** [web.dev on LCP](https://web.dev/articles/lcp): for video elements LCP uses the poster image load time or the first frame presentation time, whichever is earlier; before Chrome 116 (August 2023) a video without a poster did not contribute to LCP at all. That makes the poster's weight and priority a measurable acceptance number rather than a taste question.

**Same-origin media is what keeps the canvas readable.** [MDN, Use cross-origin images in a canvas](https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/CORS_enabled_image): drawing data loaded from another origin without CORS approval taints the canvas, and `getImageData()`, `toDataURL()`, and `toBlob()` then throw `SecurityError`. The same rules apply to a `<video>` source. The proposal's move from base64 to plain files removes the `file://` opaque-origin problem, and it stays removed only while the media ships from the site's own origin. A later move to a media subdomain reintroduces the exact failure the base64 embedding was working around, and the fix then is `crossorigin="anonymous"` plus `Access-Control-Allow-Origin` on the media host.

**Reduced motion changes mid-session.** [web.dev on prefers-reduced-motion](https://web.dev/articles/prefers-reduced-motion) documents listening with `window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', ...)` to stop or restart in-flight animation. A one-shot read at mount leaves someone who turns the preference on staring at a loop that will not stop. Windows caveat worth knowing during manual testing: the Ease of Access animation toggle is all-or-nothing and drives the media query, which is why a Windows tester may see the reduced branch without having asked for it ([Vispero note on prefers-reduced-motion and Windows users](https://vispero.com/resources/short-note-on-prefers-reduced-motion-and-puzzled-windows-users/)).

**The pointer assumption, flagged as reasoning rather than a citation.** All three of the spec's hero scenarios begin with a pointer. A touch device and a keyboard-only visitor have none, and under the written behaviour they get a dark rectangle where the product's first impression should be. I found no vendor document that settles this, so I am not dressing it as a finding: it is a hole in the acceptance surface, and the criterion below is derived, not sourced.

## 5. The download, where the repository contradicts the landing page's promise

The landing capability promises "a download a person can act on." Four repository facts stand between that sentence and a working button.

1. **Every artifact name embeds the version.** `apps/desktop/electron-builder.yml` sets `nsis.artifactName: ${productName}-${version}-setup.${ext}` (line 21), `dmg.artifactName: ${productName}-${version}.${ext}` (line 30), `appImage.artifactName: ${productName}-${version}.${ext}` (line 42), and `deb.artifactName: ${productName}_${version}_${arch}.${ext}` (line 44). GitHub's stable permalink is `https://github.com/{owner}/{repo}/releases/latest/download/{asset-name}` ([Linking to releases](https://docs.github.com/en/repositories/releasing-projects-on-github/linking-to-releases)), which needs an asset name that does not move. No hardcodable href exists today.
2. **Releases are created as drafts.** `.github/workflows/release.yml:99` runs `gh release create "$TAG" assets/* --repo "$REPO" --draft --generate-notes --title "$TAG"`. GitHub's latest-release resolution is the most recent non-prerelease, non-draft release ([Linking to releases](https://docs.github.com/en/repositories/releasing-projects-on-github/linking-to-releases)), so a shipped build stays invisible to the site until a person publishes the draft.
3. **A browser-side call to the GitHub API is rate limited hard.** Unauthenticated REST requests are capped at 60 per hour and "associated with the originating IP address" ([Rate limits for the REST API](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)). Every visitor behind one corporate NAT shares that budget. This is the obvious workaround for point 1 and it is the wrong one.
4. **The dmg name carries no architecture token**, so a page cannot offer Apple Silicon and Intel as distinct choices from the artifact list alone, and `.github/workflows/homebrew-bump.yml` exists, which means a `brew install` path is already a real second route a download page should carry.

The path that keeps locked decision 3 intact is build-time resolution: the site build reads the latest published release once, bakes the URLs into the emitted documents, and the deploy re-runs when a release publishes. That is a workflow trigger, not a server function.

## 6. The prose gate does not currently see the documentation

`.vale.ini` binds `BasedOnStyles` under a single `[*.md]` section (line 7 to 8) and has no `[formats]` section. Vale's [Markdown format documentation](https://docs.vale.sh/formats/markdown) states the supported extensions are `.md`, `.mdown`, `.markdown`, and `.markdn`, with R Markdown added at v3.18.0. `.mdx` is not among them. Fumadocs content authored as `.mdx` therefore passes the prose gate vacuously, which is the same class of silent pass recorded in the "cspell blind in worktrees" lesson.

The official remedy is the `[formats]` section, `mdx = md`, plus a `[*.mdx]` block ([.vale.ini reference](https://docs.vale.sh/topics/.vale.ini)), with the vendor's own limit stated plainly: it "is merely an extension-level substitution and is not a means of adding support for a new file type." JSX in content will produce false positives, and the house rule already names the only acceptable responses (`TokenIgnores`, `BlockIgnores`, `IgnoredScopes`), never a lowered `MinAlertLevel`. One secondary source claims a recent Vale added native MDX support; the official formats page does not list it, so verify against the pinned version before choosing between the two paths.

Note for the writers of this cycle: `.vale.ini:33` excludes `**/openspec/changes/**/discovery/**`, so discovery artifacts are outside the gate while the shipped documentation is not.

## 7. Candidate acceptance criteria, in the house spec voice

**Static output**

1. The build MUST emit one document per published route, and a check MUST compare the emitted document set against the route set and the content source, failing on any content file with no document. SPA mode alone does not satisfy this (TanStack/router#4798).
2. The prerender page list for the documentation catch-all MUST be derived from the content source rather than left to automatic path discovery, which excludes parameterised routes by design.
3. The build MUST fail on a prerender error rather than emitting a partial site (`failOnError`).
4. Serving the emitted directory with a plain static file server, no application runtime, MUST answer every published route and MUST return search results. This is the spec's own scenario; it belongs in continuous integration, not in a manual pass.
5. No published route MUST register a server handler after the build, and a check MUST assert that, because the search route is the one place the framework invites one.

**Search**

6. Documentation search MUST resolve against an index the build wrote, using the static client, with no network call to a search service.
7. The exported index MUST carry a size budget that fails the build when crossed, because the vendor states the client downloads it whole.

**Host**

8. Exactly one trailing-slash form MUST be canonical, every internal link MUST use it, and no internal navigation MUST produce a redirect.
9. Unmatched routes MUST answer 404 with the site's own 404 document. Single-page-application fallback handling MUST NOT be configured, because it turns every broken link into a 200.
10. No emitted asset MUST exceed 25 MiB, and the asset count MUST stay under the plan's ceiling.
11. A ranged request for the hero media MUST answer 206, verified against the deployed URL rather than assumed from configuration.

**Hero**

12. A mechanism to pause, stop, or hide the loop MUST be available to every person, not only to the person who asked for reduced motion, because the loop starts automatically, runs past five seconds, and sits in parallel with the product claim and the download.
13. The hero MUST treat a refused `play()` as an expected outcome and hold the still frame, because iOS Low Power Mode blocks autoplay and cannot be detected.
14. The video MUST carry `muted` and `playsinline`, and MUST NOT request audio, because muted autoplay is the only autoplay the browsers grant unconditionally.
15. The poster MUST be the LCP element, preloaded at high priority, in a modern format, with a stated LCP budget on the landing route.
16. The hero media MUST be served from the site's own origin. Any move to a separate media host MUST carry `crossorigin="anonymous"` and a matching `Access-Control-Allow-Origin`, or the canvas taints and pixel reads throw.
17. The reduced-motion preference MUST be observed live through a `change` listener, so turning it on mid-session stops the loop.
18. **Derived, not sourced:** on a device with no fine pointer, the hero MUST present its scene without requiring a reveal, so a touch or keyboard visitor does not meet a dark rectangle. Confirm the intent with the maintainer before writing it as a requirement.

**Download**

19. The download target MUST resolve at build time into the emitted document, never through a browser call to the GitHub API, which is capped at 60 unauthenticated requests per hour per IP.
20. A release MUST be published, not left as a draft, before the site can present it, and the deployment MUST re-run when a release publishes. Otherwise the site advertises the previous version indefinitely.
21. The page MUST offer the correct artifact per platform and architecture, which the current artifact names cannot express for macOS; either the names gain an architecture token or the site resolves assets by pattern.
22. The Homebrew route MUST appear beside the direct download, since the repository already automates it.

**Gates**

23. `.mdx` content MUST pass the same Vale and cspell gates as `.md`, proven by a seeded error failing the gate, not by reading the configuration.
24. The gate widening MUST NOT lower any threshold. JSX false positives get scoped ignores, never a relaxed alert level.

## 8. Where the evidence is thin, said plainly

- **The SPA-versus-prerender conflict is documented on both sides but I did not verify the current state of TanStack/router#4798.** If it was fixed, the Fumadocs SPA template becomes viable and criterion 1 gets easier. Check the issue state and the pinned TanStack Start version before locking the build mode.
- **TanStack Start's release status.** The [v1 Release Candidate announcement](https://tanstack.com/blog/announcing-tanstack-start-v1) is dated 2025-09-22, describes the build as "the build we expect to ship as 1.0, pending your final feedback," and says "only light polish remains. No major API shifts." I could not confirm a stable 1.0 exists as of 2026-08. Locked decision 2 rests on a release candidate, which is worth naming in the ADR rather than discovering later.
- **The Cloudflare range-request behaviour rests on community reports only**, which is why criterion 11 asserts the observable rather than the mechanism.
- **Adobe Fonts.** The [Adobe Fonts web font licensing page](https://helpx.adobe.com/fonts/using/webfont-licensing.html) timed out on fetch, so I am reporting the terms secondhand: multiple sources agree the terms prohibit self-hosting web font files or uploading them to a website platform, require the provided embed code, and bind a kit to named domains. That matters because the code map records the brand typeface in the tree as four hashed `.woff2` files cached from a Typekit localhost kit, with no kit id or license terms anywhere. If those files ship, the site self-hosts fonts under a license that appears to forbid it. **Verify the exact terms against the Adobe page directly before the branch ships anything under `designs/fonts/`**, and treat this as a launch blocker for the "same brand and typeface" scenario rather than a detail.

## 9. Recommendation

Build fully prerendered, not SPA mode, and let the spec's own scenario be the gate: a plain static file server over the emitted directory answering every route. That choice forces the documentation page list to come from the content source, forces the search route into `prerender.pages` with `staticGET`, and forces `404-page` handling on Cloudflare. Those three follow from one decision, which is a good sign the decision is the right shape.

Add SC 2.2.2 to the hero requirement before implementation starts, because a pause control is a component with its own placement and styling, and retrofitting one into a full-bleed canvas hero after the layout settles is the expensive order.

Settle the download resolution and the typeface license during design rather than during implementation. Both are cross-cutting, both currently contradict something already in the tree, and neither is a coding problem.

Sources:

- [TanStack/router#4798, prerenders in SPA mode only render the root route](https://github.com/TanStack/router/issues/4798)
- [TanStack/router discussion #5478, serve TanStack Start + Fumadocs statically](https://github.com/TanStack/router/discussions/5478)
- [fumadocs discussion #2442, Fumadocs + TanStack Start fully static](https://github.com/fuma-nama/fumadocs/discussions/2442)
- [TanStack Start static prerendering docs](https://tanstack.com/start/latest/docs/framework/react/guide/static-prerendering)
- [TanStack Start SPA mode docs](https://tanstack.com/start/v0/docs/framework/react/guide/spa-mode)
- [TanStack Start v1 Release Candidate announcement, 2025-09-22](https://tanstack.com/blog/announcing-tanstack-start-v1)
- [Fumadocs manual installation, TanStack Start](https://www.fumadocs.dev/docs/manual-installation/tanstack-start)
- [Fumadocs Orama search, static export](https://www.fumadocs.dev/docs/headless/search/orama)
- [Cloudflare static site generation routing](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/)
- [Cloudflare single-page application routing](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/)
- [Cloudflare changelog, increased static asset limits, 2025-09-02](https://developers.cloudflare.com/changelog/post/2025-09-02-increased-static-asset-limits/)
- [Fixing Cloudflare not serving Range requests on cached files](https://blog.lattemacchiato.dev/fixing-cloudflare-not-serving-range-requests-on-cached-files/)
- [Cloudflare community, webm range requests return 200 instead of 206](https://community.cloudflare.com/t/webm-range-requests-return-200-instead-of-206/548696)
- [W3C, Understanding SC 2.2.2 Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)
- [Chrome for Developers, autoplay policy](https://developer.chrome.com/blog/autoplay)
- [Autoplay does not work on Mobile Safari in Low Power Mode](https://wojtek.im/journal/safari-autoplay-not-working-in-low-power-mode)
- [MDN, HTMLMediaElement.play()](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/play)
- [web.dev, Largest Contentful Paint](https://web.dev/articles/lcp)
- [web.dev, prefers-reduced-motion](https://web.dev/articles/prefers-reduced-motion)
- [Vispero, short note on prefers-reduced-motion and Windows users](https://vispero.com/resources/short-note-on-prefers-reduced-motion-and-puzzled-windows-users/)
- [MDN, use cross-origin images in a canvas](https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/CORS_enabled_image)
- [Vale, Markdown format support](https://docs.vale.sh/formats/markdown)
- [Vale, .vale.ini reference](https://docs.vale.sh/topics/.vale.ini)
- [GitHub Docs, linking to releases](https://docs.github.com/en/repositories/releasing-projects-on-github/linking-to-releases)
- [GitHub Docs, rate limits for the REST API](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)
- [Adobe Fonts, web fonts licensing (fetch timed out, reported secondhand)](https://helpx.adobe.com/fonts/using/webfont-licensing.html)
