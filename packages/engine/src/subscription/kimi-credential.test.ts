import { describe, expect, test } from 'vitest';

import { parseSubscriptionCredential, refreshedCredentialBlob } from './credentials';

function jwtWith(claims: Record<string, unknown>): string {
  return `header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`;
}

describe('reading the credential a Kimi plan hands over', () => {
  test('the flat document exposes its tokens, its device and the token expiry it stamps', () => {
    const parsed = parseSubscriptionCredential(
      'kimi',
      JSON.stringify({
        type: 'kimi',
        access_token: 'kimi-access',
        refresh_token: 'kimi-refresh',
        device_id: 'device-1',
        expired: '2027-01-01T00:00:00.000Z',
      }),
    );

    expect(parsed).toEqual({
      accessToken: 'kimi-access',
      refreshToken: 'kimi-refresh',
      deviceIds: ['device-1'],
      expiresAt: Date.parse('2027-01-01T00:00:00.000Z'),
    });
  });

  test('a document stamping no expiry reads it off the access token itself', () => {
    const parsed = parseSubscriptionCredential(
      'kimi',
      JSON.stringify({
        type: 'kimi',
        access_token: jwtWith({ exp: 1_800_000_000 }),
        refresh_token: 'kimi-refresh',
      }),
    );

    expect(parsed?.expiresAt).toBe(1_800_000_000_000);
  });

  test('a document holding no access token reads as no credential at all', () => {
    expect(
      parseSubscriptionCredential('kimi', JSON.stringify({ type: 'kimi', refresh_token: 'r' })),
    ).toBeNull();
  });

  test('the Codex nesting is not what a Kimi document is read as', () => {
    expect(
      parseSubscriptionCredential(
        'kimi',
        JSON.stringify({ tokens: { access_token: 'nested-access' } }),
      ),
    ).toBeNull();
  });
});

describe('renewing the credential a Kimi plan hands over', () => {
  test('a renewed Kimi credential keeps the flat shape it was read in', () => {
    const renewed = refreshedCredentialBlob(
      'kimi',
      JSON.stringify({
        type: 'kimi',
        access_token: 'old-access',
        refresh_token: 'old-refresh',
        device_id: 'device-1',
      }),
      { accessToken: 'new-access', refreshToken: 'new-refresh', expiresInSeconds: 900 },
      1_800_000_000_000,
    );

    expect(JSON.parse(renewed)).toEqual({
      type: 'kimi',
      access_token: 'new-access',
      refresh_token: 'new-refresh',
      device_id: 'device-1',
      expired: new Date(1_800_000_000_000 + 900_000).toISOString(),
    });
  });

  test('a renewal that mints no fresh refresh token keeps the one it was handed', () => {
    const renewed = refreshedCredentialBlob(
      'kimi',
      JSON.stringify({ type: 'kimi', access_token: 'old-access', refresh_token: 'old-refresh' }),
      { accessToken: 'new-access', expiresInSeconds: 900 },
      1_800_000_000_000,
    );

    expect(JSON.parse(renewed)).toMatchObject({ refresh_token: 'old-refresh' });
  });
});
