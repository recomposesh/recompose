import { describe, expect, test } from 'vitest';

import type { CredentialCustody, CustodyOutcome } from './credential-custody';

import { credentialCustody } from './credential-custody';
import {
  fakeKeychain,
  homeHolding,
  machineHolding,
  osUser,
  refusalIn,
} from './subscriptions.testkit';
import { homeVendorItem, machineVendorItem } from './vendor-item';

const oneHome = '/data/subscriptions/anthropic/acc-one';
const otherHome = '/data/subscriptions/anthropic/acc-two';
const pendingHome = '/data/subscriptions/anthropic/pending';

async function refusalFrom(
  seeded: Record<string, string>,
  atStep: number,
  work: (custody: CredentialCustody) => Promise<CustodyOutcome>,
): Promise<{ code: string; message: string }> {
  const keychain = fakeKeychain(seeded, { atStep, kind: 'failed' });

  return refusalIn(await work(credentialCustody(keychain.seam, osUser)));
}

describe('the credential a config home owns', () => {
  test('given the tool signed in against a home, custody reads that credential back', async () => {
    const keychain = fakeKeychain(homeHolding(pendingHome, 'opaque-one'));
    const custody = credentialCustody(keychain.seam, osUser);

    await expect(custody.readForHome(pendingHome)).resolves.toBe('opaque-one');
  });

  test('given no sign-in against a home, custody answers that the home holds nothing', async () => {
    const custody = credentialCustody(fakeKeychain().seam, osUser);

    await expect(custody.readForHome(pendingHome)).resolves.toBeNull();
  });

  test('given a credential under one home, the other home never reaches it', async () => {
    const keychain = fakeKeychain(homeHolding(oneHome, 'opaque-one'));
    const custody = credentialCustody(keychain.seam, osUser);

    await expect(custody.readForHome(otherHome)).resolves.toBeNull();
  });

  test('given a credential written for a home, custody reads back what it wrote', async () => {
    const keychain = fakeKeychain();
    const custody = credentialCustody(keychain.seam, osUser);

    await custody.writeForHome(oneHome, 'opaque-one');

    await expect(custody.readForHome(oneHome)).resolves.toBe('opaque-one');
  });

  test('given a credential under a home, letting the home go leaves it holding nothing', async () => {
    const keychain = fakeKeychain(homeHolding(oneHome, 'opaque-one'));
    const custody = credentialCustody(keychain.seam, osUser);

    const outcome = await custody.removeForHome(oneHome);

    expect(outcome).toEqual({ ok: true });
    await expect(custody.readForHome(oneHome)).resolves.toBeNull();
  });
});

describe("what the person's own tool keeps stands apart", () => {
  test('given the machine holds its own login, writing a home never reaches it', async () => {
    const keychain = fakeKeychain(machineHolding('the-persons-login'));
    const custody = credentialCustody(keychain.seam, osUser);

    await custody.writeForHome(oneHome, 'opaque-one');

    expect(keychain.blobAt(machineVendorItem(osUser).service, osUser)).toBe('the-persons-login');
  });

  test('given the machine holds its own login, letting a home go never reaches it', async () => {
    const keychain = fakeKeychain({
      ...machineHolding('the-persons-login'),
      ...homeHolding(oneHome, 'opaque-one'),
    });
    const custody = credentialCustody(keychain.seam, osUser);

    await custody.removeForHome(oneHome);

    expect(keychain.blobAt(machineVendorItem(osUser).service, osUser)).toBe('the-persons-login');
  });

  test('given a home holding nothing, custody answers nothing rather than the machine login', async () => {
    const keychain = fakeKeychain(machineHolding('the-persons-login'));
    const custody = credentialCustody(keychain.seam, osUser);

    await expect(custody.readForHome(oneHome)).resolves.toBeNull();
  });

  test("given a sign-in about to run, custody reads the machine's own login for a snapshot", async () => {
    const keychain = fakeKeychain(machineHolding('the-persons-login'));
    const custody = credentialCustody(keychain.seam, osUser);

    await expect(custody.readMachineItem()).resolves.toBe('the-persons-login');
  });
});

