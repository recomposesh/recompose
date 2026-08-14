Lookup succeeded, so this is a real ledger and not a failure report.

## Lookup

Command run: `gh issue list --repo recomposesh/recompose --label rider --state open --limit 200 --json number,title,body`. Exit status 0, 11,354 bytes of JSON, 13 open rider issues returned: #155, #154, #153, #140, #138, #137, #136, #123, #122, #121, #120, #119, #118. Every verdict below is judged against the `landing-docs-site` proposal (`openspec/changes/landing-docs-site/proposal.md`) by issue body text, not by repository search.

## Riders that touch this feature

**#153, "rider: flaky candidates and the test-infra decisions #151 made under way".** The only open rider with a real claim on this change, and it touches only the proposal's modified capability ("The repository gates. Linting, prose, spelling, dependency, and license checks widen to cover a second application", proposal lines 63 to 66). Its "Decisions taken under the delegated goal, standing for review" section records four settings; three are `apps/desktop`-scoped and one is repository-wide:

- Repository-wide, and the one `apps/web` inherits on its first commit: `.github/workflows/ci.yml:68` runs `pnpm exec turbo run lint typecheck build test --concurrency=1`. `pnpm-workspace.yaml` globs `apps/*`, so a new `apps/web` package joins the task graph with no config change and its `lint`, `typecheck`, `build`, and `test` tasks (defined in `turbo.json` lines 3 to 22) run inside that serialized check job. The rider's stated reason is a starved shared runner producing 40-second click timeouts, so the site's build and test lanes lengthen the same serial job rather than parallelizing beside it.
- Desktop-scoped precedent a second application must answer from scratch, since neither is shared through `vitest.shared.ts`: `apps/desktop/vitest.config.ts:46` holds `const pacedForCi = process.env['CI'] === undefined ? {} : { fileParallelism: false, retry: 1 };`, and `apps/desktop/vitest.config.ts:42` pins the browser instance to `viewport: { width: 1280, height: 800 }`.
- Desktop-scoped visual-gate precedent: `apps/desktop/e2e/playwright.config.ts:27` holds `expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.015 } }`, loosened from `maxDiffPixels: 0` because the macOS runner pool rasterizes fonts unevenly. The rider names the structural alternative (pinning font smoothing in the capture) as still unclaimed. A landing page carrying a canvas render loop and a licensed brand typeface (proposal lines 21 to 24 and 73 to 76) meets that same unevenness if it ever takes a pixel baseline, so the rider is the standing record of why the desktop tolerance is what it is and it stays open.

The rider's four flaky candidates (`seedGateway` at `gateway-screen.ts:145`, the shared-fixture wipe race, `packages/engine/src/dialect/responses-roundtrip.test.ts`, and `storage-ipc-secret-hygiene`) are all desktop and engine scoped and carry nothing into `apps/web`.

## Riders that do not touch this feature

Judged out of scope, each by body text: #155 and #154 (gateway-canvas engine judgements and frozen scenarios), #140 (AIMock for the serving path, a dev dependency decision on `key-probe-stub.ts` and `runtime-stub.ts`), #138 (key-probe fetch bound into contracts), #137 (provider-catalog-sheet load flake), #136 (stored runtime port move), #123 (`subscriptions:activate` surface after the menu prune), #122 (e2e fake tools missing `codex.mts`), #121 (swallowed terminal launch failures), #120 (`parkInto` stale parked slot), #119 (macOS sign-in outrunning the identity write), #118 (credential blob in `/usr/bin/security` argv). Every one sits in the desktop main process, the engine, or the e2e fake tooling. None mentions a public surface, documentation, prose or spelling gates, licensing, hosting, or a second application. Two keyword sweeps over all 13 bodies found no occurrence of Vale, cspell, license, Fumadocs, Cloudflare, landing, or documentation-site vocabulary; the `host` and `install` matches that did land resolve to localhost runtimes and CLI tool installation.

## Gaps I am naming rather than filling

- **No open rider covers the prose, spelling, dependency, or license half of the widened gate.** The proposal names all four (lines 63 to 66) and the rider ledger answers only the CI concurrency and visual-baseline half through #153. Anyone expecting prior art on widening Vale or cspell to a second application will not find it in an open rider.
- **`apps/web` does not exist yet.** `ls apps` returns `desktop` alone, so no rider can name a file in the new application and none does.
- **The two questions the proposal leaves open into discovery have no rider behind them.** The graded test clip needing licensed stock and the Typekit kit's domain and self-hosting terms (proposal lines 73 to 76) appear in no open rider body. They are new work, not deferred work.
