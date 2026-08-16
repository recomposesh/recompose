import { describe, expect, test } from 'vitest';

import { askForADeviceCode, awaitAuthorization } from './device-flow';

type Answer = { status: number; body: unknown };

function urlOf(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === 'string') {
    return input;
  }

  return input instanceof URL ? input.href : input.url;
}

function bodyOf(init: RequestInit | undefined): string {
  return typeof init?.body === 'string' ? init.body : '';
}

type Sent = { url: string; body: string; init: RequestInit };

function answerAt(answers: readonly Answer[], turn: number): Answer {
  return answers[Math.min(turn, answers.length - 1)] ?? { status: 200, body: {} };
}

function fetchAnswering(answers: readonly Answer[]): {
  sent: Sent[];
  fetchLike: typeof fetch;
} {
  const sent: Sent[] = [];
  let turn = 0;

  const fetchLike: typeof fetch = async (input, init) => {
    const answer = answerAt(answers, turn);

    turn += 1;
    sent.push({ url: urlOf(input), body: bodyOf(init), init: init ?? {} });

    return Promise.resolve(
      new Response(JSON.stringify(answer.body), {
        status: answer.status,
        headers: { 'content-type': 'application/json' },
      }),
    );
  };

  return { sent, fetchLike };
}

const aDeviceCode = {
  device_code: 'dev-1',
  user_code: 'ABCD-1234',
  verification_uri: 'https://auth.example.test/device',
  expires_in: 900,
  interval: 5,
};

const quietVendor = {
  name: 'Kimi',
  deviceCode: 'https://auth.example.test/device',
  token: 'https://auth.example.test/token',
  clientId: 'client-2',
  headers: { 'X-Msh-Platform': 'recompose' },
};

const noWait = { intervalMs: 1_000, expiresInMs: 60_000, elapsedMs: () => 0 };

describe('what a second vendor is asked for', () => {
  test('a vendor that takes no scope is asked without one', async () => {
    const { sent, fetchLike } = fetchAnswering([{ status: 200, body: aDeviceCode }]);

    await askForADeviceCode(fetchLike, quietVendor);

    expect(sent[0]?.url).toBe(quietVendor.deviceCode);
    expect(sent[0]?.body).not.toContain('scope=');
  });

  test('the headers a vendor names ride both asks, because it refuses an ask that omits them', async () => {
    const { sent, fetchLike } = fetchAnswering([
      { status: 200, body: aDeviceCode },
      { status: 200, body: { access_token: 'tok' } },
    ]);

    await askForADeviceCode(fetchLike, quietVendor);
    await awaitAuthorization(fetchLike, quietVendor, 'dev-1', {
      ...noWait,
      sleep: async () => Promise.resolve(),
    });

    for (const ask of sent) {
      expect(ask.init.headers).toMatchObject({ 'X-Msh-Platform': 'recompose' });
    }
  });

  test('a refusal names the vendor that refused rather than the one this flow began for', async () => {
    const { fetchLike } = fetchAnswering([{ status: 404, body: {} }]);

    expect(await askForADeviceCode(fetchLike, quietVendor)).toEqual({
      verdict: 'refused',
      reason: 'Kimi did not answer the device request.',
    });
  });
});

describe('what a second vendor answers', () => {
  test('a vendor answering a pending sign-in with a plain 200 is waited on, not read as settled', async () => {
    const waited: number[] = [];
    const { fetchLike } = fetchAnswering([
      { status: 200, body: { error: 'authorization_pending' } },
      { status: 200, body: { access_token: 'tok', refresh_token: 'ref' } },
    ]);

    const settled = await awaitAuthorization(fetchLike, quietVendor, 'dev-1', {
      ...noWait,
      sleep: async (ms) => {
        waited.push(ms);

        return Promise.resolve();
      },
    });

    expect(settled).toEqual({ verdict: 'authorized', credential: 'tok', refreshToken: 'ref' });
    expect(waited).toEqual([1_000]);
  });

  test('the address a vendor completes with stands in where it names no plain one', async () => {
    const { fetchLike } = fetchAnswering([
      {
        status: 200,
        body: {
          device_code: 'dev-1',
          user_code: 'ABCD',
          verification_uri_complete: 'https://auth.example.test/device?code=ABCD',
        },
      },
    ]);

    expect(await askForADeviceCode(fetchLike, quietVendor)).toMatchObject({
      verdict: 'shown',
      verificationUri: 'https://auth.example.test/device?code=ABCD',
    });
  });
});
