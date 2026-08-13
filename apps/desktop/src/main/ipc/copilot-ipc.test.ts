import { beforeEach, describe, expect, test } from 'vitest';

import type { SubscriptionsIpcContext } from './subscriptions-ipc';

import { forgetPendingCopilotSignIn } from '../subscriptions/copilot-sign-in';
import { createSubscriptionsIpcHandlers } from './subscriptions-ipc';
import { aFreshWorld } from './subscriptions-ipc.testkit';

type Answer = { status: number; body: unknown };

function githubAnswering(answers: readonly Answer[]): SubscriptionsIpcContext['copilot'] {
  let turn = 0;

  return {
    nowMs: () => 0,
    sleep: async () => Promise.resolve(),
    fetchLike: async () => {
      const answer = answers[Math.min(turn, answers.length - 1)];

      turn += 1;

      return Promise.resolve(
        new Response(JSON.stringify(answer?.body ?? {}), {
          status: answer?.status ?? 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    },
  };
}

const aDeviceCode = {
  status: 200,
  body: {
    device_code: 'dev-1',
    user_code: 'ABCD-1234',
    verification_uri: 'https://github.com/login/device',
    expires_in: 900,
    interval: 1,
  },
};

const authorized = { status: 200, body: { access_token: 'gho_the-token' } };

const whoSignedIn = { status: 200, body: { login: 'someone' } };

async function handlersAnswering(answers: readonly Answer[]) {
  const world = await aFreshWorld();
  const context = world.contextOn('linux', world.nothingHappens);

  return {
    world,
    handlers: createSubscriptionsIpcHandlers({ ...context, copilot: githubAnswering(answers) }),
  };
}

beforeEach(() => {
  forgetPendingCopilotSignIn();
});

describe('the code the screen asks for', () => {
  test('a shown code carries what a person types and where, and nothing else', async () => {
    const { handlers } = await handlersAnswering([aDeviceCode]);

    expect(await handlers['subscriptions:copilot-code']()).toEqual({
      ok: true,
      value: { userCode: 'ABCD-1234', verificationUri: 'https://github.com/login/device' },
    });
  });

  test('the answer never carries the handle that completes the flow', async () => {
    const { handlers } = await handlersAnswering([aDeviceCode]);

    expect(JSON.stringify(await handlers['subscriptions:copilot-code']())).not.toContain('dev-1');
  });

  test('a refused ask crosses as a typed refusal rather than a throw', async () => {
    const { handlers } = await handlersAnswering([{ status: 404, body: {} }]);

    expect(await handlers['subscriptions:copilot-code']()).toMatchObject({
      ok: false,
      error: { code: 'sign-in-timed-out' },
    });
  });
});

describe('the sign-in a person finishes', () => {
  test('an authorized wait records the account under the name that signed in', async () => {
    const { handlers } = await handlersAnswering([aDeviceCode, authorized, whoSignedIn]);

    await handlers['subscriptions:copilot-code']();

    const answered = await handlers['subscriptions:copilot-await']();

    expect(answered.ok && answered.value).toMatchObject([
      { provider: 'copilot', label: 'someone', provenance: 'sign-in' },
    ]);
  });

  test('an authorization nobody claimed reads as a plan rather than as a person', async () => {
    const { handlers } = await handlersAnswering([
      aDeviceCode,
      authorized,
      { status: 500, body: {} },
    ]);

    await handlers['subscriptions:copilot-code']();

    const answered = await handlers['subscriptions:copilot-await']();

    expect(answered.ok && answered.value).toMatchObject([{ label: 'GitHub Copilot' }]);
  });

  test('the credential the sign-in yielded reaches the store rather than the screen', async () => {
    const { handlers } = await handlersAnswering([aDeviceCode, authorized, whoSignedIn]);

    await handlers['subscriptions:copilot-code']();

    const answered = await handlers['subscriptions:copilot-await']();

    expect(JSON.stringify(answered)).not.toContain('gho_the-token');
  });

  test('a wait with nothing started refuses rather than recording an account', async () => {
    const { handlers } = await handlersAnswering([aDeviceCode]);

    const answered = await handlers['subscriptions:copilot-await']();

    expect(answered).toMatchObject({ ok: false, error: { code: 'sign-in-timed-out' } });
  });

  test('a denied sign-in records nothing and says what happened', async () => {
    const { handlers } = await handlersAnswering([
      aDeviceCode,
      { status: 200, body: { error: 'access_denied' } },
    ]);

    await handlers['subscriptions:copilot-code']();

    const answered = await handlers['subscriptions:copilot-await']();

    expect(answered).toMatchObject({
      ok: false,
      error: { code: 'sign-in-timed-out', message: 'The sign-in was denied on GitHub.' },
    });

    const held = await handlers['subscriptions:list']();

    expect(held.ok && held.value).toEqual([]);
  });
});
