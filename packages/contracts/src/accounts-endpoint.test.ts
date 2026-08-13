import { describe, expect, test } from 'vitest';

import { ACCOUNTS_VERSION, loadAccountsDocument } from './accounts';

const keyRow = {
  id: 'acc-work-key',
  provider: 'anthropic',
  kind: 'api-key',
  label: 'Work',
  credentialRef: 'cred-7f3a',
};

const localRow = {
  id: 'acc-ollama',
  provider: 'ollama',
  kind: 'local',
  address: 'http://127.0.0.1:11434',
};

describe('the endpoint a row carries when recompose knows none for its provider', () => {
  test('a row a person addressed themselves carries where it goes and how it is spelled', () => {
    const ownAddress = {
      ...keyRow,
      provider: 'my-own-server',
      endpoint: { origin: 'https://models.example.com', dialect: 'chat-completions' },
    };
    const stored = { schemaVersion: ACCOUNTS_VERSION, accounts: [ownAddress] };

    expect(loadAccountsDocument(stored).accounts).toEqual([ownAddress]);
  });

  test('a row under a provider recompose already knows carries no endpoint of its own', () => {
    const stored = { schemaVersion: ACCOUNTS_VERSION, accounts: [keyRow] };

    expect(loadAccountsDocument(stored).accounts[0]).not.toHaveProperty('endpoint');
  });

  test('an endpoint naming a dialect the gateway never speaks is refused', () => {
    const unspoken = {
      ...keyRow,
      endpoint: { origin: 'https://models.example.com', dialect: 'grpc' },
    };

    expect(() =>
      loadAccountsDocument({ schemaVersion: ACCOUNTS_VERSION, accounts: [unspoken] }),
    ).toThrow();
  });

  test('an endpoint naming no origin is refused, because the origin is the whole of it', () => {
    const originless = { ...keyRow, endpoint: { dialect: 'chat-completions' } };

    expect(() =>
      loadAccountsDocument({ schemaVersion: ACCOUNTS_VERSION, accounts: [originless] }),
    ).toThrow();
  });

  test('an endpoint whose origin is not an address is refused before anything is spent at it', () => {
    for (const notAnAddress of ['', '   ', 'models.example.com', 'not a url']) {
      const stored = {
        schemaVersion: ACCOUNTS_VERSION,
        accounts: [{ ...keyRow, endpoint: { origin: notAnAddress, dialect: 'anthropic' } }],
      };

      expect(() => loadAccountsDocument(stored)).toThrow();
    }
  });
});

describe('the name a local row carries when recompose never named the server', () => {
  test('a server a person addressed themselves carries the name they gave it', () => {
    const ownServer = {
      id: 'acc-mine',
      provider: 'custom',
      kind: 'local',
      address: 'http://127.0.0.1:9000',
      label: 'Bench box',
    };
    const stored = { schemaVersion: ACCOUNTS_VERSION, accounts: [ownServer] };

    expect(loadAccountsDocument(stored).accounts).toEqual([ownServer]);
  });

  test('a documented runtime carries no name of its own, because the table names it', () => {
    const stored = { schemaVersion: ACCOUNTS_VERSION, accounts: [localRow] };

    expect(loadAccountsDocument(stored).accounts[0]).not.toHaveProperty('label');
  });

  test('every runtime the catalog now connects stands as a stored row', () => {
    for (const provider of ['ollama', 'lmstudio', 'llamacpp', 'vllm']) {
      const stored = {
        schemaVersion: ACCOUNTS_VERSION,
        accounts: [{ ...localRow, id: `acc-${provider}`, provider }],
      };

      expect(loadAccountsDocument(stored).accounts[0]).toMatchObject({ provider });
    }
  });
});
