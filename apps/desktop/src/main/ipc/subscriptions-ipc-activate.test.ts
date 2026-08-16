import { beforeEach, describe, expect, test } from 'vitest';

import type { SubscriptionHomes } from '../subscriptions/subscription-homes';
import type { SubscriptionsWorld } from './subscriptions-ipc.testkit';

import { osUser } from '../subscriptions/subscriptions.testkit';
import { homeVendorItem, machineVendorItem } from '../subscriptions/vendor-item';
import { createSubscriptionsIpcHandlers } from './subscriptions-ipc';
import { aFreshWorld, refusalIn, viewsIn } from './subscriptions-ipc.testkit';

let world: SubscriptionsWorld;

function handlersOn(platform: NodeJS.Platform = 'linux') {
  return createSubscriptionsIpcHandlers(world.contextOn(platform, world.nothingHappens));
}

async function twoAnthropicAccounts(platform: NodeJS.Platform): Promise<SubscriptionHomes> {
  const homes = world.homesOn(platform);

  await homes.resetPending('anthropic');
  await homes.promotePending('anthropic', 'acc-one');
  await homes.resetPending('anthropic');
  await homes.promotePending('anthropic', 'acc-two');
  await homes.pointActiveAt('anthropic', 'acc-one');
  await world.alreadyHolding([
    {
      id: 'acc-one',
      provider: 'anthropic',
      kind: 'subscription',
      provenance: 'sign-in',
      label: 'Ada',
    },
    {
      id: 'acc-two',
      provider: 'anthropic',
      kind: 'subscription',
      provenance: 'sign-in',
      label: 'Grace',
    },
  ]);

  return homes;
}

beforeEach(async () => {
  world = await aFreshWorld();
});

describe('choosing which account the provider tool answers to', () => {
  test('given two accounts, activating one moves the pointer and the list says so', async () => {
    const homes = await twoAnthropicAccounts('linux');

    const answered = await handlersOn()['subscriptions:activate']({ id: 'acc-two' });

    expect(viewsIn(answered).map((view) => [view.id, view.active])).toEqual([
      ['acc-one', false],
      ['acc-two', true],
    ]);
    await expect(homes.readActive('anthropic')).resolves.toBe('acc-two');
  });

  test('given an account nobody holds, activating refuses and names the account', async () => {
    const answered = await handlersOn()['subscriptions:activate']({ id: 'acc-nowhere' });

    expect(refusalIn(answered).code).toBe('storage-failed');
    expect(refusalIn(answered).message).toContain('acc-nowhere');
  });

  test('given a plan this app signs in itself, activating refuses rather than moving a pointer nothing reads', async () => {
    await world.alreadyHolding([
      {
        id: 'acc-copilot',
        provider: 'copilot',
        kind: 'subscription',
        provenance: 'sign-in',
        label: 'someone',
      },
    ]);

    const answered = await handlersOn()['subscriptions:activate']({ id: 'acc-copilot' });

    expect(refusalIn(answered).code).toBe('tool-missing');
    expect(refusalIn(answered).message).toContain('GitHub Copilot');
  });

  test('given a pasted-key account, activating refuses rather than treating it as a subscription', async () => {
    await world.alreadyHolding([
      {
        id: 'acc-key',
        provider: 'openrouter',
        kind: 'api-key',
        label: 'OpenRouter',
        credentialRef: 'cred-key',
      },
    ]);

    const answered = await handlersOn()['subscriptions:activate']({ id: 'acc-key' });

    expect(refusalIn(answered).code).toBe('storage-failed');
  });
});

describe('activating on macOS, where the tool keeps its credential in the keychain', () => {
  test('given two accounts, activating moves the pointer and disturbs no credential', async () => {
    const homes = await twoAnthropicAccounts('darwin');
    const one = homeVendorItem(homes.homeFor('anthropic', 'acc-one'), osUser).service;
    const two = homeVendorItem(homes.homeFor('anthropic', 'acc-two'), osUser).service;

    world.keychain.put(one, osUser, 'blob-one');
    world.keychain.put(two, osUser, 'blob-two');

    await handlersOn('darwin')['subscriptions:activate']({ id: 'acc-two' });

    await expect(homes.readActive('anthropic')).resolves.toBe('acc-two');
    expect(world.keychain.blobAt(one, osUser)).toBe('blob-one');
    expect(world.keychain.blobAt(two, osUser)).toBe('blob-two');
  });

  test("given an activation, the person's own login is never written", async () => {
    await twoAnthropicAccounts('darwin');
    world.keychain.put(machineVendorItem(osUser).service, osUser, 'the-persons-login');

    await handlersOn('darwin')['subscriptions:activate']({ id: 'acc-two' });

    expect(world.keychain.blobAt(machineVendorItem(osUser).service, osUser)).toBe(
      'the-persons-login',
    );
  });
});
