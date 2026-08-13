import { describe, expect, test } from 'vitest';

import type { KeychainSeam } from './credential-custody';
import type { CustodyRepairDeps } from './custody-repair';

import {
  keychainCarriedOnce,
  PARKED_SERVICE,
  RESERVED_SLOT,
  repairCustody,
} from './custody-repair';
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

  test('given an active account whose stores both stand empty, nothing is carried back', async () => {
    const keychain = fakeKeychain();

    const outcome = await repairCustody(
      aRepair(keychain, {
        accountIds: async () => Promise.resolve(['acc-one']),
        activeId: async () => Promise.resolve('acc-one'),
      }),
    );

    expect(outcome).toEqual({ ok: true });
    expect(keychain.writes()).toBe(0);
    expect(keychain.holds(theMachineItem, osUser)).toBe(false);
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

function aSeam(order: string[]): KeychainSeam {
  return {
    read: async (item) => {
      order.push(`read ${item.service}`);

      return Promise.resolve(null);
    },
    write: async (item) => {
      order.push(`write ${item.service}`);

      return Promise.resolve();
    },
    remove: async (item) => {
      order.push(`remove ${item.service}`);

      return Promise.resolve();
    },
  };
}

describe('when the carry runs relative to the reads that need it', () => {
  const anItem = { service: 'a-service', account: osUser };

  test('given a first read, the carry finishes before the read reaches the store', async () => {
    const order: string[] = [];
    const carried = keychainCarriedOnce(aSeam(order), async () => {
      order.push('carried');

      return Promise.resolve({ ok: true });
    });

    await carried.read(anItem);

    expect(order).toEqual(['carried', 'read a-service']);
  });

  test('given many operations, the carry runs once rather than before each', async () => {
    const order: string[] = [];
    const carried = keychainCarriedOnce(aSeam(order), async () => {
      order.push('carried');

      return Promise.resolve({ ok: true });
    });

    await carried.read(anItem);
    await carried.write(anItem, 'blob');
    await carried.remove(anItem);

    expect(order.filter((step) => step === 'carried')).toHaveLength(1);
    expect(order).toEqual(['carried', 'read a-service', 'write a-service', 'remove a-service']);
  });

  test('given a carry that refuses, the operation that triggered it still answers', async () => {
    const order: string[] = [];
    const carried = keychainCarriedOnce(aSeam(order), async () =>
      Promise.reject(new Error('the keychain would not open')),
    );

    await expect(carried.read(anItem)).resolves.toBeNull();
    expect(order).toEqual(['read a-service']);
  });

  test('given two operations at once, they wait on the same carry', async () => {
    let carries = 0;
    const carried = keychainCarriedOnce(aSeam([]), async () => {
      carries += 1;

      return Promise.resolve({ ok: true });
    });

    await Promise.all([carried.read(anItem), carried.read(anItem)]);

    expect(carries).toBe(1);
  });
});
