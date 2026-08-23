import { fc, test } from '@fast-check/vitest';
import { describe, expect } from 'vitest';

import { ACCOUNTS_VERSION, loadAccountsDocument } from './accounts';

const subscriptionRow = {
  id: 'acc-claude-max',
  provider: 'anthropic',
  kind: 'subscription',
  label: 'Claude Max',
  provenance: 'sign-in',
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

describe('a stored version 9 document, written before a row could hold a read-only credential', () => {
  test('every row crosses the version untouched, because nobody held one', () => {
    const storedUnderVersionNine = {
      schemaVersion: 9,
      accounts: [subscriptionRow, keyRow, aggregatorRow],
    };

    expect(loadAccountsDocument(storedUnderVersionNine)).toEqual({
      schemaVersion: ACCOUNTS_VERSION,
      accounts: [subscriptionRow, keyRow, aggregatorRow],
    });
  });

  test('no row arrives holding a reader reference the migration invented', () => {
    const migrated = loadAccountsDocument({ schemaVersion: 9, accounts: [keyRow, aggregatorRow] });

    for (const account of migrated.accounts) {
      expect(account).not.toHaveProperty('readerCredentialRef');
    }
  });

  test('an empty registry crosses the version with nothing invented', () => {
    expect(loadAccountsDocument({ schemaVersion: 9, accounts: [] })).toEqual({
      schemaVersion: ACCOUNTS_VERSION,
      accounts: [],
    });
  });
});

describe('every version 9 document a machine could hold', () => {
  const versionNineRows = fc.oneof(
    fc.record({
      id: nonBlank,
      provider: fc.constantFrom('anthropic', 'openai'),
      kind: fc.constant('subscription'),
      label: nonBlank,
      provenance: fc.constantFrom('sign-in', 'machine'),
    }),
    fc.record({
      id: nonBlank,
      provider: nonBlank,
      kind: fc.constantFrom('api-key', 'aggregator'),
      label: nonBlank,
      credentialRef: nonBlank,
    }),
  );

  const versionNineDocuments = fc.record({
    schemaVersion: fc.constant(9),
    accounts: fc.uniqueArray(versionNineRows, { selector: (row) => row.id, maxLength: 6 }),
  });

  test.prop([versionNineDocuments])(
    'every row arrives in the order it was stored and none of them gains a reader reference',
    (storedUnderVersionNine) => {
      const migrated = loadAccountsDocument(storedUnderVersionNine);
      const stored = storedUnderVersionNine.accounts;

      expect(migrated.schemaVersion).toBe(ACCOUNTS_VERSION);
      expect(migrated.accounts.map((account) => account.id)).toEqual(stored.map((row) => row.id));

      for (const account of migrated.accounts) {
        expect(account).not.toHaveProperty('readerCredentialRef');
      }
    },
  );
});
