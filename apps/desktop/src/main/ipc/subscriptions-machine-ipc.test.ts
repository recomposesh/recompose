import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, test } from 'vitest';

import type { SubscriptionsWorld } from './subscriptions-ipc.testkit';

import { oneAtATime } from '../storage/one-at-a-time';
import { aClaudeLogin, osUser } from '../subscriptions/subscriptions.testkit';
import { homeVendorItem, machineVendorItem } from '../subscriptions/vendor-item';
import { aFreshWorld, refusalIn, viewsIn } from './subscriptions-ipc.testkit';
import { createSubscriptionsMachineIpcHandlers } from './subscriptions-machine-ipc';

let world: SubscriptionsWorld;
let machineHome = '';

beforeEach(async () => {
  world = await aFreshWorld();
  machineHome = await mkdtemp(join(tmpdir(), 'recompose-machine-'));
});

function handlersOn(platform: NodeJS.Platform = 'darwin') {
  const ctx = world.contextOn(platform, world.nothingHappens);

  return createSubscriptionsMachineIpcHandlers(
    { ...ctx, homeFolder: machineHome, machine: { ...ctx.machine, homeFolder: machineHome } },
    oneAtATime(),
  );
}

async function theToolSignedInAs(address: string): Promise<void> {
  world.keychain.put(machineVendorItem(osUser).service, osUser, aClaudeLogin);
  await writeFile(
    join(machineHome, '.claude.json'),
    JSON.stringify({ oauthAccount: { emailAddress: address } }),
    'utf8',
  );
}

describe('reporting what the machine already holds', () => {
  test('given the tool signed in, the report names the address and the plan', async () => {
    await theToolSignedInAs('ada@ex.com');

    const answered = await handlersOn()['subscriptions:detect']({ provider: 'anthropic' });

    expect(answered).toEqual({
      ok: true,
      value: { holds: 'account', signedInAs: 'ada@ex.com', plan: 'max', standing: 'connected' },
    });
  });

  test('given nothing on the machine, the report says so rather than naming an account', async () => {
    const answered = await handlersOn()['subscriptions:detect']({ provider: 'anthropic' });

    expect(answered).toEqual({ ok: true, value: { holds: 'nothing' } });
  });

  test('given the report crossing to the screen, it carries no credential material', async () => {
    await theToolSignedInAs('ada@ex.com');

    const answered = await handlersOn()['subscriptions:detect']({ provider: 'anthropic' });

    expect(JSON.stringify(answered)).not.toContain('opaque');
  });
});

describe('adopting the account the machine already holds', () => {
  test('given the tool signed in, adopting records the account with no sign-in', async () => {
    await theToolSignedInAs('ada@ex.com');

    const answered = await handlersOn()['subscriptions:adopt']({ provider: 'anthropic' });

    expect(viewsIn(answered)).toEqual([
      expect.objectContaining({
        provider: 'anthropic',
        provenance: 'machine',
        label: 'ada@ex.com',
      }),
    ]);
    expect(world.launched).toEqual([]);
  });

  test('given an adopted account, the app keeps no copy of its credential', async () => {
    await theToolSignedInAs('ada@ex.com');

    await handlersOn()['subscriptions:adopt']({ provider: 'anthropic' });

    const stored = await world.storedAccounts();
    const id = stored.accounts[0]?.id ?? 'missing';
    const home = world.homesOn('darwin').homeFor('anthropic', id);

    expect(world.keychain.holds(homeVendorItem(home, osUser).service, osUser)).toBe(false);
  });

  test("given an adopted account, the person's own item is left exactly as it stood", async () => {
    await theToolSignedInAs('ada@ex.com');

    await handlersOn()['subscriptions:adopt']({ provider: 'anthropic' });

    expect(world.keychain.blobAt(machineVendorItem(osUser).service, osUser)).toBe(aClaudeLogin);
  });

  test('given nothing left to adopt, the refusal names what went away', async () => {
    const answered = await handlersOn()['subscriptions:adopt']({ provider: 'anthropic' });

    expect(refusalIn(answered).code).toBe('nothing-to-adopt');
    await expect(world.storedAccounts()).resolves.toMatchObject({ accounts: [] });
  });

  test('given the same address adopted twice, one account stands rather than two', async () => {
    await theToolSignedInAs('ada@ex.com');

    await handlersOn()['subscriptions:adopt']({ provider: 'anthropic' });
    const answered = await handlersOn()['subscriptions:adopt']({ provider: 'anthropic' });

    expect(viewsIn(answered)).toHaveLength(1);
  });
});
