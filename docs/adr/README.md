# Architecture decision records

This index records every technical decision in recompose (see `CLAUDE.md`). For a new decision record: copy the lightweight format of an existing one, number it sequentially, and add a row below. Never edit an accepted decision record: supersede it with a new one and update its status.

## Index

| Record                                                                          | Title                                                                               | Status     | Date       |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------- | ---------- |
| [0001](0001-electron-as-desktop-shell.md)                                       | Electron as Desktop Shell                                                           | Accepted   | 2026-07-21 |
| [0002](0002-engine-in-electron-utilityprocess.md)                               | Gateway Engine Runs in Electron's utilityProcess                                    | Accepted   | 2026-07-21 |
| [0003](0003-scaffold-with-electron-vite.md)                                     | Scaffold with electron-vite                                                         | Accepted   | 2026-07-21 |
| [0004](0004-pnpm-workspaces-turborepo.md)                                       | pnpm Workspaces + Turborepo                                                         | Accepted   | 2026-07-21 |
| [0005](0005-single-port-path-per-gateway.md)                                    | Single Port, Path per Gateway, Both Dialects Always                                 | Superseded | 2026-07-21 |
| [0006](0006-local-quality-gate-layer.md)                                        | Local Quality Gate Layer                                                            | Accepted   | 2026-07-21 |
| [0007](0007-ci-layer.md)                                                        | CI Layer                                                                            | Accepted   | 2026-07-22 |
| [0008](0008-liquid-glass-window-chrome.md)                                      | Liquid Glass Window Chrome via electron-liquid-glass                                | Accepted   | 2026-07-22 |
| [0009](0009-two-tier-design-tokens.md)                                          | Two-Tier Design Tokens on Tailwind v4                                               | Accepted   | 2026-07-22 |
| [0010](0010-folder-structure-fsd-and-enforced-boundaries.md)                    | Folder Structure, Feature-Sliced Renderer, Enforced Boundaries                      | Accepted   | 2026-07-22 |
| [0011](0011-repo-guards-forbidden-alias-and-protected-main.md)                  | Repo Guards: Forbidden Owner Alias, Locally Protected Main                          | Accepted   | 2026-07-22 |
| [0012](0012-vitest-testing-foundation.md)                                       | Vitest Testing Foundation with Browser Mode and Property Testing                    | Accepted   | 2026-07-23 |
| [0013](0013-coderabbit-required-status-check.md)                                | CodeRabbit Review as Required Status Check                                          | Accepted   | 2026-07-23 |
| [0014](0014-dependency-boundaries-enforcement.md)                               | Dependency Boundaries Enforced by dependency-cruiser and Steiger                    | Accepted   | 2026-07-23 |
| [0015](0015-repo-hardening-layer.md)                                            | Repo Hardening Layer                                                                | Accepted   | 2026-07-23 |
| [0016](0016-storage-architecture.md)                                            | Storage, JSON Configs, safeStorage Vault, node:sqlite Usage Log                     | Accepted   | 2026-07-23 |
| [0017](0017-tanstack-router-file-based-in-app-layer.md)                         | TanStack Router, File-Based, Inside the Feature-Sliced App Layer                    | Accepted   | 2026-07-23 |
| [0018](0018-typed-ipc-with-result-envelope.md)                                  | Typed Main-Renderer Channels, Contracts-Defined, with a Result Envelope             | Accepted   | 2026-07-23 |
| [0019](0019-vercel-remote-cache-for-turbo.md)                                   | Vercel Remote Cache for Turborepo                                                   | Accepted   | 2026-07-23 |
| [0020](0020-jscpd-duplicate-code-gate.md)                                       | jscpd Duplicate-Code Gate at Zero Threshold                                         | Accepted   | 2026-07-23 |
| [0021](0021-cyclomatic-complexity-ceiling.md)                                   | Cyclomatic Complexity Ceiling of 5 via oxlint                                       | Accepted   | 2026-07-23 |
| [0022](0022-codecov-patch-coverage-gate.md)                                     | Patch Coverage Gate via Codecov                                                     | Accepted   | 2026-07-23 |
| [0023](0023-type-level-tests.md)                                                | Type-Level Tests for Load-Bearing Derived Types                                     | Accepted   | 2026-07-24 |
| [0024](0024-type-aware-unsafe-lint.md)                                          | Full Type-Aware Lint, Config-Driven                                                 | Accepted   | 2026-07-24 |
| [0025](0025-vale-prose-gate.md)                                                 | Vale Prose Gate with Microsoft Style at Full Strength                               | Accepted   | 2026-07-24 |
| [0026](0026-pr-meta-gate.md)                                                    | A Meta-Gate Machine-Checks Pull Requests for Tests and Records                      | Accepted   | 2026-07-24 |
| [0027](0027-cspell-single-spelling-authority.md)                                | cspell Is the Single Spelling Authority                                             | Accepted   | 2026-07-24 |
| [0028](0028-security-baseline.md)                                               | Security Baseline: app:// Scheme, Sandbox, Fuses, Deny-by-Default                   | Accepted   | 2026-07-24 |
| [0029](0029-storybook-component-workshop.md)                                    | Storybook Component Workshop, Blocking Gates, and the Assistant Posture             | Accepted   | 2026-07-24 |
| [0030](0030-vale-exclusions-in-config.md)                                       | One Exclusion List for the Prose Gate                                               | Accepted   | 2026-07-25 |
| [0031](0031-playwright-end-to-end.md)                                           | Playwright End-to-End Testing, the Three-Platform Matrix, and the Quarantine Policy | Accepted   | 2026-07-25 |
| [0032](0032-renovate-pin-bumps-adr-exempt.md)                                   | Renovate Pin Bumps Take the adr-exempt Escape Hatch Automatically                   | Accepted   | 2026-07-25 |
| [0033](0033-chromatic-visual-regression.md)                                     | Chromatic Visual Regression, the UI Tests Gate, and the Fake-Bridge Extraction      | Accepted   | 2026-07-25 |
| [0034](0034-screen-level-visual-regression.md)                                  | Screen-Level Visual Regression on the Real Electron Shell, Three-Platform Baselines | Accepted   | 2026-07-25 |
| [0035](0035-release-operations.md)                                              | Release Operations, Unsigned Phase A, and the Homebrew Tap                          | Accepted   | 2026-07-25 |
| [0036](0036-stryker-mutation-gate.md)                                           | Stryker Mutation Gate Over the Node-Tested Surfaces                                 | Accepted   | 2026-07-26 |
| [0037](0037-openspec-artifact-layer.md)                                         | OpenSpec as the Artifact Layer for the Feature Cycle                                | Accepted   | 2026-07-26 |
| [0038](0038-feature-cycle-process.md)                                           | The Feature Cycle as an Executable Process                                          | Accepted   | 2026-07-26 |
| [0039](0039-review-pass-marker-and-path-guard.md)                               | The Review Marker and the Blast-Radius Path Guard                                   | Superseded | 2026-07-27 |
| [0040](0040-edit-time-test-first-gate.md)                                       | The Edit-Time Test-First Gate                                                       | Accepted   | 2026-07-27 |
| [0041](0041-discovery-workflow-and-citation-validator.md)                       | The Discovery Workflow and the Citation Validator                                   | Accepted   | 2026-07-28 |
| [0042](0042-no-worktree-setup-script.md)                                        | Worktree Seeding Stays with the Toolchain                                           | Accepted   | 2026-07-28 |
| [0043](0043-hig-audit-and-tailwind-rules.md)                                    | Three Layers for Apple Interface Conformance                                        | Accepted   | 2026-07-29 |
| [0044](0044-base-ui-shared-component-base.md)                                   | Base UI as the Base of the Shared Kit                                               | Accepted   | 2026-07-29 |
| [0045](0045-launch-at-login-absent-on-linux.md)                                 | Launch at Login Never Renders on Linux                                              | Accepted   | 2026-07-29 |
| [0046](0046-open-config-folder-over-reveal.md)                                  | The Config Folder Opens Through shell.openPath                                      | Accepted   | 2026-07-29 |
| [0047](0047-gateway-token-vault-and-clipboard.md)                               | The Gateway Token Lives in the Vault and Copies Through Main                        | Accepted   | 2026-07-29 |
| [0048](0048-visual-baselines-regenerate-from-a-label.md)                        | Visual Baselines Regenerate From a Pull-Request Label                               | Accepted   | 2026-07-29 |
| [0049](0049-stories-guard-runs-before-the-pull-request.md)                      | The Stories Guard Runs Before the Pull Request                                      | Accepted   | 2026-07-29 |
| [0050](0050-patch-coverage-target-moves-to-95.md)                               | The Patch Coverage Target Moves to 95 Percent                                       | Accepted   | 2026-07-29 |
| [0051](0051-the-review-status-guard-stops-blocking-the-merge.md)                | The Adversarial Review Leaves Continuous Integration                                | Accepted   | 2026-07-30 |
| [0052](0052-the-dev-entry-point-fetches-the-electron-binary.md)                 | The Dev Entry Point Fetches the Electron Binary                                     | Accepted   | 2026-07-30 |
| [0053](0053-flow-green-is-a-canvas-token-the-palette-does-not-carry-yet.md)     | Flow Green Is a Canvas Token the Palette Doesn't Carry Yet                          | Accepted   | 2026-07-30 |
| [0054](0054-a-newer-settings-document-is-a-typed-failure.md)                    | A Newer Settings Document Is a Typed Failure, Not Damage                            | Accepted   | 2026-07-30 |
| [0055](0055-app-icon-identity-and-recompose-presentation.md)                    | The App Icon Identity and the Recompose Presentation                                | Accepted   | 2026-07-30 |
| [0056](0056-each-gateway-owns-its-own-loopback-port.md)                         | Each Gateway Owns Its Own Loopback Port                                             | Accepted   | 2026-07-31 |
| [0057](0057-the-engine-serves-over-hono.md)                                     | The Engine Serves Over Hono                                                         | Accepted   | 2026-07-31 |
| [0058](0058-lifecycle-state-pushes-over-a-typed-event-map.md)                   | Lifecycle State Pushes Over a Typed Event Map                                       | Accepted   | 2026-07-31 |
| [0059](0059-the-slug-rule-tightens-to-a-device-safe-identifier.md)              | The Slug Rule Tightens to a Bounded, Device-Safe Identifier                         | Accepted   | 2026-07-31 |
| [0060](0060-the-permission-policy-allows-one-clipboard-write.md)                | The Permission Policy Allows One Clipboard Write                                    | Accepted   | 2026-07-31 |
| [0061](0061-the-slug-comes-from-the-name.md)                                    | The Slug Comes From the Name, Folded by Hand                                        | Accepted   | 2026-07-31 |
| [0062](0062-a-schema-version-names-one-shape.md)                                | A Schema Version Names One Shape, and Every Store Reads It First                    | Accepted   | 2026-07-31 |
| [0063](0063-gateway-ports-come-from-a-recompose-band.md)                        | Gateway Ports Come From a recompose Band, Not the Ephemeral Pool                    | Accepted   | 2026-07-31 |
| [0064](0064-the-window-controls-follow-the-sidebar.md)                          | The Window Controls Follow the Sidebar                                              | Accepted   | 2026-07-31 |
| [0065](0065-view-state-stays-in-the-renderer.md)                                | View State Stays in the Renderer, Apart From the Settings Document                  | Accepted   | 2026-07-31 |
| [0066](0066-a-report-names-the-directive-it-answers.md)                         | A Report Names the Directive It Answers                                             | Accepted   | 2026-08-01 |
| [0067](0067-paperwork-events-run-in-their-own-lane.md)                          | Title and Label Events Run in Their Own Concurrency Lane                            | Accepted   | 2026-08-01 |
| [0068](0068-the-standing-sidebar-carries-its-own-control.md)                    | The Standing Sidebar Carries the Control That Puts It Away                          | Accepted   | 2026-08-01 |
| [0069](0069-subscriptions-delegate-to-the-providers-tool.md)                    | Subscriptions Delegate to the Provider's Tool, and Custody Follows Each Platform    | Superseded | 2026-08-02 |
| [0070](0070-key-checks-live-in-the-engine-child.md)                             | Key Checks Live in the Engine Child                                                 | Accepted   | 2026-08-03 |
| [0071](0071-tanstack-form-carries-the-renderer-drafts.md)                       | TanStack Form Carries the Renderer Drafts                                           | Accepted   | 2026-08-03 |
| [0072](0072-a-local-runtime-account-is-a-credential-free-observation.md)        | A Local Runtime Account Is a Credential-Free Observation                            | Accepted   | 2026-08-04 |
| [0073](0073-the-aggregator-connects-as-a-key-and-offers-no-check.md)            | The Aggregator Connects as a Key and Offers No Check                                | Accepted   | 2026-08-04 |
| [0074](0074-brand-marks-come-from-lobehub-icons.md)                             | Brand Marks Come From Lobe Icons, Drawn as Nominative Use                           | Accepted   | 2026-08-04 |
| [0075](0075-dialect-translation-folds-through-an-anthropic-messages-hub.md)     | Dialect Translation Folds Through an Anthropic-Messages Hub                         | Accepted   | 2026-08-05 |
| [0076](0076-dialect-translation-reaches-a-valid-target-or-refuses-typed.md)     | Dialect Translation Reaches a Valid Target or Refuses Typed                         | Accepted   | 2026-08-05 |
| [0077](0077-bindings-ride-the-directive-and-secrets-ride-per-request-grants.md) | Bindings Ride the Directive, and Secrets Ride Per-Request Grants                    | Accepted   | 2026-08-06 |
| [0078](0078-an-absent-model-is-404-and-broken-backing-is-502.md)                | An Absent Model Is 404, and Broken Backing Is 502                                   | Accepted   | 2026-08-06 |
| [0079](0079-tests-and-snapshots-run-with-reduced-motion.md)                     | Tests and Snapshots Run With Reduced Motion                                         | Accepted   | 2026-08-06 |
| [0080](0080-subscriptions-spend-through-provider-native-transports.md)          | Subscriptions Spend Through Provider-Native Transports in the Engine Child          | Accepted   | 2026-08-06 |
| [0081](0081-router-engine-parity-is-deferred-with-a-source-map.md)              | Router Engine Parity Waits for Its Feature                                          | Accepted   | 2026-08-07 |
| [0082](0082-gemini-is-a-client-and-provider-dialect.md)                         | Gemini Is a Client and Provider Dialect                                             | Accepted   | 2026-08-07 |
| [0083](0083-the-storage-watcher-startup-window-stays-accepted.md)               | The Storage Watcher Startup Window Stays Accepted                                   | Accepted   | 2026-08-08 |
| [0084](0084-the-gateway-canvas-adopts-xyflow-react.md)                          | The Gateway Canvas Adopts @xyflow/react                                             | Accepted   | 2026-08-09 |
| [0085](0085-window-chrome-drags-and-its-controls-opt-out.md)                    | Window Chrome Drags, and Its Controls Opt Out                                       | Accepted   | 2026-08-10 |
| [0086](0086-the-log-list-adopts-tanstack-react-virtual.md)                      | The Log List Adopts `@tanstack/react-virtual`                                       | Accepted   | 2026-08-10 |
| [0087](0087-usage-ledger-pricing-and-chart-tokens.md)                           | Usage Ledger in Main, LiteLLM Pricing, Poll-Over-Push, and the Chart Tokens         | Accepted   | 2026-08-12 |
| [0088](0088-the-categorical-series-scale.md)                                    | The Categorical Series Scale                                                        | Accepted   | 2026-08-12 |
| [0089](0089-the-mutation-scope-follows-the-test-world.md)                       | The Mutation Scope Follows the Test World                                           | Accepted   | 2026-08-12 |
| [0090](0090-the-usage-window-filters-and-its-calendar.md)                       | The Usage Window, Its Filters, and the Calendar That Draws It                       | Accepted   | 2026-08-12 |
| [0091](0091-the-explorer-conforms-to-its-drawings.md)                           | The Explorer Conforms to Its Drawings                                               | Accepted   | 2026-08-13 |
| [0092](0092-the-axis-stands-for-the-window.md)                                  | The Axis Stands for the Window, and a Quiet Window Says So                          | Accepted   | 2026-08-13 |
| [0093](0093-the-browser-suite-collects-between-files.md)                        | The Browser Suite Collects Between Files                                            | Superseded | 2026-08-13 |
| [0094](0094-the-browser-suite-collects-every-tenth-file.md)                     | The Browser Suite Collects Every Tenth File                                         | Superseded | 2026-08-13 |
| [0095](0095-the-pipeline-reads-what-the-diff-touched.md)                        | The Pipeline Reads What the Diff Touched                                            | Accepted   | 2026-08-13 |
| [0096](0096-the-report-carries-its-open-hour.md)                                | The Report Carries Its Open Hour                                                    | Accepted   | 2026-08-13 |
| [0097](0097-the-poll-pace-follows-the-surface.md)                               | The Poll Pace Follows the Surface, Not the Range                                    | Accepted   | 2026-08-13 |
| [0098](0098-one-directory-names-every-vendor-endpoint.md)                       | One Directory Names Every Vendor Endpoint, and a Row May Carry Its Own              | Accepted   | 2026-08-13 |
| [0099](0099-a-look-asks-the-runtime-own-path.md)                                | A Look Asks the Runtime's Own Path                                                  | Accepted   | 2026-08-13 |
| [0100](0100-a-coding-plan-stands-in-one-catalog-and-stores-as-another.md)       | A Coding Plan Stands in One Catalog and Stores as Another                           | Accepted   | 2026-08-13 |
| [0101](0101-recompose-runs-copilot-device-flow.md)                              | recompose Runs Copilot's Device Flow Itself                                         | Accepted   | 2026-08-13 |
| [0102](0102-the-browser-suite-collects-every-fifth-file.md)                     | The Browser Suite Collects Every Fifth File                                         | Accepted   | 2026-08-13 |
| [0103](0103-the-patch-gate-asks-for-ninety.md)                                  | The Patch Gate Asks for Ninety                                                      | Accepted   | 2026-08-14 |
| [0104](0104-a-window-names-the-range-it-stands-on.md)                           | A Window Names the Range It Stands On                                               | Accepted   | 2026-08-14 |
| [0105](0105-two-ways-in-read-as-two-rows.md)                                    | Two Ways into a Plan Read as Two Rows                                               | Accepted   | 2026-08-14 |
| [0106](0106-a-gateway-carries-its-own-key.md)                                   | A Gateway Carries Its Own Key, in Its Own Document                                  | Accepted   | 2026-08-14 |
| [0107](0107-a-port-is-where-a-server-answers-today.md)                          | A port is where a server answers today                                              | Accepted   | 2026-08-14 |
| [0108](0108-a-baseline-compares-the-design-not-the-runner.md)                   | A baseline compares the design, not the runner                                      | Accepted   | 2026-08-14 |
| [0109](0109-a-scenario-refuses-to-pass-vacuously.md)                            | A scenario refuses to pass vacuously                                                | Accepted   | 2026-08-14 |
| [0110](0110-desktop-jobs-run-when-desktop-can-change.md)                        | Desktop Jobs Run When Desktop Can Change                                            | Accepted   | 2026-08-14 |
| [0111](0111-the-public-site-builds-to-files.md)                                 | The Public Site Builds to Files                                                     | Accepted   | 2026-08-14 |
| [0112](0112-a-swept-vault-never-takes-a-row-with-it.md)                         | A swept vault never takes a row with it                                             | Accepted   | 2026-08-14 |
| [0113](0113-a-router-walks-an-id-keyed-table.md)                                | A router walks an id-keyed table, one attempt at a time                             | Accepted   | 2026-08-14 |
| [0114](0114-the-serving-suite-answers-from-a-scripted-upstream.md)              | The serving suite answers from a scripted upstream                                  | Accepted   | 2026-08-14 |
| [0115](0115-a-docstring-earns-its-place-by-content.md)                          | A docstring earns its place by content, not by visibility                           | Accepted   | 2026-08-15 |
| [0116](0116-a-first-event-has-a-deadline-the-gateway-owns.md)                   | A first event has a deadline the gateway owns                                       | Accepted   | 2026-08-15 |
| [0117](0117-every-test-project-restates-its-pacing.md)                          | Every test project restates its pacing                                              | Accepted   | 2026-08-15 |
| [0118](0118-a-scenario-folder-carries-its-checkout.md)                          | A scenario's folder carries its checkout                                            | Accepted   | 2026-08-15 |
| [0119](0119-a-pointer-target-may-exceed-its-visible-ink.md)                     | A pointer target may exceed its visible ink                                         | Accepted   | 2026-08-15 |
| [0120](0120-a-run-clears-what-the-last-one-stranded.md)                         | A run clears what the last one stranded                                             | Accepted   | 2026-08-15 |
| [0121](0121-a-streamed-answer-rides-a-transport-recompose-owns.md)              | A streamed answer rides a transport recompose owns                                  | Accepted   | 2026-08-15 |
| [0122](0122-a-launch-decides-whether-its-window-shows.md)                       | A launch decides whether its window shows                                           | Accepted   | 2026-08-15 |
| [0123](0123-a-strictness-guard-asks-every-question-its-rebuild-answers.md)      | A strictness guard asks every question its rebuild answers                          | Accepted   | 2026-08-15 |
| [0124](0124-a-signed-block-replays-only-to-its-own-account.md)                  | A signed thinking block replays only to the account that minted it                  | Accepted   | 2026-08-15 |
| [0125](0125-a-mutated-module-holds-no-hooks.md)                                 | A mutated module holds no hooks                                                     | Accepted   | 2026-08-15 |
| [0126](0126-a-card-born-without-a-pointer-takes-the-canvas-next-seat.md)        | A card born without a pointer takes the canvas's own next seat                      | Accepted   | 2026-08-15 |
| [0127](0127-a-plus-brings-the-card-it-stands-into-view.md)                      | A plus brings the card it stands into view                                          | Accepted   | 2026-08-15 |
| [0128](0128-a-gate-reads-the-text-that-lands.md)                                | A gate reads the text that lands                                                    | Accepted   | 2026-08-15 |
| [0129](0129-an-optional-spread-carries-one-mutant-no-test-can-kill.md)          | An optional spread carries one mutant no test can kill                              | Accepted   | 2026-08-15 |
| [0130](0130-recompose-runs-the-authorization-no-tool-on-the-machine-owns.md)    | recompose runs the authorization no tool on the machine owns                        | Accepted   | 2026-08-16 |
| [0131](0131-choosing-an-account-moves-the-tool-never-the-traffic.md)            | Choosing an account moves the tool, never the traffic                               | Accepted   | 2026-08-16 |
| [0132](0132-a-client-setup-comes-from-the-gateway-in-front-of-it.md)            | A client setup comes from the gateway in front of it                                | Accepted   | 2026-08-16 |
| [0133](0133-an-update-arrives-through-the-channel-that-installed-it.md)         | An update arrives through the channel that installed it                             | Accepted   | 2026-08-16 |
| [0134](0134-actual-size-takes-the-plain-reset-chord.md)                         | The plain reset chord lands on 100%                                                 | Accepted   | 2026-08-17 |
| [0135](0135-gateway-lifecycle-stays-main-side.md)                               | Gateway lifecycle stays main-side                                                   | Accepted   | 2026-08-17 |
| [0136](0136-a-packaged-run-attaches-no-window-input-guard.md)                   | A packaged run attaches no window input guard                                       | Accepted   | 2026-08-17 |
| [0137](0137-the-store-hands-out-the-installer-recompose-already-signs.md)       | The Store hands out the installer recompose already signs                           | Accepted   | 2026-08-17 |
| [0138](0138-a-macos-artifact-per-architecture-one-manifest-between-them.md)     | A macOS artifact per architecture, one manifest between them                        | Accepted   | 2026-08-17 |
| [0139](0139-the-cask-follows-the-per-architecture-signed-release.md)            | The cask follows the per-architecture signed release                                | Accepted   | 2026-08-17 |
| [0140](0140-the-cable-into-a-router-borrows-the-newest-reading-below-it.md)     | The cable into a router borrows the newest reading below it                         | Accepted   | 2026-08-18 |
| [0141](0141-a-download-lands-from-the-products-own-address.md)                  | A download lands from the product's own address                                     | Accepted   | 2026-08-18 |
| [0142](0142-the-changelog-lives-in-the-repository.md)                           | The changelog lives in the repository                                               | Accepted   | 2026-08-18 |
| [0143](0143-the-site-answers-at-one-address.md)                                 | The site answers at one address                                                     | Accepted   | 2026-08-18 |
| [0144](0144-a-gateway-binds-the-address-the-settings-hold.md)                   | A gateway binds the address the settings hold                                       | Accepted   | 2026-08-18 |
| [0145](0145-the-row-and-the-caller-read-one-sentence.md)                        | The row and the caller read one sentence                                            | Accepted   | 2026-08-18 |
| [0146](0146-the-site-deploys-from-ci-on-two-triggers.md)                        | The site deploys from CI on two triggers                                            | Accepted   | 2026-08-20 |
| [0147](0147-the-license-gate-reads-what-a-release-installs.md)                  | The license gate reads what a release installs                                      | Accepted   | 2026-08-20 |
| [0148](0148-the-docs-and-its-search-answer-from-the-build.md)                   | The docs and its search answer from the build                                       | Accepted   | 2026-08-20 |
| [0149](0149-the-ruleset-file-holds-the-checks-that-can-report.md)               | The ruleset file holds the checks that can report                                   | Accepted   | 2026-08-20 |
| [0150](0150-the-release-build-signs-without-a-network-monitor.md)               | The release build signs without a network monitor                                   | Accepted   | 2026-08-20 |
| [0151](0151-the-release-builds-its-own-signing-keychain.md)                     | The release builds its own signing keychain                                         | Superseded | 2026-08-20 |
| [0152](0152-signing-stops-waiting-on-a-revocation-answer.md)                    | Signing stops waiting on a revocation answer                                        | Superseded | 2026-08-21 |
| [0153](0153-the-workspace-installs-every-architecture-a-release-ships.md)       | The workspace installs every architecture a release ships                           | Accepted   | 2026-08-21 |
| [0154](0154-the-mac-leg-waits-for-apples-notary.md)                             | The mac leg waits for Apple's notary                                                | Accepted   | 2026-08-21 |
| [0155](0155-the-browser-install-follows-the-tests-that-need-it.md)              | The browser install follows the tests that need it                                  | Accepted   | 2026-08-21 |
| [0156](0156-the-release-asks-the-notary-on-its-own-schedule.md)                 | The release asks the notary on its own schedule                                     | Superseded | 2026-08-21 |
| [0157](0157-the-mac-leg-goes-back-to-the-standard-flow.md)                      | The mac leg goes back to the standard flow                                          | Accepted   | 2026-08-21 |
| [0158](0158-a-judge-that-reaches-no-verdict-refuses.md)                         | A judge that reaches no verdict refuses the request                                 | Accepted   | 2026-08-22 |
| [0159](0159-a-spread-conversation-keeps-the-account-it-opened-on.md)            | A spread conversation keeps the account it opened on                                | Accepted   | 2026-08-22 |
| [0160](0160-a-model-id-reaches-claude-codes-picker-by-name.md)                  | A model id reaches Claude Code's picker by name                                     | Accepted   | 2026-08-22 |
| [0161](0161-the-mutation-gate-scopes-itself-from-its-own-config.md)             | The mutation gate scopes itself from its own config                                 | Accepted   | 2026-08-22 |
| [0162](0162-vitest-refuses-to-run-from-the-repository-root.md)                  | Vitest refuses to run from the repository root                                      | Accepted   | 2026-08-23 |
| [0163](0163-a-plan-reads-its-own-share-off-the-answer-it-just-gave.md)          | A plan reads its own share off the answer it just gave                              | Accepted   | 2026-08-23 |
| [0164](0164-the-request-log-names-its-columns-and-answers-one-stroke.md)        | The request log names its columns and answers one stroke                            | Accepted   | 2026-08-23 |
| [0165](0165-an-account-can-hold-a-second-key-that-only-reads.md)                | An account can hold a second key that only reads                                    | Accepted   | 2026-08-23 |
| [0166](0166-a-gemini-answer-crosses-as-runs-not-as-chunks.md)                   | A Gemini answer crosses as runs, not as chunks                                      | Accepted   | 2026-08-23 |
| [0167](0167-a-block-no-vendor-will-read-comes-off-the-way-out.md)               | A block no vendor will read comes off on the way out                                | Accepted   | 2026-08-23 |
| [0168](0168-copilot-answers-on-the-wire-its-own-catalog-names.md)               | Copilot answers on the wire its own catalog names                                   | Accepted   | 2026-08-23 |
| [0169](0169-a-refusal-that-names-its-own-remedy-earns-one-more-turn.md)         | A refusal that names its own remedy earns one more turn                             | Accepted   | 2026-08-23 |
| [0170](0170-one-dependencys-sourcemap-warning-goes-by-name.md)                  | One dependency's sourcemap warning goes by name                                     | Accepted   | 2026-08-23 |
| [0171](0171-the-landing-call-names-the-visitors-platform.md)                    | The landing call names the visitor's platform                                       | Accepted   | 2026-08-24 |
| [0172](0172-the-tool-probe-asks-an-interactive-login-shell.md)                  | The tool probe asks an interactive login shell                                      | Accepted   | 2026-08-24 |
| [0173](0173-asking-for-a-sign-in-code-is-an-act.md)                             | Asking for a sign-in code is an act, never a reading                                | Accepted   | 2026-08-24 |
