import { describe, expect, test } from 'vitest';

import type { ProjectLookupPort } from './antigravity-project';

import { antigravityProjectFor } from './antigravity-project';

function urlOf(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === 'string') {
    return input;
  }

  return input instanceof URL ? input.href : input.url;
}

describe('an ask the network never carried', () => {
  /**
   * @summary A dropped request is not an answer that names no project, so a sign-in that met one
   * refuses rather than onboarding an account that may already have a project it could not read.
   */
  test('a lookup that threw answers with nothing rather than throwing on', async () => {
    const port: ProjectLookupPort = {
      sleep: async () => Promise.resolve(),
      fetchLike: async () => Promise.reject(new Error('the network is down')),
    };

    await expect(antigravityProjectFor(port, 'goog-token')).resolves.toBeUndefined();
  });

  test('an onboarding the network dropped stops rather than asking four more times', async () => {
    let asks = 0;
    const port: ProjectLookupPort = {
      sleep: async () => Promise.resolve(),
      fetchLike: async (input) => {
        asks += 1;

        if (urlOf(input).includes('onboardUser')) {
          return Promise.reject(new Error('the network is down'));
        }

        return Promise.resolve(
          new Response(JSON.stringify({ allowedTiers: [] }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        );
      },
    };

    await expect(antigravityProjectFor(port, 'goog-token')).resolves.toBeUndefined();
    expect(asks).toBe(2);
  });
});
