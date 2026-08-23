import { describe, expect, test } from 'vitest';

import { copilotVendor } from './copilot-sign-in';
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
  verification_uri: 'https://github.com/login/device',
  expires_in: 900,
  interval: 5,
};

describe('the code a person is shown', () => {
  test('the ask names the client identity GitHub registers for a terminal', async () => {
    const { sent, fetchLike } = fetchAnswering([{ status: 200, body: aDeviceCode }]);

    await askForADeviceCode(fetchLike, copilotVendor);

    expect(sent[0]?.url).toBe(copilotVendor.deviceCode);
    expect(sent[0]?.body).toContain('client_id=Iv1.b507a08c87ecfe98');
  });
});

describe('what the ask refuses to read', () => {
  test('the ask is a form post that follows no redirect', async () => {
    const { sent, fetchLike } = fetchAnswering([{ status: 200, body: aDeviceCode }]);

    await askForADeviceCode(fetchLike, copilotVendor);

    expect(sent[0]?.init.method).toBe('POST');
    expect(sent[0]?.init.redirect).toBe('error');
    expect(sent[0]?.init.headers).toEqual({
      accept: 'application/json',
      'content-type': 'application/x-www-form-urlencoded',
    });
  });

  test('an answer that is no object at all refuses rather than reading fields off it', async () => {
    for (const body of ['a sentence', 42, null]) {
      const { fetchLike } = fetchAnswering([{ status: 200, body }]);

      expect((await askForADeviceCode(fetchLike, copilotVendor)).verdict, String(body)).toBe(
        'refused',
      );
    }
  });

  test('a code that arrived blank refuses, because a blank is nothing to type', async () => {
    const { fetchLike } = fetchAnswering([
      { status: 200, body: { ...aDeviceCode, user_code: '   ' } },
    ]);

    expect(await askForADeviceCode(fetchLike, copilotVendor)).toEqual({
      verdict: 'refused',
      reason: 'GitHub answered the device request without a code.',
    });
  });
});

describe('the code a person is shown, read out of the answer', () => {
  test('the ask carries the scope Copilot reads', async () => {
    const { sent, fetchLike } = fetchAnswering([{ status: 200, body: aDeviceCode }]);

    await askForADeviceCode(fetchLike, copilotVendor);

    expect(sent[0]?.body).toContain(`scope=${encodeURIComponent('read:user')}`);
  });

  test('the answer carries the code, the address, and the pace the server set', async () => {
    const { fetchLike } = fetchAnswering([{ status: 200, body: aDeviceCode }]);

    const asked = await askForADeviceCode(fetchLike, copilotVendor);

    expect(asked).toEqual({
      verdict: 'shown',
      deviceCode: 'dev-1',
      userCode: 'ABCD-1234',
      verificationUri: 'https://github.com/login/device',
      intervalMs: 5_000,
      expiresInMs: 900_000,
    });
  });
});

describe('what the ask refuses to show', () => {
  test('an answer missing the code refuses rather than showing a person nothing', async () => {
    const { fetchLike } = fetchAnswering([{ status: 200, body: { user_code: 'ABCD-1234' } }]);

    expect(await askForADeviceCode(fetchLike, copilotVendor)).toEqual({
      verdict: 'refused',
      reason: 'GitHub answered the device request without a code.',
    });
  });

  test('a refused ask carries what GitHub said rather than a blank', async () => {
    const { fetchLike } = fetchAnswering([{ status: 404, body: {} }]);

    const asked = await askForADeviceCode(fetchLike, copilotVendor);

    expect(asked.verdict).toBe('refused');
  });
});

const waited: number[] = [];

const sleep = async (ms: number) => {
  waited.push(ms);

  return Promise.resolve();
};

const aMinuteLeft = { intervalMs: 1_000, expiresInMs: 60_000, sleep, elapsedMs: () => 0 };

describe('the wait for a person to authorize', () => {
  test('an authorization answers the long-lived credential GitHub issued', async () => {
    const { fetchLike } = fetchAnswering([
      { status: 200, body: { error: 'authorization_pending' } },
      { status: 200, body: { access_token: 'gho_the-token', token_type: 'bearer' } },
    ]);

    const settled = await awaitAuthorization(
      fetchLike,
      copilotVendor,
      aDeviceCode.device_code,
      aMinuteLeft,
    );

    expect(settled).toEqual({
      verdict: 'authorized',
      credential: 'gho_the-token',
      refreshToken: undefined,
    });
  });

  test('the wait asks again no faster than the pace the server set', async () => {
    waited.length = 0;

    const { fetchLike } = fetchAnswering([
      { status: 200, body: { error: 'authorization_pending' } },
      { status: 200, body: { access_token: 'gho_the-token' } },
    ]);

    await awaitAuthorization(fetchLike, copilotVendor, 'dev-1', aMinuteLeft);

    expect(waited).toEqual([1_000]);
  });

  test('a server asking for more room is waited on longer than it first said', async () => {
    waited.length = 0;

    const { fetchLike } = fetchAnswering([
      { status: 200, body: { error: 'slow_down' } },
      { status: 200, body: { access_token: 'gho_the-token' } },
    ]);

    await awaitAuthorization(fetchLike, copilotVendor, 'dev-1', aMinuteLeft);

    expect(waited[0]).toBeGreaterThan(1_000);
  });
});

describe('the answers that stop the wait', () => {
  const terminalTable: [string, string][] = [
    ['access_denied', 'The sign-in was denied on GitHub.'],
    ['expired_token', 'The code expired before it was entered.'],
  ];

  test.each(terminalTable)(
    'a %s answer stops the wait rather than asking on',
    async (error, said) => {
      const { sent, fetchLike } = fetchAnswering([{ status: 200, body: { error } }]);

      const settled = await awaitAuthorization(fetchLike, copilotVendor, 'dev-1', aMinuteLeft);

      expect(settled).toEqual({ verdict: 'refused', reason: said });
      expect(sent).toHaveLength(1);
    },
  );

  test('a code that outlived its own window stops rather than asking forever', async () => {
    const { fetchLike } = fetchAnswering([
      { status: 200, body: { error: 'authorization_pending' } },
    ]);

    const settled = await awaitAuthorization(fetchLike, copilotVendor, 'dev-1', {
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
