import { beforeEach, describe, expect, test } from 'vitest';

import type { SubscriptionsIpcContext } from './subscriptions-ipc';
import type { SubscriptionsWorld } from './subscriptions-ipc.testkit';

import { PARKED_SERVICE, VENDOR_SERVICE } from '../subscriptions/credential-custody';
import { aClaudeLogin, anMcpRecordAlone, osUser } from '../subscriptions/subscriptions.testkit';
import { createSubscriptionsIpcHandlers } from './subscriptions-ipc';
import { aFreshWorld, claudeCodeSignedIn, refusalIn, viewsIn } from './subscriptions-ipc.testkit';

let world: SubscriptionsWorld;

function handlersOn(platform: NodeJS.Platform, launch: SubscriptionsIpcContext['launch']) {
  return createSubscriptionsIpcHandlers(world.contextOn(platform, launch));
}

function claudeCodeSigningIn() {
  const homes = world.homesOn('darwin');

  return world.toolSigningIn(homes, 'anthropic', claudeCodeSignedIn('ada@ex.com', 'max'));
}

function theToolLeaving(blob: string): SubscriptionsIpcContext['launch'] {
  return async () => {
    world.keychain.put(VENDOR_SERVICE, osUser, blob);

    return Promise.resolve();
  };
}

beforeEach(async () => {
  world = await aFreshWorld();
});

describe('signing in on macOS, where the tool keeps its credential in the keychain', () => {
  test('given a credential already in the keychain, it is parked before the tool runs', async () => {
    await world.toolInstalled('claude');
    world.keychain.put(VENDOR_SERVICE, osUser, 'someone-elses-login');

    const answered = await handlersOn('darwin', claudeCodeSigningIn())['subscriptions:sign-in']({
      provider: 'anthropic',
    });
    const stored = await world.storedAccounts();
    const newId = stored.accounts[0]?.id ?? 'missing';

    expect(answered.ok).toBe(true);
    expect(world.keychain.blobAt(PARKED_SERVICE, 'login-before-recompose')).toBe(
      'someone-elses-login',
    );
    expect(world.keychain.blobAt(PARKED_SERVICE, newId)).toBe(aClaudeLogin);
  });

  test('given a denied keychain prompt, the sign-in refuses before the tool runs', async () => {
    await world.toolInstalled('claude');
    world.keychain.denyEverything();

    const answered = await handlersOn('darwin', world.nothingHappens)['subscriptions:sign-in']({
      provider: 'anthropic',
    });

    expect(refusalIn(answered).code).toBe('keychain-denied');
    expect(world.launched).toEqual([]);
  });

  test('given a sign-in that times out, the credential that was there is put back', async () => {
    await world.toolInstalled('claude');
    world.keychain.put(VENDOR_SERVICE, osUser, 'someone-elses-login');

    await handlersOn('darwin', world.nothingHappens)['subscriptions:sign-in']({
      provider: 'anthropic',
    });

    expect(world.keychain.blobAt(VENDOR_SERVICE, osUser)).toBe('someone-elses-login');
  });

  test('given a sign-in that breaks partway, the credential that was there is put back', async () => {
    await world.toolInstalled('claude');
    world.keychain.put(VENDOR_SERVICE, osUser, 'someone-elses-login');
    const handlers = createSubscriptionsIpcHandlers({
      ...world.contextOn('darwin', world.nothingHappens),
      clock: () => ({
        elapsed: () => 0,
        sleep: async () => {
          await Promise.reject(new Error('the machine stopped answering'));
        },
      }),
    });

    const answered = await handlers['subscriptions:sign-in']({ provider: 'anthropic' });

    expect(answered.ok).toBe(false);
    expect(world.keychain.blobAt(VENDOR_SERVICE, osUser)).toBe('someone-elses-login');
  });
});

describe('signing in on macOS, where the tool writes the keychain before the login lands', () => {
  test('given the login lands only in the keychain, the account is stored and reads connected', async () => {
    await world.toolInstalled('claude');

    const answered = await handlersOn('darwin', theToolLeaving(aClaudeLogin))[
      'subscriptions:sign-in'
    ]({ provider: 'anthropic' });

    expect(viewsIn(answered)).toEqual([
      expect.objectContaining({ provider: 'anthropic', standing: 'connected', active: true }),
    ]);
  });

  test('given only an MCP record lands in the keychain, the sign-in times out and stores no account', async () => {
    await world.toolInstalled('claude');

    const answered = await handlersOn('darwin', theToolLeaving(anMcpRecordAlone))[
      'subscriptions:sign-in'
    ]({ provider: 'anthropic' });

    expect(refusalIn(answered).code).toBe('sign-in-timed-out');
    await expect(world.storedAccounts()).resolves.toMatchObject({ accounts: [] });
  });
});

describe('signing in when the login that stood before cannot be put back', () => {
  test('given the keychain refusing the restore, the sign-in says so rather than reporting a timeout', async () => {
    await world.toolInstalled('claude');
    world.keychain.put(VENDOR_SERVICE, osUser, 'someone-elses-login');

    const answered = await handlersOn('darwin', async () => {
      world.keychain.denyEverything();

      return Promise.resolve();
    })['subscriptions:sign-in']({ provider: 'anthropic' });

    expect(refusalIn(answered).code).toBe('keychain-denied');
    expect(world.keychain.blobAt(PARKED_SERVICE, 'login-before-recompose')).toBe(
      'someone-elses-login',
    );
  });
});
