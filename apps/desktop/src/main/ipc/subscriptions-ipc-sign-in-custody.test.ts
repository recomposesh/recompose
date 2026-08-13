import { beforeEach, describe, expect, test } from 'vitest';

import type { SubscriptionsIpcContext } from './subscriptions-ipc';
import type { SubscriptionsWorld } from './subscriptions-ipc.testkit';

import { credentialCustody } from '../subscriptions/credential-custody';
import {
  aClaudeLogin,
  anMcpRecordAlone,
  fakeKeychain,
  osUser,
} from '../subscriptions/subscriptions.testkit';
import { homeVendorItem, machineVendorItem } from '../subscriptions/vendor-item';
import { createSubscriptionsIpcHandlers } from './subscriptions-ipc';
import { aFreshWorld, claudeCodeSignedIn, refusalIn, viewsIn } from './subscriptions-ipc.testkit';

let world: SubscriptionsWorld;

const theMachineItem = (): string => machineVendorItem(osUser).service;

const thePendingItem = (): string =>
  homeVendorItem(world.homesOn('darwin').pendingHomeFor('anthropic'), osUser).service;

function handlersOn(platform: NodeJS.Platform, launch: SubscriptionsIpcContext['launch']) {
  return createSubscriptionsIpcHandlers(world.contextOn(platform, launch));
}

function claudeCodeSigningIn() {
  const homes = world.homesOn('darwin');

  return world.toolSigningIn(homes, 'anthropic', claudeCodeSignedIn('ada@ex.com', 'max'));
}

function aToolLeaving(where: () => string, blob: string): SubscriptionsIpcContext['launch'] {
  return async () => {
    world.keychain.put(where(), osUser, blob);

    return Promise.resolve();
  };
}

beforeEach(async () => {
  world = await aFreshWorld();
});

describe("signing in leaves the login the person's own install reads alone", () => {
  test('given the machine holds its own login, a finished sign-in never writes over it', async () => {
    await world.toolInstalled('claude');
    world.keychain.put(theMachineItem(), osUser, 'the-persons-login');

    const answered = await handlersOn('darwin', claudeCodeSigningIn())['subscriptions:sign-in']({
      provider: 'anthropic',
    });

    expect(answered.ok).toBe(true);
    expect(world.keychain.blobAt(theMachineItem(), osUser)).toBe('the-persons-login');
  });

  test('given the machine holds its own login, a sign-in that times out never writes over it', async () => {
    await world.toolInstalled('claude');
    world.keychain.put(theMachineItem(), osUser, 'the-persons-login');

    await handlersOn('darwin', world.nothingHappens)['subscriptions:sign-in']({
      provider: 'anthropic',
    });

    expect(world.keychain.blobAt(theMachineItem(), osUser)).toBe('the-persons-login');
  });

  test('given the machine holds nothing, a sign-in leaves it holding nothing', async () => {
    await world.toolInstalled('claude');

    await handlersOn('darwin', claudeCodeSigningIn())['subscriptions:sign-in']({
      provider: 'anthropic',
    });

    expect(world.keychain.holds(theMachineItem(), osUser)).toBe(false);
  });
});

describe('signing in on macOS, where the tool keeps its credential in the keychain', () => {
  test('given the login lands in the item the home owns, the account is stored and reads connected', async () => {
    await world.toolInstalled('claude');

    const answered = await handlersOn('darwin', aToolLeaving(thePendingItem, aClaudeLogin))[
      'subscriptions:sign-in'
    ]({ provider: 'anthropic' });

    expect(viewsIn(answered)).toEqual([
      expect.objectContaining({ provider: 'anthropic', standing: 'connected', active: true }),
    ]);
  });

  test('given the account is stored, its credential follows the home it was promoted into', async () => {
    await world.toolInstalled('claude');

    await handlersOn('darwin', aToolLeaving(thePendingItem, aClaudeLogin))['subscriptions:sign-in'](
      {
        provider: 'anthropic',
      },
    );

    const stored = await world.storedAccounts();
    const id = stored.accounts[0]?.id ?? 'missing';
    const home = world.homesOn('darwin').homeFor('anthropic', id);

    expect(world.keychain.blobAt(homeVendorItem(home, osUser).service, osUser)).toBe(aClaudeLogin);
    expect(world.keychain.holds(thePendingItem(), osUser)).toBe(false);
  });

  test('given only an MCP record lands, the sign-in times out and stores no account', async () => {
    await world.toolInstalled('claude');

    const answered = await handlersOn('darwin', aToolLeaving(thePendingItem, anMcpRecordAlone))[
      'subscriptions:sign-in'
    ]({ provider: 'anthropic' });

    expect(refusalIn(answered).code).toBe('sign-in-timed-out');
    await expect(world.storedAccounts()).resolves.toMatchObject({ accounts: [] });
  });
});

describe('signing in with an older tool that writes where the person keeps their own login', () => {
  test('given the older tool wrote the machine item, the sign-in still finishes', async () => {
    await world.toolInstalled('claude');
    world.keychain.put(theMachineItem(), osUser, 'the-persons-login');

    const answered = await handlersOn('darwin', aToolLeaving(theMachineItem, aClaudeLogin))[
      'subscriptions:sign-in'
    ]({ provider: 'anthropic' });

    expect(viewsIn(answered)).toEqual([
      expect.objectContaining({ provider: 'anthropic', standing: 'connected' }),
    ]);
  });

  test("given the older tool wrote the machine item, the person's own login goes back", async () => {
    await world.toolInstalled('claude');
    world.keychain.put(theMachineItem(), osUser, 'the-persons-login');

    await handlersOn('darwin', aToolLeaving(theMachineItem, aClaudeLogin))['subscriptions:sign-in'](
      {
        provider: 'anthropic',
      },
    );

    expect(world.keychain.blobAt(theMachineItem(), osUser)).toBe('the-persons-login');
  });
});

describe('signing in when the keychain turns on recompose partway', () => {
  test('given the keychain refusing while the credential follows its home, no account is stored', async () => {
    await world.toolInstalled('claude');

    const keychain = fakeKeychain(
      { [`${thePendingItem()} ${osUser}`]: aClaudeLogin },
      { atStep: 4, kind: 'denied' },
    );
    const handlers = createSubscriptionsIpcHandlers({
      ...world.contextOn('darwin', world.nothingHappens),
      custody: credentialCustody(keychain.seam, osUser),
    });

    const answered = await handlers['subscriptions:sign-in']({ provider: 'anthropic' });

    expect(refusalIn(answered).code).toBe('keychain-denied');
    await expect(world.storedAccounts()).resolves.toMatchObject({ accounts: [] });
  });
});
