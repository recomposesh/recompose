import type { SubscriptionAccount } from '@recompose/contracts';

import { mkdtemp, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, test } from 'vitest';

import type { FakeKeychain } from './subscriptions.testkit';

import { credentialCustody } from './credential-custody';
import { subscriptionHomes, type SubscriptionHomes } from './subscription-homes';
import { subscriptionRelease } from './subscription-release';
import { fakeKeychain, osUser } from './subscriptions.testkit';
import { homeVendorItem, machineVendorItem } from './vendor-item';

let userDataPath: string;
let homes: SubscriptionHomes;
let keychain: FakeKeychain;

function anAccount(id: string, provider: SubscriptionAccount['provider']): SubscriptionAccount {
  return { id, provider, kind: 'subscription', provenance: 'sign-in', label: 'Ada' };
}

async function homeExists(provider: SubscriptionAccount['provider'], id: string): Promise<boolean> {
  return stat(homes.homeFor(provider, id)).then(
    () => true,
    () => false,
  );
}

async function anAccountWithAHome(provider: SubscriptionAccount['provider'], id: string) {
  await homes.resetPending(provider);
  await homes.promotePending(provider, id);
}

beforeEach(async () => {
  userDataPath = await mkdtemp(join(tmpdir(), 'recompose-release-'));
  homes = subscriptionHomes(userDataPath, process.platform);
  keychain = fakeKeychain();
});

describe('letting go of a subscription account', () => {
  test('given an account leaving, its config home goes with it', async () => {
    await anAccountWithAHome('anthropic', 'acc-one');
    const release = subscriptionRelease(homes, null);

    await release(anAccount('acc-one', 'anthropic'), []);

    await expect(homeExists('anthropic', 'acc-one')).resolves.toBe(false);
  });

  test('given the account the pointer stood at leaving, the pointer moves to a survivor', async () => {
    await anAccountWithAHome('anthropic', 'acc-one');
    await anAccountWithAHome('anthropic', 'acc-two');
    await homes.pointActiveAt('anthropic', 'acc-one');
    const release = subscriptionRelease(homes, null);

    await release(anAccount('acc-one', 'anthropic'), ['acc-two']);

    await expect(homes.readActive('anthropic')).resolves.toBe('acc-two');
  });

  test('given the last account leaving, no pointer is left dangling', async () => {
    await anAccountWithAHome('anthropic', 'acc-one');
    await homes.pointActiveAt('anthropic', 'acc-one');
    const release = subscriptionRelease(homes, null);

    await release(anAccount('acc-one', 'anthropic'), []);

    await expect(homes.readActive('anthropic')).resolves.toBeNull();
  });

  test('given another account leaving, the pointer stays where it stood', async () => {
    await anAccountWithAHome('anthropic', 'acc-one');
    await anAccountWithAHome('anthropic', 'acc-two');
    await homes.pointActiveAt('anthropic', 'acc-one');
    const release = subscriptionRelease(homes, null);

    await release(anAccount('acc-two', 'anthropic'), ['acc-one']);

    await expect(homes.readActive('anthropic')).resolves.toBe('acc-one');
  });
});

describe('letting go of the credential a leaving account kept in the keychain', () => {
  test('given an account leaving, the credential its own home kept goes with it', async () => {
    await anAccountWithAHome('anthropic', 'acc-one');
    await anAccountWithAHome('anthropic', 'acc-two');
    const home = homes.homeFor('anthropic', 'acc-one');

    keychain.put(homeVendorItem(home, osUser).service, osUser, 'blob-one');
    const release = subscriptionRelease(homes, credentialCustody(keychain.seam, osUser));

    await release(anAccount('acc-one', 'anthropic'), ['acc-two']);

    expect(keychain.blobAt(homeVendorItem(home, osUser).service, osUser)).toBeNull();
  });

  test('given an account leaving, every other account keeps its own credential', async () => {
    await anAccountWithAHome('anthropic', 'acc-one');
    await anAccountWithAHome('anthropic', 'acc-two');
    const staying = homes.homeFor('anthropic', 'acc-two');

    keychain.put(
      homeVendorItem(homes.homeFor('anthropic', 'acc-one'), osUser).service,
      osUser,
      'blob-one',
    );
    keychain.put(homeVendorItem(staying, osUser).service, osUser, 'blob-two');
    const release = subscriptionRelease(homes, credentialCustody(keychain.seam, osUser));

    await release(anAccount('acc-one', 'anthropic'), ['acc-two']);

    expect(keychain.blobAt(homeVendorItem(staying, osUser).service, osUser)).toBe('blob-two');
  });
});

describe("letting go never reaches the login the person's own install reads", () => {
  test("given the last account leaving, the person's own login stands where it always stood", async () => {
    await anAccountWithAHome('anthropic', 'acc-one');
    await homes.pointActiveAt('anthropic', 'acc-one');
    keychain.put(machineVendorItem(osUser).service, osUser, 'the-persons-login');
    keychain.put(
      homeVendorItem(homes.homeFor('anthropic', 'acc-one'), osUser).service,
      osUser,
      'blob-one',
    );
    const release = subscriptionRelease(homes, credentialCustody(keychain.seam, osUser));

    await release(anAccount('acc-one', 'anthropic'), []);

    expect(keychain.blobAt(machineVendorItem(osUser).service, osUser)).toBe('the-persons-login');
  });

  test("given any account leaving, the person's own login is never handed anything", async () => {
    await anAccountWithAHome('anthropic', 'acc-one');
    await anAccountWithAHome('anthropic', 'acc-two');
    await homes.pointActiveAt('anthropic', 'acc-one');
    keychain.put(
      homeVendorItem(homes.homeFor('anthropic', 'acc-two'), osUser).service,
      osUser,
      'blob-two',
    );
    const release = subscriptionRelease(homes, credentialCustody(keychain.seam, osUser));

    await release(anAccount('acc-one', 'anthropic'), ['acc-two']);

    expect(keychain.holds(machineVendorItem(osUser).service, osUser)).toBe(false);
  });

  test('given a Codex account leaving, the keychain is never touched, because Codex never used it', async () => {
    await anAccountWithAHome('openai', 'acc-one');
    await homes.pointActiveAt('openai', 'acc-one');
    keychain.put(machineVendorItem(osUser).service, osUser, 'the-persons-login');
    const release = subscriptionRelease(homes, credentialCustody(keychain.seam, osUser));

    await release(anAccount('acc-one', 'openai'), []);

    expect(keychain.blobAt(machineVendorItem(osUser).service, osUser)).toBe('the-persons-login');
    await expect(homeExists('openai', 'acc-one')).resolves.toBe(false);
  });
});
