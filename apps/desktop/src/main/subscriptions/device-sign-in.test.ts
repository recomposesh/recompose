import { beforeEach, describe, expect, test } from 'vitest';

import type { DeviceSignInPort } from './device-sign-in-port';

import { awaitDeviceSignIn, forgetPendingDeviceSignIns, startDeviceSignIn } from './device-sign-in';

type Answer = { status: number; body: unknown };

function urlOf(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === 'string') {
    return input;
  }

  return input instanceof URL ? input.href : input.url;
}

function portAnswering(answers: readonly Answer[]): DeviceSignInPort & {
  sent: string[];
} {
  const sent: string[] = [];
  let turn = 0;

  return {
    sent,
    nowMs: () => 0,
    sleep: async () => Promise.resolve(),
    machine: { name: 'ada-machine', id: 'device-1', model: 'macOS arm64', version: '0.0.0' },
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
  forgetPendingDeviceSignIns();
});

describe('the code the screen shows', () => {
  test('a person is shown what to type and where, and nothing that completes the flow', async () => {
    const shown = await startDeviceSignIn(portAnswering([aCode]), 'copilot');

    expect(shown).toEqual({
      verdict: 'shown',
      userCode: 'ABCD-1234',
      verificationUri: 'https://github.com/login/device',
    });
    expect(JSON.stringify(shown)).not.toContain('dev-1');
  });

  test('an ask GitHub refused leaves nothing waiting to be finished', async () => {
    const port = portAnswering([{ status: 404, body: {} }]);

    expect((await startDeviceSignIn(port, 'copilot')).verdict).toBe('refused');
    expect((await awaitDeviceSignIn(port, 'copilot')).verdict).toBe('refused');
  });
});

describe('the wait a person finishes', () => {
  test('an authorized sign-in answers the credential and who signed in', async () => {
    const port = portAnswering([
      aCode,
      { status: 200, body: { access_token: 'gho_the-token' } },
      { status: 200, body: { login: 'someone' } },
    ]);

    await startDeviceSignIn(port, 'copilot');

    expect(await awaitDeviceSignIn(port, 'copilot')).toEqual({
      verdict: 'signed-in',
      credential: 'gho_the-token',
      signedInAs: 'someone',
    });
  });

  test('a wait with nothing started refuses rather than polling an address for nobody', async () => {
    const port = portAnswering([aCode]);

    expect(await awaitDeviceSignIn(port, 'copilot')).toEqual({
      verdict: 'refused',
      reason: 'No GitHub Copilot sign-in is waiting to be finished.',
    });
    expect(port.sent).toEqual([]);
  });

  test('a finished wait leaves nothing behind for a second wait to settle against', async () => {
    const port = portAnswering([
      aCode,
      { status: 200, body: { access_token: 'gho_the-token' } },
      { status: 200, body: { login: 'someone' } },
    ]);

    await startDeviceSignIn(port, 'copilot');
    await awaitDeviceSignIn(port, 'copilot');

    expect((await awaitDeviceSignIn(port, 'copilot')).verdict).toBe('refused');
  });

  test('a denied sign-in leaves nothing behind either', async () => {
    const port = portAnswering([aCode, { status: 200, body: { error: 'access_denied' } }]);

    await startDeviceSignIn(port, 'copilot');

    expect(await awaitDeviceSignIn(port, 'copilot')).toEqual({
      verdict: 'refused',
      reason: 'The sign-in was denied on GitHub.',
    });
    expect((await awaitDeviceSignIn(port, 'copilot')).verdict).toBe('refused');
  });
});
