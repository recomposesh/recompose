import { describe, expect, test } from 'vitest';

import { KeychainDenied } from './credential-custody';
import { securityKeychain } from './macos-keychain';

const item = { service: 'recompose-parked-credentials', account: 'acc-one' };

const A_SECRET = 'sk-ant-oat01-a-blob-that-must-never-leave-the-keychain';

const NOT_FOUND = 44;
const AUTHORIZATION_DENIED = 51;
const USER_CANCELED = 128;

function failingWith(code: number) {
  return async () => {
    const failure: Error & { code?: number } = new Error('the tool refused');

    failure.code = code;

    return Promise.reject(failure);
  };
}

function answering(said: string) {
  const asked: { args: readonly string[] }[] = [];

  return {
    asked,
    run: async (_command: string, args: readonly string[]) => {
      asked.push({ args });

      return Promise.resolve(said);
    },
  };
}

async function refusalFrom(work: Promise<unknown>): Promise<Error> {
  try {
    await work;
  } catch (cause) {
    return cause instanceof Error ? cause : new Error(String(cause));
  }

  throw new Error('the seam answered where the tool was meant to fail');
}

describe('reading a credential the keychain holds', () => {
  test('the blob comes back without the newline the tool prints after it', async () => {
    const runner = answering(`${A_SECRET}\n`);

    await expect(securityKeychain('/usr/bin/security', runner.run).read(item)).resolves.toBe(
      A_SECRET,
    );
  });

  test('a blob holding its own newlines keeps every one but the last', async () => {
    const runner = answering('first\nsecond\n');

    await expect(securityKeychain('/usr/bin/security', runner.run).read(item)).resolves.toBe(
      'first\nsecond',
    );
  });

  test('the read names the item it asks for', async () => {
    const runner = answering('');

    await securityKeychain('/usr/bin/security', runner.run).read(item);

    expect(runner.asked[0]?.args).toEqual([
      'find-generic-password',
      '-s',
      item.service,
      '-a',
      item.account,
      '-w',
    ]);
  });

  test('an item the keychain never held reads as nothing rather than a refusal', async () => {
    const keychain = securityKeychain('/usr/bin/security', failingWith(NOT_FOUND));

    await expect(keychain.read(item)).resolves.toBeNull();
  });

  test('a denied prompt reads as a denial rather than a plain failure', async () => {
    const keychain = securityKeychain('/usr/bin/security', failingWith(USER_CANCELED));

    expect(await refusalFrom(keychain.read(item))).toBeInstanceOf(KeychainDenied);
  });

  test('a refused authorization reads as a denial too', async () => {
    const keychain = securityKeychain('/usr/bin/security', failingWith(AUTHORIZATION_DENIED));

    expect(await refusalFrom(keychain.read(item))).toBeInstanceOf(KeychainDenied);
  });

  test('any other failure names the read that drew it', async () => {
    const keychain = securityKeychain('/usr/bin/security', failingWith(9));

    expect((await refusalFrom(keychain.read(item))).message).toContain('find-generic-password');
  });

  test('the refusal carries the exit the tool answered with', async () => {
    const keychain = securityKeychain('/usr/bin/security', failingWith(9));

    expect((await refusalFrom(keychain.read(item))).message).toContain('9');
  });
});

describe('removing a credential the keychain holds', () => {
  test('the removal names the item it takes away', async () => {
    const runner = answering('');

    await securityKeychain('/usr/bin/security', runner.run).remove(item);

    expect(runner.asked[0]?.args).toEqual([
      'delete-generic-password',
      '-s',
      item.service,
      '-a',
      item.account,
    ]);
  });

  test('removing what the keychain never held is not a failure', async () => {
    const keychain = securityKeychain('/usr/bin/security', failingWith(NOT_FOUND));

    await expect(keychain.remove(item)).resolves.toBeUndefined();
  });

  test('a denied removal reads as a denial', async () => {
    const keychain = securityKeychain('/usr/bin/security', failingWith(USER_CANCELED));

    expect(await refusalFrom(keychain.remove(item))).toBeInstanceOf(KeychainDenied);
  });

  test('any other failed removal names itself', async () => {
    const keychain = securityKeychain('/usr/bin/security', failingWith(9));

    expect((await refusalFrom(keychain.remove(item))).message).toContain('delete-generic-password');
  });
});

describe('what a refusal never says', () => {
  test('a failed write names the operation without repeating the blob', async () => {
    const keychain = securityKeychain('/usr/bin/security', failingWith(9));

    const refusal = await refusalFrom(keychain.write(item, A_SECRET));

    expect(refusal.message).toContain('add-generic-password');
    expect(refusal.message).not.toContain(A_SECRET);
  });

  test('a denied write reads as a denial and still hides the blob', async () => {
    const keychain = securityKeychain('/usr/bin/security', failingWith(USER_CANCELED));

    const refusal = await refusalFrom(keychain.write(item, A_SECRET));

    expect(refusal).toBeInstanceOf(KeychainDenied);
    expect(refusal.message).not.toContain(A_SECRET);
  });

  test('a denial names the operation the person turned down', async () => {
    const keychain = securityKeychain('/usr/bin/security', failingWith(USER_CANCELED));

    expect((await refusalFrom(keychain.read(item))).message).toContain('find-generic-password');
  });

  test('a failure carrying no exit at all still names the operation', async () => {
    const keychain = securityKeychain('/usr/bin/security', async () =>
      Promise.reject(new Error('no code at all')),
    );

    expect((await refusalFrom(keychain.read(item))).message).toContain('unknown');
  });
});
