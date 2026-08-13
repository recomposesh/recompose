import { describe, expect, test } from 'vitest';

import { machineCredentialReadingSchema } from './subscriptions';

const foundAccount = {
  holds: 'account',
  signedInAs: 'dev@example.com',
  plan: 'Max',
  standing: 'connected',
};

describe('what the app reports the machine already holds', () => {
  test('a machine holding an account names the address, the plan, and how it stands', () => {
    expect(machineCredentialReadingSchema.parse(foundAccount)).toEqual(foundAccount);
  });

  test('a record that named neither address nor plan still reports the account it holds', () => {
    const unnamed = { holds: 'account', standing: 'connected' };

    expect(machineCredentialReadingSchema.parse(unnamed)).toEqual(unnamed);
  });

  test('a lapsed credential reads as an account found, so it stays apart from an absent one', () => {
    const lapsed = { ...foundAccount, standing: 'lapsed' };

    expect(machineCredentialReadingSchema.parse(lapsed)).toEqual(lapsed);
  });

  test('a machine holding nothing says so and names no account', () => {
    expect(machineCredentialReadingSchema.parse({ holds: 'nothing' })).toEqual({
      holds: 'nothing',
    });
    expect(() =>
      machineCredentialReadingSchema.parse({ holds: 'nothing', signedInAs: 'dev@example.com' }),
    ).toThrow();
  });

  test('a record carrying no account credential reads apart from a machine holding nothing', () => {
    expect(machineCredentialReadingSchema.parse({ holds: 'no-account-credential' })).toEqual({
      holds: 'no-account-credential',
    });
  });

  test('a store that refused to open reads apart from a machine holding nothing', () => {
    expect(machineCredentialReadingSchema.parse({ holds: 'store-refused' })).toEqual({
      holds: 'store-refused',
    });
  });
});

describe('what a report of the machine refuses to carry', () => {
  test('a refusal carries no sentence, because the screen owns those words', () => {
    expect(() =>
      machineCredentialReadingSchema.parse({
        holds: 'store-refused',
        message: 'the operating system refused',
      }),
    ).toThrow();
  });

  test('a state outside the four the report knows is refused', () => {
    for (const holds of ['maybe', 'expired', '']) {
      expect(() => machineCredentialReadingSchema.parse({ holds })).toThrow();
    }
  });

  test('no arm carries credential material, because a report is read before anyone acts', () => {
    for (const smuggled of [
      { credential: '{"claudeAiOauth":{"accessToken":"oauth-token"}}' },
      { accessToken: 'oauth-token' },
      { refreshToken: 'oauth-refresh' },
      { token: 'oauth-token' },
      { apiKey: 'sk-oops' },
    ]) {
      expect(() =>
        machineCredentialReadingSchema.parse({ ...foundAccount, ...smuggled }),
      ).toThrow();
      expect(() =>
        machineCredentialReadingSchema.parse({ holds: 'nothing', ...smuggled }),
      ).toThrow();
    }
  });

  test('a blank address is refused rather than reporting an account nobody can read', () => {
    expect(() =>
      machineCredentialReadingSchema.parse({ ...foundAccount, signedInAs: '   ' }),
    ).toThrow();
  });

  test('an account found with no standing is refused, because a lapse must read on the report', () => {
    const { standing, ...withoutTheStanding } = foundAccount;

    expect(standing).toBe('connected');
    expect(() => machineCredentialReadingSchema.parse(withoutTheStanding)).toThrow();
  });
});
