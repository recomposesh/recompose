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

const aMinuteLeft = {
  intervalMs: 1_000,
  expiresInMs: 60_000,
  sleep: async () => Promise.resolve(),
  elapsedMs: () => 0,
};

describe('the pace a vendor sets, and what stands in where it sets none', () => {
  test('the vendor’s own interval and expiry are the ones the wait honours', async () => {
    const { fetchLike } = fetchAnswering([
      { status: 200, body: { ...aDeviceCode, interval: 7, expires_in: 120 } },
    ]);

    expect(await askForADeviceCode(fetchLike, copilotVendor)).toMatchObject({
      intervalMs: 7_000,
      expiresInMs: 120_000,
    });
  });

  const unusable = [
    ['nothing at all', {}],
    ['a word rather than a count', { interval: 'five', expires_in: 'later' }],
    ['a zero, which would poll without pausing', { interval: 0, expires_in: 0 }],
    ['a count below zero', { interval: -5, expires_in: -900 }],
    ['a count no number can hold', { interval: Number.POSITIVE_INFINITY, expires_in: Number.NaN }],
  ] as const;

  test.each(unusable)(
    'a vendor answering %s falls back to the documented pace',
    async (_, said) => {
      const { fetchLike } = fetchAnswering([
        {
          status: 200,
          body: { ...aDeviceCode, interval: undefined, expires_in: undefined, ...said },
        },
      ]);

      expect(await askForADeviceCode(fetchLike, copilotVendor)).toMatchObject({
        intervalMs: 5_000,
        expiresInMs: 900_000,
      });
    },
  );
});

describe('what the ask refuses to call a code', () => {
  const missing = [
    ['the code the wait completes with', { device_code: undefined }],
    ['the code a person types', { user_code: undefined }],
    ['the address a person types it at', { verification_uri: undefined }],
  ] as const;

  test.each(missing)('an answer missing %s refuses', async (_, gap) => {
    const { fetchLike } = fetchAnswering([{ status: 200, body: { ...aDeviceCode, ...gap } }]);

    expect(await askForADeviceCode(fetchLike, copilotVendor)).toEqual({
      verdict: 'refused',
      reason: 'GitHub answered the device request without a code.',
    });
  });
});

describe('what the wait sends the vendor on every ask', () => {
  test('the ask names the client, the code, and the grant the standard fixes', async () => {
    const { sent, fetchLike } = fetchAnswering([{ status: 200, body: { access_token: 'tok' } }]);

    await awaitAuthorization(fetchLike, copilotVendor, 'dev-9', aMinuteLeft);

    expect(sent[0]?.url).toBe(copilotVendor.token);
    expect(sent[0]?.body).toContain('client_id=Iv1.b507a08c87ecfe98');
    expect(sent[0]?.body).toContain('device_code=dev-9');
    expect(sent[0]?.body).toContain(
      `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:device_code')}`,
    );
  });
});

describe('the refusals a vendor calls terminal, each in its own words', () => {
  const terminal = [
    ['unsupported_grant_type', 'GitHub refused the grant this sign-in asked for.'],
    ['incorrect_client_credentials', 'GitHub did not recognize the client this sign-in named.'],
    ['invalid_grant', 'GitHub refused the code this sign-in offered.'],
  ] as const;

  test.each(terminal)('a %s answer says what GitHub refused', async (error, said) => {
    const { fetchLike } = fetchAnswering([{ status: 200, body: { error } }]);

    expect(await awaitAuthorization(fetchLike, copilotVendor, 'dev-1', aMinuteLeft)).toEqual({
      verdict: 'refused',
      reason: said,
    });
  });

  test('an answer nobody could read leaves the wait where it was rather than refusing', async () => {
    const { sent, fetchLike } = fetchAnswering([
      { status: 200, body: 'not an object at all' },
      { status: 200, body: { access_token: 'tok' } },
    ]);

    const settled = await awaitAuthorization(fetchLike, copilotVendor, 'dev-1', aMinuteLeft);

    expect(settled).toMatchObject({ verdict: 'authorized', credential: 'tok' });
    expect(sent).toHaveLength(2);
  });

  test('a code exactly at the end of its window is out of time, not asked once more', async () => {
    const { sent, fetchLike } = fetchAnswering([{ status: 200, body: { access_token: 'tok' } }]);

    const settled = await awaitAuthorization(fetchLike, copilotVendor, 'dev-1', {
      ...aMinuteLeft,
      elapsedMs: () => 60_000,
    });

    expect(settled).toEqual({
      verdict: 'refused',
      reason: 'The code expired before it was entered.',
    });
    expect(sent).toEqual([]);
  });
});
