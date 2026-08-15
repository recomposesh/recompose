import { describe, expect, test } from 'vitest';

import type { SubscriptionWireFetch } from './provider-transport';

import { fetchClaudeProfile, sendSubscriptionRequest } from './provider-transport';
import { requestTo, streamOf } from './provider-transport.testkit';

function profileFetch(status: number, payload: string): SubscriptionWireFetch {
  return async () => {
    await Promise.resolve();

    return {
      status,
      statusText: 'OK',
      headers: [['content-type', 'application/json']],
      body: streamOf(payload),
    };
  };
}

function emptyUpstream(): SubscriptionWireFetch {
  return async () => {
    await Promise.resolve();

    return { status: 204, headers: [['x-origin', 'openai']], body: null };
  };
}

describe('subscription request delivery', () => {
  test('a provider that needs no unwrapping answers with the upstream response', async () => {
    const response = await sendSubscriptionRequest(
      'openai',
      requestTo('https://chatgpt.com/backend-api/codex/responses'),
      emptyUpstream(),
    );

    expect(response.status).toBe(204);
    expect(response.statusText).toBe('');
    expect(response.headers.get('x-origin')).toBe('openai');
  });
});

describe('Claude OAuth profile', () => {
  test('a profile carrying an account identifier is returned', async () => {
    const profile = await fetchClaudeProfile(
      'token-1',
      profileFetch(200, '{"account":{"uuid":"5b2c-uuid"}}'),
    );

    expect(profile).toEqual({ account: { uuid: '5b2c-uuid' } });
  });

  test('a rejected profile request reports the upstream status', async () => {
    await expect(fetchClaudeProfile('token-1', profileFetch(401, '{}'))).rejects.toThrow(
      'status 401',
    );
  });

  test('a profile without a usable account identifier is refused', async () => {
    const payloads = ['"text"', '{"account":"none"}', '{"account":{"uuid":"   "}}', '{}'];

    for (const payload of payloads) {
      await expect(fetchClaudeProfile('token-1', profileFetch(200, payload))).rejects.toThrow(
        'account UUID is empty',
      );
    }
  });
});
