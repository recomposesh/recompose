import { defineConfig } from '@playwright/test';
import { join } from 'node:path';
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

/**
 * The slice of the suite this run owns, read from the environment rather than the command line.
 *
 * @summary `pnpm run` forwards extra arguments with the `--` separator still attached, and
 * Playwright reads everything past a bare `--` as a file filter rather than as flags. A shard
 * passed that way silently runs the whole suite and then refuses. The environment carries no such
 * separator, and it reaches bash and PowerShell the same way.
 */
function countsAsAShardNumber(value: number | undefined): value is number {
  return value !== undefined && Number.isInteger(value) && value > 0;
}

function shardOwned(): { current: number; total: number } | undefined {
  const [current, total] = (process.env['E2E_SHARD'] ?? '').split('/').map(Number);

  return countsAsAShardNumber(current) && countsAsAShardNumber(total)
    ? { current, total }
    : undefined;
}

export default defineConfig({
  globalSetup: './global-setup.ts',
  timeout: 30_000,
  workers: ELECTRON_LAUNCHES_AT_ONCE,
  shard: shardOwned() ?? null,
  retries: process.env['CI'] === undefined ? 1 : 2,
  use: { trace: 'on-first-retry' },
  snapshotPathTemplate: '{testDir}/{testFilePath}-snapshots/{arg}-{platform}{ext}',
  /* visual.css pins how glyphs rasterize, so a baseline can be compared exactly again. */
  expect: {
    toHaveScreenshot: { maxDiffPixels: 0, stylePath: join(__dirname, 'visual.css') },
  },
  projects: [
    { name: 'acceptance', testDir: acceptanceDir },
    { name: 'proofs', testMatch: /boot-proof\.spec\.ts/ },
    { name: 'leak', testMatch: /leak\.spec\.ts/ },
    { name: 'packaged', testMatch: /packaged-(smoke|icons)\.spec\.ts/, timeout: 120_000 },
    { name: 'visual', testMatch: /visual\.spec\.ts/ },
  ],
});
