import { defineConfig } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

const acceptanceDir = defineBddConfig({
  features: 'features/**/*.feature',
  steps: ['steps/**/*.ts', 'fixtures.ts'],
  outputDir: '.features-gen',
});

/**
 * How many whole Electron applications one machine can bring up at the same time.
 *
 * @summary Every worker launches an application rather than a browser context. On the shared CI
 * runners the launches starve each other past two, which surfaces as `firstWindow` crossing the
 * test timeout rather than as anything a scenario did. A developer machine takes ten by the
 * maintainer's call; a local `firstWindow` timeout under load reads as this number, not a scenario.
 */
const ELECTRON_LAUNCHES_AT_ONCE = process.env['CI'] === undefined ? 10 : 2;

export default defineConfig({
  timeout: 30_000,
  workers: ELECTRON_LAUNCHES_AT_ONCE,
  retries: process.env['CI'] === undefined ? 1 : 2,
  use: { trace: 'on-first-retry' },
  snapshotPathTemplate: '{testDir}/{testFilePath}-snapshots/{arg}-{platform}{ext}',
  /* The macos runner pool rasterizes fonts unevenly; 1.5% absorbs that and nothing structural. */
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.015 } },
  projects: [
    { name: 'acceptance', testDir: acceptanceDir },
    { name: 'proofs', testMatch: /boot-proof\.spec\.ts/ },
    { name: 'leak', testMatch: /leak\.spec\.ts/ },
    { name: 'packaged', testMatch: /packaged-(smoke|icons)\.spec\.ts/, timeout: 120_000 },
    { name: 'visual', testMatch: /visual\.spec\.ts/ },
  ],
});
