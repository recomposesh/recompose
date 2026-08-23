import { describe, expect, test } from 'vitest';

import { ACCOUNTS_VERSION } from './accounts';
import { ipcChannels } from './ipc';

const connect = ipcChannels['accounts:connect'].request;

const offered = {
  provider: 'openrouter',
  kind: 'aggregator',
  label: 'Router',
  secret: 'sk-or-abc',
};

const hold = ipcChannels['accounts:set-reader-key'].request;

const drop = ipcChannels['accounts:clear-reader-key'].request;

describe('the read-only key a connect may carry beside the key it stores', () => {
  test('a connect carrying no reader key parses, because an account works without one', () => {
    expect(connect.parse(offered)).toEqual(offered);
  });

  test('a connect carrying a reader key parses beside the key the account spends', () => {
    const withReader = { ...offered, readerSecret: 'sk-or-reader' };

    expect(connect.parse(withReader)).toEqual(withReader);
  });

  test('a reader key pasted with surrounding whitespace reaches the vault as its trim', () => {
    expect(connect.parse({ ...offered, readerSecret: '  sk-or-reader\n' })).toEqual({
      ...offered,
      readerSecret: 'sk-or-reader',
    });
  });

  test('a blank reader key is refused, because an empty field means none was offered', () => {
    expect(connect.safeParse({ ...offered, readerSecret: '   ' }).success).toBe(false);
  });

  test('a reader key holding a control character is refused for what it holds', () => {
    const smuggled = `sk-or${String.fromCodePoint(0)}reader`;

    expect(() => connect.parse({ ...offered, readerSecret: smuggled })).toThrow(
      /holds a control character/,
    );
  });
});

describe('accounts:set-reader-key channel', () => {
  test('setting names one stored row and the key it should read balances with', () => {
    expect(hold.safeParse({ id: 'acc-router', secret: 'sk-or-reader' }).success).toBe(true);
    expect(hold.safeParse({ id: '   ', secret: 'sk-or-reader' }).success).toBe(false);
    expect(hold.safeParse({ id: 'acc-router' }).success).toBe(false);
    expect(hold.safeParse({ id: 'acc-router', secret: '  ' }).success).toBe(false);
  });

  test('setting carries no vault reference, because only main mints one', () => {
    const smuggled = { id: 'acc-router', secret: 'sk-or-reader', readerCredentialRef: 'read-1' };

    expect(hold.safeParse(smuggled).success).toBe(false);
  });

  test('the answer is the registry as it now stands, with no secret riding back', () => {
    const registry = {
      schemaVersion: ACCOUNTS_VERSION,
      accounts: [
        {
          id: 'acc-router',
          provider: 'openrouter',
          kind: 'aggregator',
          label: 'Router',
          credentialRef: 'c1',
          readerCredentialRef: 'read-1',
        },
      ],
    };
    const answered = ipcChannels['accounts:set-reader-key'].response;

    expect(() => answered.parse({ ok: true, value: registry })).not.toThrow();
    expect(() =>
      answered.parse({
        ok: true,
        value: {
          ...registry,
          accounts: [{ ...registry.accounts[0], readerSecret: 'sk-or-reader' }],
        },
      }),
    ).toThrow();
  });
});

describe('accounts:clear-reader-key channel', () => {
  test('clearing names one stored row and carries no key at all', () => {
    expect(drop.safeParse({ id: 'acc-router' }).success).toBe(true);
    expect(drop.safeParse({ id: '   ' }).success).toBe(false);
    expect(drop.safeParse({ id: 'acc-router', secret: 'sk-or-reader' }).success).toBe(false);
  });

  test('clearing answers the registry, so a caller never has to ask for it again', () => {
    const registry = { schemaVersion: ACCOUNTS_VERSION, accounts: [] };

    expect(
      ipcChannels['accounts:clear-reader-key'].response.parse({ ok: true, value: registry }),
    ).toEqual({ ok: true, value: registry });
  });
});
