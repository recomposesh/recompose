import { describe, expect, test } from 'vitest';

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

const localRow = {
  id: 'acc-ollama',
  provider: 'ollama',
  kind: 'local',
  address: 'http://127.0.0.1:11434',
};

describe('where a subscription account came from', () => {
  test('a row the app signed in reports the sign-in it came from', () => {
    const stored = {
      schemaVersion: ACCOUNTS_VERSION,
      accounts: [{ ...subscriptionRow, provenance: 'sign-in' }],
    };

    expect(loadAccountsDocument(stored)).toEqual(stored);
  });

  test('a row the app adopted reports the machine it came from', () => {
    const stored = {
      schemaVersion: ACCOUNTS_VERSION,
      accounts: [{ ...subscriptionRow, provenance: 'machine' }],
    };

    expect(loadAccountsDocument(stored)).toEqual(stored);
  });

  test('a row saying nothing about where it came from is refused, because the remedy follows it', () => {
    const { provenance, ...withoutTheOrigin } = subscriptionRow;
    const stored = { schemaVersion: ACCOUNTS_VERSION, accounts: [withoutTheOrigin] };

    expect(provenance).toBe('sign-in');
    expect(() => loadAccountsDocument(stored)).toThrow();
  });

  test('an origin outside the pair is refused', () => {
    for (const provenance of ['keychain', 'imported', '']) {
      const stored = {
        schemaVersion: ACCOUNTS_VERSION,
        accounts: [{ ...subscriptionRow, provenance }],
      };

      expect(() => loadAccountsDocument(stored)).toThrow();
    }
  });

  test('no other kind of row reports an origin, because only a subscription can be adopted', () => {
    for (const row of [keyRow, aggregatorRow, localRow]) {
      const stored = {
        schemaVersion: ACCOUNTS_VERSION,
        accounts: [{ ...row, provenance: 'machine' }],
      };

      expect(() => loadAccountsDocument(stored)).toThrow();
    }
  });
});
