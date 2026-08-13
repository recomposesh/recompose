import { describe, expect, test } from 'vitest';

import { askForADeviceCode, awaitAuthorization, copilotEndpoints } from './copilot-device-flow';

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

function fetchAnswering(answers: readonly Answer[]): {
  sent: { url: string; body: string }[];
  fetchLike: typeof fetch;
} {
  const sent: { url: string; body: string }[] = [];
  let turn = 0;

  const fetchLike: typeof fetch = async (input, init) => {
    const answer = answers[Math.min(turn, answers.length - 1)];

    turn += 1;
    sent.push({ url: urlOf(input), body: bodyOf(init) });

    return Promise.resolve(
      new Response(JSON.stringify(answer?.body ?? {}), {
        status: answer?.status ?? 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
  };

  return { sent, fetchLike };
}

const aDeviceCode = {
  device_code: 'dev-1',
  user_code: 'ABCD-1234',
  verification_uri: 'https://github.com/login/device',
  expires_in: 900,
  interval: 5,
};

describe('the code a person is shown', () => {
  test('the ask names the client identity GitHub registers for a terminal', async () => {
    const { sent, fetchLike } = fetchAnswering([{ status: 200, body: aDeviceCode }]);

    await askForADeviceCode(fetchLike);

    expect(sent[0]?.url).toBe(copilotEndpoints.deviceCode);
    expect(sent[0]?.body).toContain('client_id=Iv1.b507a08c87ecfe98');
  });

  test('the ask carries the scope Copilot reads', async () => {
    const { sent, fetchLike } = fetchAnswering([{ status: 200, body: aDeviceCode }]);

    await askForADeviceCode(fetchLike);

    expect(sent[0]?.body).toContain('scope=read%3Auser');
  });

  test('the answer carries the code, the address, and the pace the server set', async () => {
    const { fetchLike } = fetchAnswering([{ status: 200, body: aDeviceCode }]);

    const asked = await askForADeviceCode(fetchLike);

    expect(asked).toEqual({
      verdict: 'shown',
      deviceCode: 'dev-1',
      userCode: 'ABCD-1234',
      verificationUri: 'https://github.com/login/device',
      intervalMs: 5_000,
      expiresInMs: 900_000,
    });
  });

  test('an answer missing the code refuses rather than showing a person nothing', async () => {
    const { fetchLike } = fetchAnswering([{ status: 200, body: { user_code: 'ABCD-1234' } }]);

    expect(await askForADeviceCode(fetchLike)).toEqual({
      verdict: 'refused',
      reason: 'GitHub answered the device request without a code.',
    });
  });

  test('a refused ask carries what GitHub said rather than a blank', async () => {
    const { fetchLike } = fetchAnswering([{ status: 404, body: {} }]);

    const asked = await askForADeviceCode(fetchLike);

    expect(asked.verdict).toBe('refused');
  });
});

describe('the wait for a person to authorize', () => {
  const waited: number[] = [];
  const sleep = async (ms: number) => {
    waited.push(ms);

    return Promise.resolve();
  };

  test('an authorization answers the long-lived credential GitHub issued', async () => {
    const { fetchLike } = fetchAnswering([
      { status: 200, body: { error: 'authorization_pending' } },
      { status: 200, body: { access_token: 'gho_the-token', token_type: 'bearer' } },
    ]);

    const settled = await awaitAuthorization(fetchLike, aDeviceCode.device_code, {
      intervalMs: 1_000,
      expiresInMs: 60_000,
      sleep,
      elapsedMs: () => 0,
    });

    expect(settled).toEqual({ verdict: 'authorized', credential: 'gho_the-token' });
  });

  test('the wait asks again no faster than the pace the server set', async () => {
    waited.length = 0;

    const { fetchLike } = fetchAnswering([
      { status: 200, body: { error: 'authorization_pending' } },
      { status: 200, body: { access_token: 'gho_the-token' } },
    ]);

    await awaitAuthorization(fetchLike, 'dev-1', {
      intervalMs: 1_000,
      expiresInMs: 60_000,
      sleep,
      elapsedMs: () => 0,
    });

    expect(waited).toEqual([1_000]);
  });

  test('a server asking for more room is waited on longer than it first said', async () => {
    waited.length = 0;

    const { fetchLike } = fetchAnswering([
      { status: 200, body: { error: 'slow_down' } },
      { status: 200, body: { access_token: 'gho_the-token' } },
    ]);

    await awaitAuthorization(fetchLike, 'dev-1', {
      intervalMs: 1_000,
      expiresInMs: 60_000,
      sleep,
      elapsedMs: () => 0,
    });

    expect(waited[0]).toBeGreaterThan(1_000);
  });
});

describe('the answers that stop the wait', () => {
  const waited: number[] = [];
  const sleep = async (ms: number) => {
    waited.push(ms);

    return Promise.resolve();
  };

  const terminalTable: [string, string][] = [
    ['access_denied', 'The sign-in was denied on GitHub.'],
    ['expired_token', 'The code expired before it was entered.'],
  ];

  test.each(terminalTable)(
    'a %s answer stops the wait rather than asking on',
    async (error, said) => {
      const { sent, fetchLike } = fetchAnswering([{ status: 200, body: { error } }]);

      const settled = await awaitAuthorization(fetchLike, 'dev-1', {
        intervalMs: 1_000,
        expiresInMs: 60_000,
        sleep,
        elapsedMs: () => 0,
      });

      expect(settled).toEqual({ verdict: 'refused', reason: said });
      expect(sent).toHaveLength(1);
    },
  );

  test('a code that outlived its own window stops rather than asking forever', async () => {
    const { fetchLike } = fetchAnswering([
      { status: 200, body: { error: 'authorization_pending' } },
    ]);

    const settled = await awaitAuthorization(fetchLike, 'dev-1', {
      intervalMs: 1_000,
      expiresInMs: 10,
      sleep,
      elapsedMs: () => 5_000,
    });

    expect(settled).toEqual({
      verdict: 'refused',
      reason: 'The code expired before it was entered.',
    });
  });
});
