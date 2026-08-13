import { fc, test } from '@fast-check/vitest';
import { describe, expect } from 'vitest';

import { ACCOUNTS_VERSION, loadAccountsDocument, type Account } from './accounts';

const subscriptionRow = {
  id: 'acc-claude-max',
  provider: 'anthropic',
  kind: 'subscription',
  label: 'Claude Max',
};

const keyRow = {
  id: 'acc-work-key',
  provider: 'anthropic',
  kind: 'api-key',
  label: 'Work',
  credentialRef: 'cred-7f3a',
};

const aggregatorRow = {
  id: 'acc-router',
  provider: 'openrouter',
  kind: 'aggregator',
  label: 'Router',
  credentialRef: 'cred-91bd',
};

const nonBlank = fc.string({ minLength: 1, maxLength: 12 }).map((value) => `x${value.trim()}`);

function originOf(account: Account): string | undefined {
  return account.kind === 'subscription' ? account.provenance : undefined;
}

describe('a stored version 7 document, written before a row said where its account came from', () => {
  test('every subscription row is stamped as one the app signed in', () => {
    const storedUnderVersionSeven = {
      schemaVersion: 7,
      accounts: [subscriptionRow, keyRow, aggregatorRow],
    };

    expect(loadAccountsDocument(storedUnderVersionSeven)).toEqual({
      schemaVersion: ACCOUNTS_VERSION,
      accounts: [{ ...subscriptionRow, provenance: 'sign-in' }, keyRow, aggregatorRow],
    });
  });

  test('no row is stamped as adopted, because nothing stored today came from the machine', () => {
    const migrated = loadAccountsDocument({ schemaVersion: 7, accounts: [subscriptionRow] });

    expect(migrated.accounts.filter((account) => originOf(account) === 'machine')).toEqual([]);
  });

  test('a row of another kind gains no origin, because only a subscription can be adopted', () => {
    const migrated = loadAccountsDocument({ schemaVersion: 7, accounts: [keyRow, aggregatorRow] });

    for (const account of migrated.accounts) {
      expect(account).not.toHaveProperty('provenance');
    }
  });

  test('an empty registry crosses the version with nothing invented', () => {
    expect(loadAccountsDocument({ schemaVersion: 7, accounts: [] })).toEqual({
      schemaVersion: ACCOUNTS_VERSION,
      accounts: [],
    });
  });
});

describe('every version 7 document a machine could hold', () => {
  const versionSevenRows = fc.oneof(
    fc.record({
      id: nonBlank,
      provider: fc.constantFrom('anthropic', 'openai'),
      kind: fc.constant('subscription'),
      label: nonBlank,
    }),
    fc.record({
      id: nonBlank,
      provider: nonBlank,
      kind: fc.constantFrom('api-key', 'aggregator'),
      label: nonBlank,
      credentialRef: nonBlank,
    }),
  );

  const versionSevenDocuments = fc.record({
    schemaVersion: fc.constant(7),
    accounts: fc.uniqueArray(versionSevenRows, { selector: (row) => row.id, maxLength: 6 }),
  });

  test.prop([versionSevenDocuments])(
    'every subscription row arrives stamped as a sign-in and every other row arrives untouched',
    (storedUnderVersionSeven) => {
      const migrated = loadAccountsDocument(storedUnderVersionSeven);
      const stored = storedUnderVersionSeven.accounts;

      expect(migrated.schemaVersion).toBe(ACCOUNTS_VERSION);
      expect(migrated.accounts.map((account) => account.id)).toEqual(stored.map((row) => row.id));
      expect(migrated.accounts.map(originOf)).toEqual(
        stored.map((row) => (row.kind === 'subscription' ? 'sign-in' : undefined)),
      );
    },
  );
});
