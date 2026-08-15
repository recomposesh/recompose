import { describe, expect, test } from 'vitest';

import type { SubscriptionWireFetch } from './provider-transport';

import { sendSubscriptionRequest } from './provider-transport';
import { recordingWire, requestTo, streamOf } from './provider-transport.testkit';
import { subscriptionBounds } from './transport-bounds';

const DAILY_HOST = 'daily-cloudcode-pa.googleapis.com';
const STABLE_HOST = 'cloudcode-pa.googleapis.com';

function turnTo(host: string): ReturnType<typeof requestTo> {
  return requestTo(`https://${host}/v1internal:generateContent`);
}

function answeringEveryHost(status: number): SubscriptionWireFetch {
  return async (url) => {
    await Promise.resolve();

    return {
      status,
      headers: [['x-reached-host', new URL(url).hostname]],
      body: streamOf('{"ok":true}'),
    };
  };
}

function throttlingDailyHost(): SubscriptionWireFetch {
  return async (url) => {
    await Promise.resolve();
    const hostname = new URL(url).hostname;

    return {
      status: hostname === DAILY_HOST ? 429 : 200,
      headers: [['x-reached-host', hostname]],
      body: streamOf('{"ok":true}'),
    };
  };
}

function refusingDailyHost(): SubscriptionWireFetch {
  return async (url) => {
    await Promise.resolve();
    const hostname = new URL(url).hostname;

    if (hostname === DAILY_HOST) throw new Error('socket closed');

    return { status: 200, headers: [['x-reached-host', hostname]], body: streamOf('{"ok":true}') };
  };
}

function refusingEveryHost(): SubscriptionWireFetch {
  return async () => {
    await Promise.resolve();

    throw new Error('socket closed');
  };
}

describe('where an Antigravity turn throttled upstream is sent next', () => {
  test('a turn throttled on the daily host is retried on the stable host', async () => {
    const response = await sendSubscriptionRequest(
      'antigravity',
      turnTo(DAILY_HOST),
      throttlingDailyHost(),
    );

    expect(response.headers.get('x-reached-host')).toBe(STABLE_HOST);
  });

  test('a turn throttled on the stable host is refused, never re-sent', async () => {
    const recorded = recordingWire(answeringEveryHost(429));

    const response = await sendSubscriptionRequest(
      'antigravity',
      turnTo(STABLE_HOST),
      recorded.wire,
    );

    expect(recorded.calls).toHaveLength(1);
    expect(response.status).toBe(429);
  });

  test('a turn the daily host answered is delivered from there', async () => {
    const recorded = recordingWire(answeringEveryHost(200));

    const response = await sendSubscriptionRequest(
      'antigravity',
      turnTo(DAILY_HOST),
      recorded.wire,
    );

    expect(recorded.calls).toHaveLength(1);
    expect(response.headers.get('x-reached-host')).toBe(DAILY_HOST);
  });
});

describe('where an Antigravity turn its transport refused is sent next', () => {
  test('a turn refused on the daily host is retried on the stable host', async () => {
    const response = await sendSubscriptionRequest(
      'antigravity',
      turnTo(DAILY_HOST),
      refusingDailyHost(),
    );

    expect(response.headers.get('x-reached-host')).toBe(STABLE_HOST);
  });

  test('a turn refused on the stable host raises that refusal, never a second one', async () => {
    const recorded = recordingWire(refusingEveryHost());

    await expect(
      sendSubscriptionRequest('antigravity', turnTo(STABLE_HOST), recorded.wire),
    ).rejects.toThrow('socket closed');
    expect(recorded.calls).toHaveLength(1);
  });
});

describe('the transport an Antigravity turn travels on', () => {
  test("it stays plain HTTP/1.1, never Claude's captured handshake", async () => {
    const recorded = recordingWire(answeringEveryHost(200));

    await sendSubscriptionRequest('antigravity', turnTo(DAILY_HOST), recorded.wire);

    expect(recorded.calls[0]?.init).toEqual({
      http1Only: true,
      disableDefaultHeaders: true,
      ...subscriptionBounds,
      method: 'POST',
      headers: [['Content-Type', 'application/json']],
      body: '{}',
      retry: 0,
      throwHttpErrors: false,
    });
  });
});
