import type { SubscriptionProviderId } from '@recompose/contracts';

import { describe, expect, test } from 'vitest';

import {
  readySubscriptionCredential,
  refreshedAndPersisted,
  shouldRefreshUnauthorized,
} from './reach-credential';

const nearingExpiry = JSON.stringify({
  claudeAiOauth: {
    accessToken: 'claude-access',
    refreshToken: 'claude-refresh',
    expiresAt: 1_000,
  },
});

function aRuntime() {
  const asked: string[] = [];
  const persisted: string[] = [];

  return {
    asked,
    persisted,
    runtime: {
      refreshFetch: async (url: string) => {
        asked.push(url);

        return Promise.resolve(
          new Response(
            JSON.stringify({
              access_token: 'rotated',
              refresh_token: 'rotated',
              expires_in: 28_800,
            }),
          ),
        );
      },
      persist: async (
        _provider: SubscriptionProviderId,
        _accountId: string,
        credential: string,
      ) => {
        persisted.push(credential);

        return Promise.resolve();
      },
      now: () => 1_000_000,
    },
  };
}

function aSpend(renewal: 'app' | 'owning-tool') {
  return {
    provider: 'anthropic' as const,
    accountId: 'acc-one',
    credential: nearingExpiry,
    renewal,
  };
}

describe('who renews the credential a serving turn rides on', () => {
  test('given an account the app adopted, an expiring credential is served untouched', async () => {
    const { asked, runtime } = aRuntime();

    const ready = await readySubscriptionCredential(aSpend('owning-tool'), runtime);

    expect(ready.blob).toBe(nearingExpiry);
    expect(asked).toEqual([]);
  });

  test('given an account the app adopted, nothing is persisted over the live store', async () => {
    const { persisted, runtime } = aRuntime();

    await readySubscriptionCredential(aSpend('owning-tool'), runtime);

    expect(persisted).toEqual([]);
  });

  test('given an account the app signed in, an expiring credential is renewed by the app', async () => {
    const { asked, runtime } = aRuntime();

    const ready = await readySubscriptionCredential(aSpend('app'), runtime);

    expect(asked).not.toEqual([]);
    expect(ready.blob).not.toBe(nearingExpiry);
  });

  test('given an account the app adopted, a refusal never spends the refresh token', () => {
    const answer = new Response('', { status: 401 });
    const credential = { accessToken: 'claude-access', refreshToken: 'claude-refresh' };

    expect(shouldRefreshUnauthorized(answer, credential, 'owning-tool')).toBe(false);
  });

  test('given an account the app signed in, a refusal still renews once', () => {
    const answer = new Response('', { status: 401 });
    const credential = { accessToken: 'claude-access', refreshToken: 'claude-refresh' };

    expect(shouldRefreshUnauthorized(answer, credential, 'app')).toBe(true);
  });

  test('given an account the app adopted, renewing it outright refuses rather than proceeding', async () => {
    const { runtime } = aRuntime();

    await expect(
      refreshedAndPersisted(aSpend('owning-tool'), nearingExpiry, runtime),
    ).rejects.toThrow('owns');
  });
});
