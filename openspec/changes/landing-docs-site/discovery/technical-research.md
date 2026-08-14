## Discovery brief: landing-docs-site (tier full)

Scope: third-party evidence for the four locked decisions (apps/web in this monorepo, TanStack Start carrying Fumadocs, static build on Cloudflare, landing plus a first docs set), plus the gate and asset questions the change opens. Repository paths below are relative to the repository root. Every web claim carries a link; where the evidence is thin or conflicting I say so rather than smoothing it.

---

### 1. Fumadocs on TanStack Start is officially supported, and the static path is documented

Fumadocs documents TanStack Start as a first-class framework alongside Next.js, React Router and Waku, with a manual-installation guide (`fumadocs-core` + `fumadocs-ui`, Tailwind CSS 4 required, `routes/docs/$.tsx` catch-all, `__root.tsx` with `RootProvider`, `lib/source.ts` from the Fumadocs MDX Vite plugin) ([Fumadocs, TanStack Start](https://www.fumadocs.dev/docs/manual-installation/tanstack-start)). The Static Build page names TanStack Start explicitly and gives the config:

```ts
tanstackStart({
  spa: { enabled: true, prerender: { enabled: true }, pages: [{ path: '/docs/test' }] },
});
```

([Fumadocs, Static Build](https://www.fumadocs.dev/docs/deploying/static)). An official TanStack Start SPA template exists in `create-fumadocs-app` ("Tanstack Start SPA: Fumadocs MDX"), added after the maintainer worked the static case through with a user in [fumadocs discussion #2442](https://github.com/fuma-nama/fumadocs/discussions/2442) (Oct 2025) and confirmed again in [TanStack/router discussion #5478](https://github.com/TanStack/router/discussions/5478) (latest reply Jun 26, 2026). The maintainer's own advice there is to start from the template rather than hand-assemble the config. **Recommendation: scaffold from the official template into `apps/web`, then strip it back to house conventions, rather than following the manual-installation guide from zero.**

Caveat worth carrying: the manual guide's default wiring uses `createServerFn` for the page loader and a `routes/api/search.ts` GET handler. Both are server-shaped by default, which collides with the spec (see §3).

### 2. "A document for every route" needs prerendering, not SPA mode alone

These are two different TanStack Start features and the spec's first requirement discriminates between them:

- SPA mode prerenders **one shell** (`spa.prerender.outputPath`, default `/_shell.html`) and expects the host to rewrite 404s to it; the docs' own Netlify example is `/* /_shell.html 200`. Only the root route's loaders run at build ([TanStack Start, SPA mode](https://tanstack.com/start/latest/docs/framework/react/guide/spa-mode)).
- Static prerendering emits **one HTML file per route**, with `crawlLinks` defaulting to true and `autoSubfolderIndex` controlling `/page/index.html` vs `/page.html`; routes with path params are only reached through crawled links ([TanStack Start, Static prerendering](https://tanstack.com/start/latest/docs/framework/react/guide/static-prerendering)).

The spec scenario "static hosting serves the emitted directory … every published route answers with its own document" is satisfied by the second, not the first. Fumadocs' static config turns both on together, which is the right shape: prerender the real documents, keep the shell as the 404 fallback. **Acceptance criterion to write: assert on the emitted directory (a file per published route, plus the search index JSON), not on a dev server response.** A dev-server-only check passes on an SPA shell and would let the requirement through vacuously.

### 3. Server functions are the live risk in this stack

The spec says no published route may register a server function. Three facts bear on it:

- In SPA mode, server functions are **not** removed; the docs describe them as still operational and allow-listed via CDN redirects (`/_serverFn/*`, `/api/*`) ([SPA mode](https://tanstack.com/start/latest/docs/framework/react/guide/spa-mode)). Shipping without those redirects turns a stray server function into a runtime 404, not a build error.
- TanStack offers `staticFunctionMiddleware` from `@tanstack/start-static-server-functions`, which runs a server function at build time and serializes results into `dist/server/.data/` ([TanStack Start, Static server functions](https://tanstack.com/start/latest/docs/framework/react/guide/static-server-functions)). The docs label it **experimental**, and there is an open defect, [TanStack/router#6787](https://github.com/TanStack/router/issues/6787) (opened Feb 28, 2026, still open, no maintainer reply, reported on 1.161.3), reporting that a static server function re-executes on every page visit instead of only at build. The reporter shipped a two-phase build script as a workaround.
- The alternative is to hold no server function at all: read MDX through the Fumadocs MDX Vite plugin inside client-side route loaders, so the content is bundled rather than fetched.

**Recommendation: prefer the no-server-function route and treat `@tanstack/start-static-server-functions` as a fallback that needs its own build-output assertion, given #6787.** The spec's second scenario ("no published route registers a server function") wants a mechanical check: grep the built output for a `/_serverFn/` manifest, or assert the absence of `.data/` payloads, rather than a code review promise.

### 4. Search: static Orama works, and it downloads the whole index

Fumadocs static search swaps the fetch client for `staticClient` from `fumadocs-core/search/client/orama-static`, paired with `staticGET` on the search server, so the index is a build-written JSON the browser queries locally ([Fumadocs, Orama search](https://www.fumadocs.dev/docs/search/orama), [headless Orama, static export](https://www.fumadocs.dev/docs/headless/search/orama)). Two documented limits: the client downloads the exported index, which the docs call expensive for large sites (they steer big sites to Orama Cloud or Algolia), and **static mode does not support locale filtering**. Neither bites a first documentation set of three pages; both are worth an ADR consequence line. Open question I could not settle from official docs: how the index JSON gets emitted as a static file under TanStack Start specifically (the `staticGET` examples are Next.js-shaped, with `export const revalidate = false`). The official SPA template is the place to read that off.

### 5. Hosting: an assets-only Worker, and `.output/public`

Cloudflare's official TanStack Start guide (last updated Jun 25, 2026) configures `assets: { directory: ".output/public" }` with `main: "@tanstack/react-start/server-entry"` and `nodejs_compat` ([Cloudflare, TanStack Start framework guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/index.md)). For this feature, drop the `main`: a Worker script is optional when only assets are served, and `not_found_handling` chooses between `single-page-application` (returns `index.html` with 200) and `404-page` ([Cloudflare, Static assets](https://developers.cloudflare.com/workers/static-assets/), last updated Jul 3, 2026). Limits that matter to the hero: **25 MiB per file** on both plans, 20,000 files free / 100,000 paid, and **asset requests are free and unlimited** ([Cloudflare, platform limits](https://developers.cloudflare.com/workers/platform/limits/), [billing and limitations](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/), Apr 23, 2026). A 14 MB hero loop fits under 25 MiB with room, so no Cloudflare Stream dependency.

Workers versus Pages: Cloudflare's own migration guide states investment now goes to Workers and Pages is in maintenance for new work ([Cloudflare, migrate from Pages to Workers](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/)). Choose Workers static assets.

Repository consequence: `turbo.json` declares `"outputs": ["dist/**", "out/**"]` for `build`. TanStack Start emits to `.output/`, so without a third entry every CI run rebuilds the site uncached and the deploy job may find nothing restored from cache.

### 6. Hero: the four APIs the reveal needs, and one accessibility gap in the spec

- **Trailing fade.** The canonical technique is compositing on a mask canvas: paint the brush with `globalCompositeOperation = 'destination-out'` and decay the mask each frame so light behind the pointer dies rather than accumulating ([MDN, globalCompositeOperation](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation)). This matches the spec sentence "the light behind the pointer fades back into the dark" exactly.
- **Smooth trail at speed.** `PointerEvent.getCoalescedEvents()` returns the merged intermediate positions, and MDN names drawing applications as the motivating case. It is **not Baseline** and requires a secure context ([MDN, getCoalescedEvents](https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/getCoalescedEvents)), so treat it as an enhancement over plain `pointermove` with interpolation, never as the only path.
- **Video into canvas.** `HTMLVideoElement.requestVideoFrameCallback()` fires per decoded video frame with `mediaTime`/`presentedFrames` metadata, Baseline since October 2024, and is the documented way to pull frames into a canvas without over-drawing at display refresh rate ([MDN, requestVideoFrameCallback](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback)).
- **Autoplay.** A muted video with no audible track is exempt from autoplay blocking; `playsinline` is required on Safari; `play()` rejects with `NotAllowedError` and needs a visible fallback ([MDN, autoplay guide](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay)). The spec's "hero shows its scene before the loop has loaded" is exactly what the `poster` attribute is for, so the first frame ships as a poster image rather than as a JS-drawn placeholder.

**Gap in the spec worth raising before implementation:** WCAG 2.2.2 Pause, Stop, Hide (Level A) requires a pause/stop/hide mechanism for any moving content that starts automatically, lasts more than five seconds, and sits in parallel with other content, unless the movement is essential ([W3C, Understanding SC 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)). The spec covers reduced motion but not this. A hero loop longer than five seconds needs a control, an "essential" argument, or a sub-five-second loop. `prefers-reduced-motion` alone does not discharge it.

In-repo prior art for the motion query already exists: `apps/desktop/src/renderer/src/shared/lib/use-panel-reveal.ts` gates on `window.matchMedia('(prefers-reduced-motion: no-preference)')`, and `apps/desktop/src/renderer/src/app/styles/theme.css` wraps transitions in `@media (prefers-reduced-motion: no-preference)`. Mirror that polarity (opt in to motion) rather than inventing a second convention.

### 7. Media weight: the base64 problem is a Vite config fact

Vite's `build.assetsInlineLimit` defaults to 4096 bytes and inlines only below it; it accepts a callback for per-file control and `0` disables inlining entirely ([Vite, build options](https://vite.dev/config/build-options)). A 14 MB base64 payload therefore is not Vite's doing at that default: it comes from the prototype importing the media as a data URI module. Porting it as a `public/` file or an asset-URL import drops the payload and recovers the ~33 % base64 inflation. Note that `build.lib` ignores the limit and always inlines, so `apps/web` must not be configured in library mode.

### 8. Fonts: the proposal's premise looks wrong, and the shipped files look unlicensable

Adobe's current web-project model has **no domain list**: the licensing pages state you can add the embed code to any site regardless of host, with unlimited page views while the subscription is active, and that the Terms of Use **do not allow self-hosting the web font files**; self-hosting must be licensed from the foundry ([Adobe, Web fonts from Adobe Fonts](https://helpx.adobe.com/fonts/using/webfont-licensing.html), [Adobe, Domains](https://helpx.adobe.com/fonts/using/domains.html)). **Evidence caveat: helpx.adobe.com timed out on three fetch attempts, so these two statements rest on search-engine extraction of those official pages rather than a page I read end to end. Confirm from the Adobe account before acting.** If it holds, two conclusions follow: the proposal's open question "the kit answers only the domains it names" is likely a stale premise, and the four hashed `.woff2` files under `designs/fonts/localhost` are an Adobe CDN cache that cannot ship as self-hosted files. The remaining paths are the Adobe embed script (a third-party render-blocking request, which the proposal already flags as a cost), a foundry self-host license, or a self-hostable substitute.

On the hero footage: royalty-free licences from Artgrid and Getty's royalty-free tier both cover perpetual commercial web use, whereas Getty rights-managed pricing keys on placement and duration ([Getty, licensing](https://www.gettyimages.com/faq/licensing), [Artgrid](https://artgrid.io/)). Whichever is chosen, the licence class and the clip identity belong in the ADR, because "royalty-free" and "rights-managed" carry different obligations for a public marketing page. Vendor pages, not neutral sources.

### 9. Gate impacts, evidenced against repository files

- **Vale cannot lint the docs content today, twice over.** `mise.toml` pins `vale = "3.15.2"`; native MDX parsing landed in **Vale v3.18.0**, which removed the need for `CommentDelimiters` or a `[formats]` association and skips JSX elements, ESM imports and expressions, configured via `Packages = MDX` ([Vale, MDX format](https://docs.vale.sh/formats/mdx)). Separately, `.vale.ini` binds `BasedOnStyles` under a `[*.md]` glob, so `.mdx` files sit outside every rule until a section names them. Both need to move together, and the pre-`3.18` `mdx2vast` workaround should not be adopted when a version bump does it properly.
- **Turbo:** add the site's emitted directory to `build.outputs` in `turbo.json` (currently `dist/**`, `out/**`).
- **pnpm supply-chain window:** `pnpm-workspace.yaml` sets `minimumReleaseAge: 4320` (three days) with an explicit exclude list. Fumadocs and TanStack ship often, so expect exclude entries; pnpm supports name patterns such as `'@tanstack/*'` as well as pinned versions ([pnpm, settings](https://pnpm.io/settings), [pnpm 10.19 release notes](https://pnpm.io/blog/releases/10.19)).
- Per the change's own code map (`openspec/changes/landing-docs-site/discovery/code-map.md`), `.oxlintrc.json` and `.oxfmtrc.json` each resolve Tailwind against a single desktop stylesheet, `.dependency-cruiser.cjs` keys every rule on `^apps/desktop/`, `knip.json` needs a workspace block for the generated route tree, and `package.json`'s `lint:fsd` hardcodes the desktop renderer path. Those are repository facts I did not re-verify individually within the read budget.

### 10. Token sharing: the shared source named in the proposal does not exist

`packages/` holds `contracts` and `engine` only; `design-system/` is not in the tree, and the two token tiers live at `apps/desktop/src/renderer/src/app/styles/primitives.css` and `theme.css`, inside the one app the spec forbids `apps/web` to import from. Extracting them into a workspace package (`packages/design-tokens`, exporting both CSS tiers) satisfies "MAY read the shared design tokens" without a boundary violation, and gives `.dependency-cruiser.cjs` something to allow while it forbids `apps/web` → `apps/desktop`. The extraction is a change to ADR-0009's contract and should be recorded.

Fumadocs UI supports **only** Tailwind CSS 4 and ships its own theme layer (`@import 'fumadocs-ui/css/neutral.css'; @import 'fumadocs-ui/css/preset.css';`), overridable by redefining `--color-fd-*` variables in an `@theme` block ([Fumadocs, Theme](https://www.fumadocs.dev/docs/ui/theme)). The clean seam is to map `--color-fd-*` onto the recompose semantic tokens rather than fork the preset, which keeps "same brand and typeface across the crossing" (spec scenario) as a token mapping instead of a duplicated palette.

---

### Conflicts and thin evidence, stated plainly

1. **TanStack Start's stability status is contradictory.** The official React overview I fetched still reads "TanStack Start is currently in the Release Candidate stage … feature-complete and its API is considered stable" ([TanStack Start overview](https://tanstack.com/start/latest/docs/framework/react/overview)), while third-party posts claim a v1.0 stable in March 2026 and the v1 RC announcement is dated Sep 22, 2025 ([TanStack blog](https://tanstack.com/blog/announcing-tanstack-start-v1)). Cloudflare's official guide treats it as a supported framework as of Jun 2026. Resolve by reading the installed package version at implementation time; do not put a version claim in the ADR from a blog.
2. **Adobe Fonts terms**, as noted in §8, are extraction-level evidence only.
3. **Not verified:** how the Fumadocs static search index is emitted under TanStack Start specifically, and whether the official SPA template avoids `createServerFn` or leans on the experimental static-server-function middleware. Both are answerable in an hour by scaffolding the template into a scratch directory and reading its build output; I did not do that here.

### Recommendation

Scaffold from the official Fumadocs TanStack Start SPA template; turn on static prerendering with `crawlLinks` so every route gets its own document and keep the SPA shell only as the 404 fallback; carry no server function on any published route and prove it against the built output rather than by review; ship static Orama search; deploy as an assets-only Cloudflare Worker pointing at `.output/public`; bump Vale to ≥ 3.18.0 with `Packages = MDX` and an `.mdx` section before the first content page is written; extract the design tokens into a workspace package before `apps/web` renders anything branded; and add a pause affordance or a sub-five-second loop to the hero requirement to close the WCAG 2.2.2 gap.

Sources:

- [Fumadocs: TanStack Start manual installation](https://www.fumadocs.dev/docs/manual-installation/tanstack-start)
- [Fumadocs: Static Build](https://www.fumadocs.dev/docs/deploying/static)
- [Fumadocs: Orama search (static mode)](https://www.fumadocs.dev/docs/search/orama)
- [Fumadocs: headless Orama, static export](https://www.fumadocs.dev/docs/headless/search/orama)
- [Fumadocs: Theme / Tailwind CSS 4](https://www.fumadocs.dev/docs/ui/theme)
- [fumadocs discussion #2442: fully static with TanStack Start](https://github.com/fuma-nama/fumadocs/discussions/2442)
- [TanStack/router discussion #5478: serve TanStack Start + Fumadocs statically](https://github.com/TanStack/router/discussions/5478)
- [TanStack Start: SPA mode](https://tanstack.com/start/latest/docs/framework/react/guide/spa-mode)
- [TanStack Start: Static prerendering](https://tanstack.com/start/latest/docs/framework/react/guide/static-prerendering)
- [TanStack Start: Static server functions](https://tanstack.com/start/latest/docs/framework/react/guide/static-server-functions)
- [TanStack/router issue #6787: static server function runs on every visit](https://github.com/TanStack/router/issues/6787)
- [TanStack Start: overview (stability statement)](https://tanstack.com/start/latest/docs/framework/react/overview)
- [TanStack blog: v1 release candidate](https://tanstack.com/blog/announcing-tanstack-start-v1)
- [Cloudflare: TanStack Start framework guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/index.md)
- [Cloudflare: Workers static assets](https://developers.cloudflare.com/workers/static-assets/)
- [Cloudflare: static assets billing and limitations](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)
- [Cloudflare: platform limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Cloudflare: migrate from Pages to Workers](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/)
- [Vite: build options (assetsInlineLimit)](https://vite.dev/config/build-options)
- [MDN: globalCompositeOperation](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation)
- [MDN: PointerEvent.getCoalescedEvents](https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/getCoalescedEvents)
- [MDN: HTMLVideoElement.requestVideoFrameCallback](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback)
- [MDN: autoplay guide](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay)
- [MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
- [W3C: Understanding SC 2.2.2 Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)
- [Vale: MDX format](https://docs.vale.sh/formats/mdx)
- [pnpm: settings (minimumReleaseAge)](https://pnpm.io/settings)
- [pnpm 10.19 release notes](https://pnpm.io/blog/releases/10.19)
- [Adobe: web fonts licensing](https://helpx.adobe.com/fonts/using/webfont-licensing.html)
- [Adobe: domains](https://helpx.adobe.com/fonts/using/domains.html)
- [Getty Images: licensing](https://www.gettyimages.com/faq/licensing)
- [Artgrid](https://artgrid.io/)
