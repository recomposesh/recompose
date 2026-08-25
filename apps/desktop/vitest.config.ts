import type { BrowserCommand } from 'vitest/node';

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defaultExclude, defineConfig } from 'vitest/config';

import { coverageDefaults } from '../../vitest.shared';

// Chromium keeps every finished test file's memory as files on disk, so a long run fills the
// runner and the browser dies mid-suite: https://github.com/vitest-dev/vitest/issues/9437
const FILES_BETWEEN_COLLECTIONS = 3;

let filesSinceCollection = 0;

const requestGC: BrowserCommand = async (context) => {
  filesSinceCollection += 1;

  if (filesSinceCollection < FILES_BETWEEN_COLLECTIONS) {
    return;
  }

  filesSinceCollection = 0;

  await context.page.requestGC();
};

const browserSetup = ['./vitest.browser-setup.ts'];

const chromium = () => ({
  commands: { requestGC },
  enabled: true,
  headless: true,
  provider: playwright({
    /* A shared runner gives chromium a 64MB /dev/shm, which a long run outgrows and dies on. */
    launchOptions: { args: ['--disable-dev-shm-usage'] },
    contextOptions: {
      permissions: ['clipboard-read', 'clipboard-write'],
      reducedMotion: 'reduce',
    },
  }),
  instances: [{ browser: 'chromium' as const, viewport: { width: 1280, height: 800 } }],
});

// A shared runner starves parallel pages into forty-second click timeouts, and starves a node file
// waiting on a real filesystem read the same way. Every project restates this, because a `projects`
// entry carrying its own `test` block inherits nothing from the root one.
const pacedForCi = process.env['CI'] === undefined ? {} : { fileParallelism: false, retry: 1 };

// Three of the four projects drive a real Chromium and carry the bulk of the battery's wall time.
// They open where a full answer is wanted rather than on every run, and coverage follows them,
// because the thresholds only hold over a battery that ran them (ADR-0176).
const browserSuitesOpen =
  process.env['CI'] !== undefined || process.env['RECOMPOSE_BROWSER_TESTS'] === '1';

export default defineConfig({
  test: {
    ...pacedForCi,
    coverage: {
      ...coverageDefaults,
      enabled: browserSuitesOpen,
      include: ['src/**/*.{ts,tsx}', 'scripts/**/*.mts'],
      exclude: [
        'src/**/*.test.*',
        'src/**/*.testkit.{ts,tsx}',
        'src/**/*.browser.test.*',
        'scripts/**/*.test.mts',
        'scripts/generate-icons.mts',
        'src/renderer/src/shared/testing/**',
        'src/**/*.d.ts',
        'src/main/index.ts',
        'src/main/engine-host/spawn-engine.ts',
        'src/main/usage/price-lookups.ts',
        'src/main/ipc/register-ipc.ts',
        'src/main/menu/app-menu.ts',
        'src/main/protocol/app-protocol.ts',
        'src/main/subscriptions/sign-in-launch.ts',
        'src/main/subscriptions/subscriptions-wiring.ts',
        'src/main/tray/menu-bar-tray.ts',
        'src/main/updates/updater-port.ts',
        'src/main/windows/main-window.ts',
        'src/preload/index.ts',
        'src/renderer/src/app/main.tsx',
        'src/renderer/src/app/routeTree.gen.ts',
        'src/**/*.stories.tsx',
      ],
    },
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          setupFiles: ['../../vitest.sealed-network.ts'],
          include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.mts', 'e2e/**/*.test.{mts,ts}'],
          exclude: [...defaultExclude, '**/*.browser.test.*'],
          ...pacedForCi,
        },
      },
      ...(browserSuitesOpen
        ? [
            {
              plugins: [react()],
              test: {
                name: 'browser',
                include: ['src/renderer/**/*.browser.test.{ts,tsx}'],
                browser: chromium(),
                setupFiles: browserSetup,
                ...pacedForCi,
              },
            },
            {
              plugins: [storybookTest({ configDir: '.storybook' })],
              test: {
                name: 'storybook',
                browser: chromium(),
                setupFiles: browserSetup,
                ...pacedForCi,
              },
            },
            {
              plugins: [
                storybookTest({ configDir: '.storybook', initialGlobals: { theme: 'dark' } }),
              ],
              test: {
                name: 'storybook-dark',
                browser: chromium(),
                setupFiles: browserSetup,
                ...pacedForCi,
              },
            },
          ]
        : []),
    ],
  },
});
