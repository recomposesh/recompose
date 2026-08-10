import { test } from '@fast-check/vitest';
import { describe, expect } from 'vitest';

import { credentialCustody } from './credential-custody';
import { fakeKeychain, osUser, parkedUnder, vendorHolding } from './subscriptions.testkit';

describe('what the tool left behind, answered by reading the slot rather than probing it', () => {
  test('given the tool holding a credential, the vendor slot answers it, and once emptied it answers nothing', async () => {
    const keychain = fakeKeychain(vendorHolding('opaque-one'));
    const custody = credentialCustody(keychain.seam, osUser);

    await expect(custody.vendorHolds()).resolves.toBe('opaque-one');

    await custody.clear();

    await expect(custody.vendorHolds()).resolves.toBeNull();
  });

  test('given a slot nobody parked anything under, reading it answers nothing', async () => {
    const keychain = fakeKeychain(parkedUnder('acc-one', 'opaque-one'));
    const custody = credentialCustody(keychain.seam, osUser);

    await expect(custody.readFor('acc-one', false)).resolves.toBe('opaque-one');
    await expect(custody.readFor('acc-two', false)).resolves.toBeNull();
  });

  test('given the secret prompt denied, reading the vendor slot carries the refusal out rather than calling it empty', async () => {
    const keychain = fakeKeychain(vendorHolding('opaque-one'));
    const custody = credentialCustody(keychain.seam, osUser);

    keychain.denyEverything();

    await expect(custody.vendorHolds()).rejects.toThrow('denied');
  });
});
