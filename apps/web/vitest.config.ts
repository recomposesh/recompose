import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

import { coverageDefaults } from '../../vitest.shared';

// The browser project drives a real Chromium, so it opens where a full answer is wanted rather than
// on every run: continuous integration, and a local run that asks for it by name (ADR-0176).
const browserSuitesOpen =
  process.env['CI'] !== undefined || process.env['RECOMPOSE_BROWSER_TESTS'] === '1';

export default defineConfig({
  test: {
    coverage: coverageDefaults,
    projects: [
      {
        test: {
          name: 'node',
          include: ['src/**/*.test.ts'],
          exclude: ['src/**/*.browser.test.ts'],
        },
      },
      ...(browserSuitesOpen
        ? [
            {
              test: {
                name: 'browser',
                include: ['src/**/*.browser.test.ts'],
                browser: {
                  enabled: true,
                  headless: true,
                  provider: playwright(),
                  instances: [{ browser: 'chromium' as const }],
                },
              },
            },
          ]
        : []),
    ],
  },
});
