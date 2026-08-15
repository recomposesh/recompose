import type { WreqInit } from 'node-wreq';

import { gzipSync } from 'node:zlib';
import { describe, expect, it, vi } from 'vitest';

import {
  subscriptionRefreshFetch,
  subscriptionRefreshTransportOptions,
} from './provider-transport';
import { streamOf } from './provider-transport.testkit';

const CLAUDE_TOKEN_URL = 'https://platform.claude.com/v1/oauth/token';
const CODEX_TOKEN_URL = 'https://auth.openai.com/oauth/token';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

const wire = vi.hoisted(() => {
  const calls: { url: string; init: WreqInit }[] = [];
  const answers: Response[] = [];

  return {
    calls,
    answer: (response: Response): void => {
      answers.push(response);
    },
    fetch: async (url: string, init: WreqInit): Promise<Response> => {
      await Promise.resolve();
      calls.push({ url, init });

      return answers.shift() ?? new Response(null, { status: 500 });
    },
  };
});

vi.mock('node-wreq', () => ({ fetch: wire.fetch }));

type Renewal = Parameters<typeof subscriptionRefreshFetch>[1];

function renewal(): Renewal {
  return { method: 'POST', headers: [], body: 'grant_type=refresh_token' };
}

describe('the transport a token renewal travels on', () => {
  it('should renew a Claude token on the captured control-plane handshake', () => {
    expect(subscriptionRefreshTransportOptions(CLAUDE_TOKEN_URL)).toMatchObject({
      http1Only: true,
      tlsSessionCacheCapacity: 8,
    });
  });

  it('should renew a Codex token on the browser profile Claude never uses', () => {
    expect(subscriptionRefreshTransportOptions(CODEX_TOKEN_URL)).toEqual({
      browser: { mode: 'fixed', profile: 'chrome_149', platform: 'macos' },
      disableDefaultHeaders: true,
    });
  });

  it('should renew a Google token on the browser profile Claude never uses', () => {
    expect(subscriptionRefreshTransportOptions(GOOGLE_TOKEN_URL)).toEqual({
      browser: { mode: 'fixed', profile: 'chrome_149', platform: 'macos' },
      disableDefaultHeaders: true,
    });
  });

  it("should count a vendor's bare domain as the vendor, not only its subdomains", () => {
    expect(subscriptionRefreshTransportOptions('https://claude.com/v1/oauth/token')).toMatchObject({
      tlsSessionCacheCapacity: 8,
    });
    expect(
      subscriptionRefreshTransportOptions('https://anthropic.com/api/oauth/profile'),
    ).toMatchObject({ tlsSessionCacheCapacity: 8 });
  });
});

describe('a token renewal sent over the wire', () => {
  it('should carry the renewal request on the handshake its vendor asks for', async () => {
    const request = renewal();

    wire.answer(new Response('{"access_token":"renewed"}'));

    await subscriptionRefreshFetch(CLAUDE_TOKEN_URL, request);

    expect(wire.calls.at(-1)).toEqual({
      url: CLAUDE_TOKEN_URL,
      init: {
        ...subscriptionRefreshTransportOptions(CLAUDE_TOKEN_URL),
        ...request,
        retry: 0,
        throwHttpErrors: false,
      },
    });
  });

  it('should hand a refused renewal back rather than raising it', async () => {
    wire.answer(new Response('{"error":"invalid_grant"}', { status: 400 }));

    const response = await subscriptionRefreshFetch(CLAUDE_TOKEN_URL, renewal());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'invalid_grant' });
  });

  it('should decode a compressed Claude renewal before the caller reads it', async () => {
    const payload = '{"access_token":"renewed"}';

    wire.answer(
      new Response(streamOf(gzipSync(payload)), { headers: { 'content-encoding': 'gzip' } }),
    );

    const response = await subscriptionRefreshFetch(CLAUDE_TOKEN_URL, renewal());

    await expect(response.json()).resolves.toEqual(JSON.parse(payload));
  });

  it('should leave a Codex renewal exactly as the wire answered it', async () => {
    const payload = '{"access_token":"renewed"}';

    wire.answer(new Response(payload, { headers: { 'content-length': String(payload.length) } }));

    const response = await subscriptionRefreshFetch(CODEX_TOKEN_URL, renewal());

    expect(response.headers.get('content-length')).toBe(String(payload.length));
  });
});
