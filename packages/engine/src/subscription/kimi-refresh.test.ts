import { describe, expect, test, vi } from 'vitest';

import type { RefreshRequest } from './refresh-request';

import { credentialNeedsRefresh, refreshSubscriptionCredential } from './refresh';

describe('renewing a Kimi plan credential', () => {
  const kimiBlob = JSON.stringify({
    type: 'kimi',
    access_token: 'old-access',
    refresh_token: 'kimi-refresh',
    device_id: 'device-1',
  });

  test('the renewal asks Kimi own OAuth host, naming the device the tokens were minted for', async () => {
    const asked: { url: string; headers: [string, string][]; body: unknown }[] = [];
    const fetchLike = vi.fn(async (url: string, init: RefreshRequest) => {
      asked.push({ url, headers: init.headers, body: init.body });

      return Promise.resolve(
        new Response(
          JSON.stringify({ access_token: 'new-access', refresh_token: 'new', expires_in: 900 }),
          { status: 200 },
        ),
      );
    });

    await refreshSubscriptionCredential('kimi', kimiBlob, fetchLike, 1_800_000_000_000);

    expect(asked[0]?.url).toBe('https://auth.kimi.com/api/oauth/token');
    expect(asked[0]?.body).toBe(
      new URLSearchParams({
        client_id: '17e5f671-d194-4dfb-9706-5516cb48c098',
        grant_type: 'refresh_token',
        refresh_token: 'kimi-refresh',
      }).toString(),
    );
    expect(asked[0]?.headers).toContainEqual(['X-Msh-Device-Id', 'device-1']);
  });
});

describe('what a renewed Kimi plan credential is written back as', () => {
  const kimiBlob = JSON.stringify({
    type: 'kimi',
    access_token: 'old-access',
    refresh_token: 'kimi-refresh',
    device_id: 'device-1',
  });

  test('the renewed credential is written back flat, so the next turn can read it', async () => {
    const fetchLike = vi.fn(async () =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            access_token: 'new-access',
            refresh_token: 'new-refresh',
            expires_in: 900,
          }),
          { status: 200 },
        ),
      ),
    );

    const renewed = await refreshSubscriptionCredential(
      'kimi',
      kimiBlob,
      fetchLike,
      1_800_000_000_000,
    );

    expect(JSON.parse(renewed)).toMatchObject({
      access_token: 'new-access',
      refresh_token: 'new-refresh',
      device_id: 'device-1',
    });
  });
});

describe('when a Kimi plan credential is due for renewal', () => {
  test('a plan whose token nears its fifteen-minute expiry is renewed before the turn', () => {
    const nearingExpiry = { accessToken: 'a', expiresAt: 1_800_000_000_000 };

    expect(credentialNeedsRefresh(nearingExpiry, 1_800_000_000_000 - 60_000, 'kimi')).toBe(true);
    expect(credentialNeedsRefresh(nearingExpiry, 1_800_000_000_000 - 600_000, 'kimi')).toBe(false);
  });
});
