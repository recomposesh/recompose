import { describe, expect, test } from 'vitest';

import { credentialCustody } from './credential-custody';
import { fakeKeychain, homeHolding, machineHolding, osUser } from './subscriptions.testkit';

const home = '/data/subscriptions/anthropic/acc-one';

describe('what the tool left behind, answered by reading the item rather than probing it', () => {
  test('given the tool signed in against a home, standing reads the credential from that home', async () => {
    const keychain = fakeKeychain(homeHolding(home, 'opaque-one'));
    const custody = credentialCustody(keychain.seam, osUser);

    await expect(custody.readForHome(home)).resolves.toBe('opaque-one');
  });

  test('given the account was let go, the home answers nothing rather than a stale credential', async () => {
    const keychain = fakeKeychain(homeHolding(home, 'opaque-one'));
    const custody = credentialCustody(keychain.seam, osUser);

    await custody.removeForHome(home);

    await expect(custody.readForHome(home)).resolves.toBeNull();
  });

  test('given the keychain prompt is denied, a read carries the refusal out rather than calling it empty', async () => {
    const keychain = fakeKeychain(homeHolding(home, 'opaque-one'));
    const custody = credentialCustody(keychain.seam, osUser);

    keychain.denyEverything();

    await expect(custody.readForHome(home)).rejects.toThrow('denied');
  });

  test("given the keychain prompt is denied, reading the machine's own item refuses too", async () => {
    const keychain = fakeKeychain(machineHolding('the-persons-login'));
    const custody = credentialCustody(keychain.seam, osUser);

    keychain.denyEverything();

    await expect(custody.readMachineItem()).rejects.toThrow('denied');
  });
});