describe('a credential following its home', () => {
  test('given a sign-in landed in the pending home, the credential moves to the account home', async () => {
    const keychain = fakeKeychain(homeHolding(pendingHome, 'opaque-one'));
    const custody = credentialCustody(keychain.seam, osUser);

    const outcome = await custody.moveBetweenHomes(pendingHome, oneHome);

    expect(outcome).toEqual({ ok: true });
    await expect(custody.readForHome(oneHome)).resolves.toBe('opaque-one');
    await expect(custody.readForHome(pendingHome)).resolves.toBeNull();
  });

  test('given the source holds nothing, the move leaves the destination holding nothing', async () => {
    const keychain = fakeKeychain();
    const custody = credentialCustody(keychain.seam, osUser);

    const outcome = await custody.moveBetweenHomes(pendingHome, oneHome);

    expect(outcome).toEqual({ ok: true });
    await expect(custody.readForHome(oneHome)).resolves.toBeNull();
  });

  test('given the keychain refuses partway, the move never loses the credential', async () => {
    const keychain = fakeKeychain(homeHolding(pendingHome, 'opaque-one'), {
      atStep: 3,
      kind: 'failed',
    });
    const custody = credentialCustody(keychain.seam, osUser);

    await custody.moveBetweenHomes(pendingHome, oneHome);

    const source = keychain.blobAt(homeVendorItem(pendingHome, osUser).service, osUser);
    const destination = keychain.blobAt(homeVendorItem(oneHome, osUser).service, osUser);

    expect(source ?? destination).toBe('opaque-one');
  });
});

describe('an older tool that writes where the person keeps their own login', () => {
  test('given the tool wrote the machine item, the credential moves to the home that earned it', async () => {
    const keychain = fakeKeychain(machineHolding('what-the-old-tool-wrote'));
    const custody = credentialCustody(keychain.seam, osUser);

    const outcome = await custody.reclaimMachineWrite(pendingHome, 'the-persons-login');

    expect(outcome).toEqual({ ok: true });
    await expect(custody.readForHome(pendingHome)).resolves.toBe('what-the-old-tool-wrote');
  });

  test("given the tool overwrote it, the person's own login goes back where it was", async () => {
    const keychain = fakeKeychain(machineHolding('what-the-old-tool-wrote'));
    const custody = credentialCustody(keychain.seam, osUser);

    await custody.reclaimMachineWrite(pendingHome, 'the-persons-login');

    await expect(custody.readMachineItem()).resolves.toBe('the-persons-login');
  });

  test('given the machine held nothing before, the machine item is left holding nothing', async () => {
    const keychain = fakeKeychain(machineHolding('what-the-old-tool-wrote'));
    const custody = credentialCustody(keychain.seam, osUser);

    await custody.reclaimMachineWrite(pendingHome, null);

    await expect(custody.readMachineItem()).resolves.toBeNull();
    await expect(custody.readForHome(pendingHome)).resolves.toBe('what-the-old-tool-wrote');
  });

  test('given the machine item holds nothing to reclaim, nothing is written anywhere', async () => {
    const keychain = fakeKeychain();
    const custody = credentialCustody(keychain.seam, osUser);

    const outcome = await custody.reclaimMachineWrite(pendingHome, null);

    expect(outcome).toEqual({ ok: true });
    expect(keychain.writes()).toBe(0);
  });
});

describe('when the keychain refuses', () => {
  test('given the person denies the prompt, custody names the denial rather than a failure', async () => {
    const keychain = fakeKeychain(homeHolding(oneHome, 'opaque-one'), {
      atStep: 1,
      kind: 'denied',
    });
    const custody = credentialCustody(keychain.seam, osUser);

    const outcome = await custody.removeForHome(oneHome);

    expect(outcome).toMatchObject({ ok: false, code: 'keychain-denied' });
  });

  test('given the keychain refuses, the refusal names the step and never repeats the credential', async () => {
    const refusal = await refusalFrom(homeHolding(pendingHome, 'opaque-one'), 2, async (custody) =>
      custody.moveBetweenHomes(pendingHome, oneHome),
    );

    expect(refusal.message).toContain('move');
    expect(refusal.message).not.toContain('opaque-one');
  });
});

describe('one turn at a time', () => {
  test('given two moves asked at once, the second reads what the first wrote', async () => {
    const keychain = fakeKeychain(homeHolding(pendingHome, 'opaque-one'));
    const custody = credentialCustody(keychain.seam, osUser);

    const [first, second] = await Promise.all([
      custody.moveBetweenHomes(pendingHome, oneHome),
      custody.moveBetweenHomes(oneHome, otherHome),
    ]);

    expect([first, second]).toEqual([{ ok: true }, { ok: true }]);
    await expect(custody.readForHome(otherHome)).resolves.toBe('opaque-one');
  });
});
