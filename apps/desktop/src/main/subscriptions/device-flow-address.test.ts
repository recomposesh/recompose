import { describe, expect, test } from 'vitest';

import { copilotVendor } from './copilot-sign-in';
import { askForADeviceCode } from './device-flow';

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

describe('the address a person is sent to', () => {
  test('an address carrying the code is shown over the bare one beside it', async () => {
    const { fetchLike } = fetchAnswering([
      {
        status: 200,
        body: {
          ...aDeviceCode,
          verification_uri: 'https://www.kimi.com/code/authorize_device',
          verification_uri_complete:
            'https://www.kimi.com/code/authorize_device?user_code=ABCD-1234',
        },
      },
    ]);

    const asked = await askForADeviceCode(fetchLike, copilotVendor);

    expect(asked).toMatchObject({
      verdict: 'shown',
      verificationUri: 'https://www.kimi.com/code/authorize_device?user_code=ABCD-1234',
    });
  });

  test.each([
    'javascript:alert(1)',
    'file:///etc/passwd',
    'http://github.com/login/device',
    'not a url',
  ])('an address on the scheme %s is refused rather than opened', async (named) => {
    const { fetchLike } = fetchAnswering([
      { status: 200, body: { ...aDeviceCode, verification_uri: named } },
    ]);

    expect(await askForADeviceCode(fetchLike, copilotVendor)).toMatchObject({
      verdict: 'refused',
    });
  });

  test('a complete address on a scheme nobody may be sent to falls to the bare one', async () => {
    const { fetchLike } = fetchAnswering([
      {
        status: 200,
        body: { ...aDeviceCode, verification_uri_complete: 'javascript:alert(1)' },
      },
    ]);

    expect(await askForADeviceCode(fetchLike, copilotVendor)).toMatchObject({
      verificationUri: 'https://github.com/login/device',
    });
  });

  test('a vendor publishing only the bare address is shown that one', async () => {
    const { fetchLike } = fetchAnswering([{ status: 200, body: aDeviceCode }]);

    expect(await askForADeviceCode(fetchLike, copilotVendor)).toMatchObject({
      verificationUri: 'https://github.com/login/device',
    });
  });
});
