import { beforeEach, describe, expect, test } from 'vitest';

import type { CopilotSignInPort } from './copilot-sign-in';

import {
  awaitCopilotSignIn,
  forgetPendingCopilotSignIn,
  startCopilotSignIn,
} from './copilot-sign-in';

type Answer = { status: number; body: unknown };

function urlOf(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === 'string') {
    return input;
  }

  return input instanceof URL ? input.href : input.url;
}

function portAnswering(answers: readonly Answer[]): CopilotSignInPort & {
  sent: string[];
} {
  const sent: string[] = [];
  let turn = 0;

  return {
    sent,
    nowMs: () => 0,
    sleep: async () => Promise.resolve(),
    fetchLike: async (input) => {
      const answer = answers[Math.min(turn, answers.length - 1)];

      turn += 1;
      sent.push(urlOf(input));

      return Promise.resolve(
        new Response(JSON.stringify(answer?.body ?? {}), {
          status: answer?.status ?? 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    },
  };
}

const aCode = {
  status: 200,
  body: {
    device_code: 'dev-1',
    user_code: 'ABCD-1234',
    verification_uri: 'https://github.com/login/device',
    expires_in: 900,
    interval: 1,
  },
};

beforeEach(() => {
  forgetPendingCopilotSignIn();
});

describe('the code the screen shows', () => {
  test('a person is shown what to type and where, and nothing that completes the flow', async () => {
    const shown = await startCopilotSignIn(portAnswering([aCode]));

    expect(shown).toEqual({
      verdict: 'shown',
      userCode: 'ABCD-1234',
      verificationUri: 'https://github.com/login/device',
    });
    expect(JSON.stringify(shown)).not.toContain('dev-1');
  });

  test('an ask GitHub refused leaves nothing waiting to be finished', async () => {
    const port = portAnswering([{ status: 404, body: {} }]);

    expect((await startCopilotSignIn(port)).verdict).toBe('refused');
    expect((await awaitCopilotSignIn(port)).verdict).toBe('refused');
  });
});

describe('the wait a person finishes', () => {
  test('an authorized sign-in answers the credential and who signed in', async () => {
    const port = portAnswering([
      aCode,
      { status: 200, body: { access_token: 'gho_the-token' } },
      { status: 200, body: { login: 'someone' } },
    ]);

    await startCopilotSignIn(port);

    expect(await awaitCopilotSignIn(port)).toEqual({
      verdict: 'signed-in',
      credential: 'gho_the-token',
      signedInAs: 'someone',
    });
  });

  test('a wait with nothing started refuses rather than polling an address for nobody', async () => {
    const port = portAnswering([aCode]);

    expect(await awaitCopilotSignIn(port)).toEqual({
      verdict: 'refused',
      reason: 'No Copilot sign-in is waiting to be finished.',
    });
    expect(port.sent).toEqual([]);
  });

  test('a finished wait leaves nothing behind for a second wait to settle against', async () => {
    const port = portAnswering([
      aCode,
      { status: 200, body: { access_token: 'gho_the-token' } },
      { status: 200, body: { login: 'someone' } },
    ]);

    await startCopilotSignIn(port);
    await awaitCopilotSignIn(port);

    expect((await awaitCopilotSignIn(port)).verdict).toBe('refused');
  });

  test('a denied sign-in leaves nothing behind either', async () => {
    const port = portAnswering([aCode, { status: 200, body: { error: 'access_denied' } }]);

    await startCopilotSignIn(port);

    expect(await awaitCopilotSignIn(port)).toEqual({
      verdict: 'refused',
      reason: 'The sign-in was denied on GitHub.',
    });
    expect((await awaitCopilotSignIn(port)).verdict).toBe('refused');
  });
});
