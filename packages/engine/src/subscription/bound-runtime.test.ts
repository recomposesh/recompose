import { describe, expect, it } from 'vitest';

import type { ProviderRequest } from './claude-request';

import { subscriptionRuntimeBoundTo } from './bound-runtime';
import { subscriptionRuntime } from './subscription-runtime';

function aRuntimeRecordingWhatItSends() {
  const sent: ProviderRequest[] = [];

  return {
    sent,
    runtime: {
      ...subscriptionRuntime(),
      send: async (_provider: string, request: ProviderRequest) => {
        sent.push(request);

        return Promise.resolve(new Response(null, { status: 204 }));
      },
    },
  };
}

const AN_ASK: ProviderRequest = {
  url: 'https://api.anthropic.com/v1/messages',
  headers: [],
  body: '{}',
};

describe('a subscription runtime bound to one budget', () => {
  it('hands every request it sends the signal that budget carries', async () => {
    const watched = aRuntimeRecordingWhatItSends();
    const bound = AbortSignal.timeout(50_000);

    await subscriptionRuntimeBoundTo(watched.runtime, bound).send('anthropic', AN_ASK);

    expect(watched.sent.at(0)?.signal).toBe(bound);
  });

  it('binds a resend the same way, since one classification can reach the wire more than once', async () => {
    const watched = aRuntimeRecordingWhatItSends();
    const bound = AbortSignal.timeout(50_000);
    const runtime = subscriptionRuntimeBoundTo(watched.runtime, bound);

    await runtime.send('anthropic', AN_ASK);
    await runtime.send('anthropic', { ...AN_ASK, body: '{"retry":true}' });

    expect(watched.sent.map((request) => request.signal)).toEqual([bound, bound]);
  });

  it('leaves the request it was handed otherwise untouched', async () => {
    const watched = aRuntimeRecordingWhatItSends();

    await subscriptionRuntimeBoundTo(watched.runtime, AbortSignal.timeout(50_000)).send(
      'anthropic',
      AN_ASK,
    );

    expect(watched.sent.at(0)).toMatchObject({ url: AN_ASK.url, body: AN_ASK.body });
  });

  it('leaves the runtime unbound for anyone still holding the original', async () => {
    const watched = aRuntimeRecordingWhatItSends();

    subscriptionRuntimeBoundTo(watched.runtime, AbortSignal.timeout(50_000));
    await watched.runtime.send('anthropic', AN_ASK);

    expect(watched.sent.at(0)?.signal).toBeUndefined();
  });
});
