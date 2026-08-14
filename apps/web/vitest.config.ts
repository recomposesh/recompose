import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

import { coverageDefaults } from '../../vitest.shared';

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
      {
        test: {
          name: 'browser',
          include: ['src/**/*.browser.test.ts'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
