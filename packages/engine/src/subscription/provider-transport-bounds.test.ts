import type { SubscriptionProviderId } from '@recompose/contracts';
import type { WreqInit } from 'node-wreq';

import { proxyFetchBoundMs } from '@recompose/contracts';
import { describe, expect, it } from 'vitest';

import type { SubscriptionWireFetch } from './provider-transport';

import { providerSilenceBoundMs } from '../provider-bounds';
import { sendSubscriptionRequest, subscriptionRefreshTransportOptions } from './provider-transport';

function recordingUpstream(): { init: () => WreqInit; wire: SubscriptionWireFetch } {
  let seen: WreqInit = {};

  return {
    init: () => seen,
    wire: async (_url, init) => {
      await Promise.resolve();
      seen = init;

      return { status: 200, headers: [], body: null };
    },
  };
}

async function boundsCarriedTo(provider: SubscriptionProviderId): Promise<WreqInit> {
  const upstream = recordingUpstream();

  await sendSubscriptionRequest(
    provider,
    { url: 'https://provider.test/v1/messages', headers: [], body: '{}' },
    upstream.wire,
  );

  return upstream.init();
}

describe('the transport a subscription turn travels on', () => {
  it('should give an Anthropic turn as long to answer as any other provider request gets', async () => {
    expect(await boundsCarriedTo('anthropic')).toMatchObject({
      timeout: proxyFetchBoundMs,
      readTimeout: providerSilenceBoundMs,
    });
  });

  it('should give an OpenAI turn as long to answer as any other provider request gets', async () => {
    expect(await boundsCarriedTo('openai')).toMatchObject({
      timeout: proxyFetchBoundMs,
      readTimeout: providerSilenceBoundMs,
    });
  });

  it('should give an Antigravity turn as long to answer as any other provider request gets', async () => {
    expect(await boundsCarriedTo('antigravity')).toMatchObject({
      timeout: proxyFetchBoundMs,
      readTimeout: providerSilenceBoundMs,
    });
  });

  it('should leave a token refresh on the shorter bound it already carried', () => {
    const refresh = subscriptionRefreshTransportOptions(
      'https://accounts.google.com/o/oauth2/token',
    );

    expect(refresh.timeout).toBeUndefined();
    expect(refresh.readTimeout).toBeUndefined();
  });

  it('should wait longer for a whole turn than for any one silence inside it', () => {
    expect(providerSilenceBoundMs).toBeLessThan(proxyFetchBoundMs);
  });
});
