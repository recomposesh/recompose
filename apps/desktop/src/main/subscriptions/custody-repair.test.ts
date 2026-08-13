import { describe, expect, test } from 'vitest';

import type { CustodyRepairDeps } from './custody-repair';

import { PARKED_SERVICE, RESERVED_SLOT, repairCustody } from './custody-repair';
import { fakeKeychain, machineHolding, osUser } from './subscriptions.testkit';
import { homeVendorItem, machineVendorItem } from './vendor-item';

const homeFor = (id: string): string => `/data/subscriptions/anthropic/${id}`;

const theMachineItem = machineVendorItem(osUser).service;

const itemFor = (id: string): string => homeVendorItem(homeFor(id), osUser).service;

function parkedUnder(slot: string, blob: string): Record<string, string> {
  return { [`${PARKED_SERVICE} ${slot}`]: blob };
}

function aRepair(
  keychain: ReturnType<typeof fakeKeychain>,
  over: Partial<CustodyRepairDeps> = {},
): CustodyRepairDeps {
  return {
    keychain: keychain.seam,
    osUser,
    homeFor,
    accountIds: async () => Promise.resolve([]),
    activeId: async () => Promise.resolve(null),
    ...over,
  };
}

describe('carrying an older install onto per-home keychain items', () => {
  test('given the active credential in the shared item, it moves to the home that owns it', async () => {
    const keychain = fakeKeychain(machineHolding('active-blob'));

    const outcome = await repairCustody(
      aRepair(keychain, {
        accountIds: async () => Promise.resolve(['acc-one']),
        activeId: async () => Promise.resolve('acc-one'),
      }),
    );

    expect(outcome).toEqual({ ok: true });
    expect(keychain.blobAt(itemFor('acc-one'), osUser)).toBe('active-blob');
  });

  test("given a login parked from before, it goes back to the person's own item", async () => {
    const keychain = fakeKeychain({
      ...machineHolding('active-blob'),
      ...parkedUnder(RESERVED_SLOT, 'the-persons-login'),
    });

    await repairCustody(
      aRepair(keychain, {
        accountIds: async () => Promise.resolve(['acc-one']),
        activeId: async () => Promise.resolve('acc-one'),
      }),
    );

    expect(keychain.blobAt(theMachineItem, osUser)).toBe('the-persons-login');
  });

  test('given nothing parked from before, the shared item is emptied rather than left holding ours', async () => {
    const keychain = fakeKeychain(machineHolding('active-blob'));

    await repairCustody(
      aRepair(keychain, {
        accountIds: async () => Promise.resolve(['acc-one']),
        activeId: async () => Promise.resolve('acc-one'),
      }),
    );

    expect(keychain.holds(theMachineItem, osUser)).toBe(false);
  });
});

describe('carrying the accounts an older install parked', () => {
  test('given accounts parked under their ids, each lands in the home that owns it', async () => {
    const keychain = fakeKeychain({
      ...parkedUnder('acc-one', 'one-blob'),
      ...parkedUnder('acc-two', 'two-blob'),
    });

    await repairCustody(
      aRepair(keychain, { accountIds: async () => Promise.resolve(['acc-one', 'acc-two']) }),
    );

    expect(keychain.blobAt(itemFor('acc-one'), osUser)).toBe('one-blob');
    expect(keychain.blobAt(itemFor('acc-two'), osUser)).toBe('two-blob');
  });

  test('given the repair ran, nothing is left parked anywhere', async () => {
    const keychain = fakeKeychain({
      ...parkedUnder('acc-one', 'one-blob'),
      ...parkedUnder(RESERVED_SLOT, 'the-persons-login'),
    });

    await repairCustody(
      aRepair(keychain, { accountIds: async () => Promise.resolve(['acc-one']) }),
    );

    expect(keychain.holds(PARKED_SERVICE, 'acc-one')).toBe(false);
    expect(keychain.holds(PARKED_SERVICE, RESERVED_SLOT)).toBe(false);
  });
});

describe('a repair that has already run', () => {
  test('given a second run, nothing moves and nothing is written', async () => {
    const keychain = fakeKeychain({
      ...machineHolding('the-persons-login'),
      [`${itemFor('acc-one')} ${osUser}`]: 'one-blob',
    });
    const deps = aRepair(keychain, {
      accountIds: async () => Promise.resolve(['acc-one']),
      activeId: async () => Promise.resolve('acc-one'),
    });

    await repairCustody(deps);
    const settled = keychain.writes();

    await repairCustody(deps);

    expect(keychain.writes()).toBe(settled);
    expect(keychain.blobAt(theMachineItem, osUser)).toBe('the-persons-login');
  });

  test('given a fresh install with nothing to carry, nothing is written at all', async () => {
    const keychain = fakeKeychain();

    const outcome = await repairCustody(aRepair(keychain));

    expect(outcome).toEqual({ ok: true });
    expect(keychain.writes()).toBe(0);
  });
});

describe('when the keychain refuses partway', () => {
  test('given a refusal, the outcome names it rather than reporting success', async () => {
    const keychain = fakeKeychain(
      { ...machineHolding('active-blob'), ...parkedUnder(RESERVED_SLOT, 'the-persons-login') },
      { atStep: 3, kind: 'denied' },
    );

    const outcome = await repairCustody(
      aRepair(keychain, {
        accountIds: async () => Promise.resolve(['acc-one']),
        activeId: async () => Promise.resolve('acc-one'),
      }),
    );

    expect(outcome).toMatchObject({ ok: false, code: 'keychain-denied' });
  });

  test('given a refusal, the credential it was carrying still stands somewhere', async () => {
    const keychain = fakeKeychain(machineHolding('active-blob'), { atStep: 3, kind: 'failed' });

    await repairCustody(
      aRepair(keychain, {
        accountIds: async () => Promise.resolve(['acc-one']),
        activeId: async () => Promise.resolve('acc-one'),
      }),
    );

    const carried = keychain.blobAt(itemFor('acc-one'), osUser);
    const shared = keychain.blobAt(theMachineItem, osUser);

    expect(carried ?? shared).toBe('active-blob');
  });
});
