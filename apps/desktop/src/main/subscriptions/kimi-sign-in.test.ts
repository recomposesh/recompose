import { beforeEach, describe, expect, test } from 'vitest';

import type { DeviceSignInPort } from './device-sign-in-port';

import { awaitDeviceSignIn, forgetPendingDeviceSignIns, startDeviceSignIn } from './device-sign-in';

type Answer = { status: number; body: unknown };

type Sent = { url: string; headers: Record<string, string> };

function headersOf(init: RequestInit | undefined): Record<string, string> {
  return Object.fromEntries(new Headers(init?.headers).entries());
}

function urlOf(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === 'string') {
    return input;
  }

  return input instanceof URL ? input.href : input.url;
}

function portAnswering(answers: readonly Answer[]): DeviceSignInPort & { sent: Sent[] } {
  const sent: Sent[] = [];
  let turn = 0;

  return {
    sent,
    nowMs: () => 0,
    sleep: async () => Promise.resolve(),
    machine: { name: 'ada-machine', id: 'device-1', model: 'macOS arm64', version: '1.2.3' },
    openInBrowser: async () => Promise.resolve(),
    fetchLike: async (input, init) => {
      const answer = answers[Math.min(turn, answers.length - 1)];

      turn += 1;
      sent.push({ url: urlOf(input), headers: headersOf(init) });

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
    user_code: 'ABCD-9999',
    verification_uri: 'https://auth.kimi.com/device',
    expires_in: 900,
    interval: 1,
  },
};

const issued = {
  status: 200,
  body: { access_token: 'kimi-token', refresh_token: 'kimi-refresh' },
};

beforeEach(() => {
  forgetPendingDeviceSignIns();
});

describe('the ask Kimi answers', () => {
  test('the ask reaches the address Kimi runs its device authorization at', async () => {
    const port = portAnswering([aCode]);

    await startDeviceSignIn(port, 'kimi');

    expect(port.sent[0]?.url).toBe('https://auth.kimi.com/api/oauth/device_authorization');
  });

  test('every ask names the caller, the machine and the install, which Kimi refuses without', async () => {
    const port = portAnswering([aCode, issued]);

    await startDeviceSignIn(port, 'kimi');
    await awaitDeviceSignIn(port, 'kimi');

    for (const ask of port.sent) {
      expect(ask.headers).toMatchObject({
        'x-msh-platform': 'recompose',
        'x-msh-version': '1.2.3',
        'x-msh-device-name': 'ada-machine',
        'x-msh-device-model': 'macOS arm64',
        'x-msh-device-id': 'device-1',
      });
    }
  });

  test('the platform reads as this app rather than as the tool this flow was ported from', async () => {
    const port = portAnswering([aCode]);

    await startDeviceSignIn(port, 'kimi');

    expect(port.sent[0]?.headers['x-msh-platform']).not.toBe('CLIProxyAPI');
  });
});

describe('what a settled Kimi sign-in is kept as', () => {
  test('the record keeps the shape CLIProxyAPI writes, so both read the same way after', async () => {
    const port = portAnswering([aCode, issued]);

    await startDeviceSignIn(port, 'kimi');

    const settled = await awaitDeviceSignIn(port, 'kimi');

    expect(settled.verdict === 'signed-in' && JSON.parse(settled.credential)).toEqual({
      type: 'kimi',
      access_token: 'kimi-token',
      refresh_token: 'kimi-refresh',
      device_id: 'device-1',
    });
  });

  test('a plan that publishes no address leaves the account unnamed rather than guessing one', async () => {
    const port = portAnswering([aCode, issued]);

    await startDeviceSignIn(port, 'kimi');

    const settled = await awaitDeviceSignIn(port, 'kimi');

    expect(settled.verdict === 'signed-in' && settled.signedInAs).toBeUndefined();
  });

  test('a record with no renewal keeps the token alone rather than a blank beside it', async () => {
    const port = portAnswering([aCode, { status: 200, body: { access_token: 'kimi-token' } }]);

    await startDeviceSignIn(port, 'kimi');

    const settled = await awaitDeviceSignIn(port, 'kimi');

    expect(settled.verdict === 'signed-in' && JSON.parse(settled.credential)).toEqual({
      type: 'kimi',
      access_token: 'kimi-token',
      device_id: 'device-1',
    });
  });
});
