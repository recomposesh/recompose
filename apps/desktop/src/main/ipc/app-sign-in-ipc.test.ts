import { beforeEach, describe, expect, test } from 'vitest';

import { forgetPendingDeviceSignIns } from '../subscriptions/device-sign-in';
import { subscriptionCredentialStore } from '../subscriptions/subscription-credential-store';
import { quietAppSignIns } from '../subscriptions/subscriptions.testkit';
import { aDeviceCode, authorized, handlersAnswering, whoSignedIn } from './app-sign-in.testkit';
import { createSubscriptionsIpcHandlers } from './subscriptions-ipc';
import { aFreshWorld } from './subscriptions-ipc.testkit';

async function handlersBrowsing(settle: (url: string) => void) {
  const world = await aFreshWorld();
  const context = world.contextOn('linux', world.nothingHappens);

  return createSubscriptionsIpcHandlers({
    ...context,
    browserSignIn: {
      ...quietAppSignIns().browserSignIn,
      openInBrowser: async (url) => {
        settle(url);

        return Promise.resolve();
      },
      boundMs: 50,
    },
    writeSubscriptionCredential: subscriptionCredentialStore(world.userDataPath, 'linux', null)
      .write,
  });
}

beforeEach(() => {
  forgetPendingDeviceSignIns();
});

describe('the code the screen asks for', () => {
  test('a shown code carries what a person types and where, and nothing else', async () => {
    const { handlers } = await handlersAnswering([aDeviceCode]);

    expect(await handlers['subscriptions:device-code']({ provider: 'copilot' })).toEqual({
      ok: true,
      value: { userCode: 'ABCD-1234', verificationUri: 'https://github.com/login/device' },
    });
  });

  test('the answer never carries the handle that completes the flow', async () => {
    const { handlers } = await handlersAnswering([aDeviceCode]);

    expect(
      JSON.stringify(await handlers['subscriptions:device-code']({ provider: 'copilot' })),
    ).not.toContain('dev-1');
  });

  test('a refused ask crosses as a typed refusal rather than a throw', async () => {
    const { handlers } = await handlersAnswering([{ status: 404, body: {} }]);

    expect(await handlers['subscriptions:device-code']({ provider: 'copilot' })).toMatchObject({
      ok: false,
      error: { code: 'sign-in-timed-out' },
    });
  });
});

describe('the sign-in a person finishes', () => {
  test('an authorized wait records the account under the name that signed in', async () => {
    const { handlers } = await handlersAnswering([aDeviceCode, authorized, whoSignedIn]);

    await handlers['subscriptions:device-code']({ provider: 'copilot' });

    const answered = await handlers['subscriptions:device-await']({ provider: 'copilot' });

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

    await handlers['subscriptions:device-code']({ provider: 'copilot' });

    const answered = await handlers['subscriptions:device-await']({ provider: 'copilot' });

    expect(answered.ok && answered.value).toMatchObject([{ label: 'GitHub Copilot' }]);
  });

  test('the credential the sign-in yielded reaches the store rather than the screen', async () => {
    const { handlers } = await handlersAnswering([aDeviceCode, authorized, whoSignedIn]);

    await handlers['subscriptions:device-code']({ provider: 'copilot' });

    const answered = await handlers['subscriptions:device-await']({ provider: 'copilot' });

    expect(JSON.stringify(answered)).not.toContain('gho_the-token');
  });

  test('a wait with nothing started refuses rather than recording an account', async () => {
    const { handlers } = await handlersAnswering([aDeviceCode]);

    const answered = await handlers['subscriptions:device-await']({ provider: 'copilot' });

    expect(answered).toMatchObject({ ok: false, error: { code: 'sign-in-timed-out' } });
  });

  test('a denied sign-in records nothing and says what happened', async () => {
    const { handlers } = await handlersAnswering([
      aDeviceCode,
      { status: 200, body: { error: 'access_denied' } },
    ]);

    await handlers['subscriptions:device-code']({ provider: 'copilot' });

    const answered = await handlers['subscriptions:device-await']({ provider: 'copilot' });

    expect(answered).toMatchObject({
      ok: false,
      error: { code: 'sign-in-timed-out', message: 'The sign-in was denied on GitHub.' },
    });

    const held = await handlers['subscriptions:list']();

    expect(held.ok && held.value).toEqual([]);
  });
});

describe('a network that never answered at all', () => {
  test('an ask that threw crosses as a typed refusal rather than a throw', async () => {
    const world = await aFreshWorld();
    const context = world.contextOn('linux', world.nothingHappens);
    const handlers = createSubscriptionsIpcHandlers({
      ...context,
      deviceSignIn: {
        ...quietAppSignIns().deviceSignIn,
        fetchLike: async () => Promise.reject(new Error('the network is down')),
      },
    });

    const answered = await handlers['subscriptions:device-code']({ provider: 'copilot' });

    expect(answered.ok).toBe(false);
  });

  test('a wait that threw records no account', async () => {
    const world = await aFreshWorld();
    const context = world.contextOn('linux', world.nothingHappens);
    const handlers = createSubscriptionsIpcHandlers({
      ...context,
      deviceSignIn: {
        ...quietAppSignIns().deviceSignIn,
        fetchLike: async () => Promise.reject(new Error('the network is down')),
      },
    });

    await handlers['subscriptions:device-await']({ provider: 'copilot' });

    const held = await handlers['subscriptions:list']();

    expect(held.ok && held.value).toEqual([]);
  });
});

describe('the sign-in that happens in a browser', () => {
  test('the page opens on the provider before anything is waited on', async () => {
    const opened: string[] = [];
    const handlers = await handlersBrowsing((url) => {
      opened.push(url);
    });

    await handlers['subscriptions:browser-sign-in']({ provider: 'antigravity' });

    expect(opened[0]).toContain('https://accounts.google.com/o/oauth2/v2/auth');
  });

  test('a browser that never came back records no account and says so', async () => {
    const handlers = await handlersBrowsing(() => undefined);

    const answered = await handlers['subscriptions:browser-sign-in']({ provider: 'antigravity' });

    expect(answered).toMatchObject({ ok: false, error: { code: 'sign-in-timed-out' } });

    const held = await handlers['subscriptions:list']();

    expect(held.ok && held.value).toEqual([]);
  });
});

describe('a code ask that threw rather than answering', () => {
  test('the throw crosses as a typed refusal, naming no path from this machine', async () => {
    const world = await aFreshWorld();
    const handlers = createSubscriptionsIpcHandlers({
      ...world.contextOn('linux', world.nothingHappens),
      deviceSignIn: {
        ...quietAppSignIns().deviceSignIn,
        fetchLike: async () => Promise.reject(new Error('the network is down')),
      },
      writeSubscriptionCredential: async () => Promise.reject(new Error('the vault is shut')),
    });

    await handlers['subscriptions:device-code']({ provider: 'kimi' });

    const answered = await handlers['subscriptions:device-code']({ provider: 'kimi' });

    expect(answered.ok).toBe(false);
  });
});
