import { describe, expect, test } from 'vitest';

import { ACCOUNTS_VERSION, loadAccountsDocument } from './accounts';

const aggregatorRow = {
  id: 'acc-router',
  provider: 'openrouter',
  kind: 'aggregator',
  label: 'Router',
  credentialRef: 'cred-91bd',
};

const subscriptionRow = {
  id: 'acc-claude-max',
  provider: 'anthropic',
  kind: 'subscription',
  label: 'Claude Max',
  provenance: 'sign-in',
};

const localRow = {
  id: 'acc-ollama',
  provider: 'ollama',
  kind: 'local',
  address: 'http://127.0.0.1:11434',
};

describe('the read-only credential a credentialed row may hold beside the one it spends', () => {
  test('a row carrying a reader reference parses beside the reference it serves requests with', () => {
    const stored = {
      schemaVersion: ACCOUNTS_VERSION,
      accounts: [{ ...aggregatorRow, readerCredentialRef: 'read-4c1e' }],
    };

    expect(loadAccountsDocument(stored)).toEqual(stored);
  });

  test('a row holding no reader reference parses, because an account works without one', () => {
    const stored = { schemaVersion: ACCOUNTS_VERSION, accounts: [aggregatorRow] };

    expect(loadAccountsDocument(stored)).toEqual(stored);
  });

  test('a reader reference never stands in for the reference a request is served with', () => {
    const { credentialRef, ...withoutTheReference } = aggregatorRow;
    const stored = {
      schemaVersion: ACCOUNTS_VERSION,
      accounts: [{ ...withoutTheReference, readerCredentialRef: 'read-4c1e' }],
    };

    expect(credentialRef).toBe('cred-91bd');
    expect(() => loadAccountsDocument(stored)).toThrow();
  });
});

describe('what the registry refuses to hold a reader reference on', () => {
  test('a whitespace-only reader reference is refused, because a blank answers to nothing', () => {
    for (const blank of ['', '   ']) {
      const stored = {
        schemaVersion: ACCOUNTS_VERSION,
        accounts: [{ ...aggregatorRow, readerCredentialRef: blank }],
      };

      expect(() => loadAccountsDocument(stored)).toThrow();
    }
  });

  test('a subscription row holds no reader reference, because no pasted key stands behind it', () => {
    const stored = {
      schemaVersion: ACCOUNTS_VERSION,
      accounts: [{ ...subscriptionRow, readerCredentialRef: 'read-4c1e' }],
    };

    expect(() => loadAccountsDocument(stored)).toThrow();
  });

  test('a local row holds no reader reference, because nothing exists to reference', () => {
    const stored = {
      schemaVersion: ACCOUNTS_VERSION,
      accounts: [{ ...localRow, readerCredentialRef: 'read-4c1e' }],
    };

    expect(() => loadAccountsDocument(stored)).toThrow();
  });

  test('a reader reference is never a place a raw secret can ride', () => {
    for (const smuggled of [{ readerSecret: 'sk-oops' }, { readerKey: 'sk-oops' }]) {
      const stored = {
        schemaVersion: ACCOUNTS_VERSION,
        accounts: [{ ...aggregatorRow, ...smuggled }],
      };

      expect(() => loadAccountsDocument(stored)).toThrow();
    }
  });
});
