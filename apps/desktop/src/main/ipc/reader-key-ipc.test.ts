import type { IpcResponse } from '@recompose/contracts';

import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import { reversibleCodec } from '../storage/safe-storage-codec.testkit';
import { getSecret, loadVaultFile } from '../storage/vault';
import { storageContextOver } from './key-check-ipc.testkit';
import { createStorageIpcHandlers } from './storage-ipc';

const servedKey = 'an-openrouter-serving-key';

const readerKey = 'sk-or-management-91bd';

const anotherReaderKey = 'sk-or-management-4d1a';

const offered = {
  provider: 'openrouter',
  kind: 'aggregator' as const,
  label: 'Router',
  secret: servedKey,
};

type RegistryAnswer = IpcResponse<'accounts:connect'>;

async function tempStorage(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'recompose-reader-key-'));
}

function credentialedRowIn(answer: RegistryAnswer) {
  if (!answer.ok) {
    throw new Error('the registry refused the act');
  }

  const row = answer.value.accounts.at(-1);

  if (row === undefined || (row.kind !== 'api-key' && row.kind !== 'aggregator')) {
    throw new Error('the registry holds no credentialed row');
  }

  return row;
}

async function vaultIn(userDataPath: string) {
  return loadVaultFile(join(userDataPath, 'vault.bin'), () => undefined);
}

function storageOver(userDataPath: string) {
  return createStorageIpcHandlers(storageContextOver(userDataPath));
}

describe('connecting an account that offers a read-only key beside the key it spends', () => {
  test('each key reaches the vault under a reference of its own', async () => {
    const userDataPath = await tempStorage();
    const handlers = storageOver(userDataPath);

    const row = credentialedRowIn(
      await handlers['accounts:connect']({ ...offered, readerSecret: readerKey }),
    );
    const vault = await vaultIn(userDataPath);

    expect(row.readerCredentialRef).toBeDefined();
    expect(row.readerCredentialRef).not.toBe(row.credentialRef);
    expect(getSecret(vault, reversibleCodec, row.credentialRef)).toBe(servedKey);
    expect(getSecret(vault, reversibleCodec, row.readerCredentialRef ?? '')).toBe(readerKey);
  });

  test('neither key rides the answer back, and neither lands as plaintext', async () => {
    const userDataPath = await tempStorage();
    const handlers = storageOver(userDataPath);

    const answer = await handlers['accounts:connect']({ ...offered, readerSecret: readerKey });
    const vault = await vaultIn(userDataPath);

    expect(JSON.stringify(answer)).not.toContain(readerKey);
    expect(JSON.stringify(answer)).not.toContain(servedKey);
    expect(JSON.stringify(vault)).not.toContain(readerKey);
    expect(JSON.stringify(vault)).not.toContain(servedKey);
  });

  test('an account offering no reader key holds one reference and no reader reference', async () => {
    const userDataPath = await tempStorage();
    const handlers = storageOver(userDataPath);

    const row = credentialedRowIn(await handlers['accounts:connect'](offered));

    expect(row).not.toHaveProperty('readerCredentialRef');
    expect(Object.keys((await vaultIn(userDataPath)).entries)).toEqual([row.credentialRef]);
  });
});

describe('holding a read-only key against an account that already exists', () => {
  test('the key lands on a row that was connected without one', async () => {
    const userDataPath = await tempStorage();
    const handlers = storageOver(userDataPath);
    const connected = credentialedRowIn(await handlers['accounts:connect'](offered));

    const row = credentialedRowIn(
      await handlers['accounts:set-reader-key']({ id: connected.id, secret: readerKey }),
    );
    const vault = await vaultIn(userDataPath);

    expect(row.id).toBe(connected.id);
    expect(row.credentialRef).toBe(connected.credentialRef);
    expect(getSecret(vault, reversibleCodec, row.readerCredentialRef ?? '')).toBe(readerKey);
  });

  test('a replacement leaves nothing of the key it replaced behind in the vault', async () => {
    const userDataPath = await tempStorage();
    const handlers = storageOver(userDataPath);
    const connected = credentialedRowIn(await handlers['accounts:connect'](offered));

    const first = credentialedRowIn(
      await handlers['accounts:set-reader-key']({ id: connected.id, secret: readerKey }),
    );
    const second = credentialedRowIn(
      await handlers['accounts:set-reader-key']({ id: connected.id, secret: anotherReaderKey }),
    );
    const vault = await vaultIn(userDataPath);

    expect(getSecret(vault, reversibleCodec, second.readerCredentialRef ?? '')).toBe(
      anotherReaderKey,
    );
    expect(JSON.stringify(vault)).not.toContain(readerKey);
    expect(Object.keys(vault.entries)).toHaveLength(2);
    expect(first.readerCredentialRef).toBeDefined();
  });

  test('an id nobody holds is refused rather than quietly doing nothing', async () => {
    const handlers = storageOver(await tempStorage());

    const answer = await handlers['accounts:set-reader-key']({
      id: 'acc-nobody',
      secret: readerKey,
    });

    expect(answer).toMatchObject({ ok: false });
  });
});

describe('clearing the read-only key a row held', () => {
  test('the reference leaves the row and the secret leaves the vault', async () => {
    const userDataPath = await tempStorage();
    const handlers = storageOver(userDataPath);
    const connected = credentialedRowIn(
      await handlers['accounts:connect']({ ...offered, readerSecret: readerKey }),
    );

    const row = credentialedRowIn(
      await handlers['accounts:clear-reader-key']({ id: connected.id }),
    );
    const vault = await vaultIn(userDataPath);

    expect(row).not.toHaveProperty('readerCredentialRef');
    expect(JSON.stringify(vault)).not.toContain(readerKey);
    expect(Object.keys(vault.entries)).toEqual([connected.credentialRef]);
  });

  test('the key the account serves requests with is untouched', async () => {
    const userDataPath = await tempStorage();
    const handlers = storageOver(userDataPath);
    const connected = credentialedRowIn(
      await handlers['accounts:connect']({ ...offered, readerSecret: readerKey }),
    );

    await handlers['accounts:clear-reader-key']({ id: connected.id });

    expect(getSecret(await vaultIn(userDataPath), reversibleCodec, connected.credentialRef)).toBe(
      servedKey,
    );
  });

  test('clearing a row that held none leaves the registry as it stood', async () => {
    const userDataPath = await tempStorage();
    const handlers = storageOver(userDataPath);
    const connected = credentialedRowIn(await handlers['accounts:connect'](offered));

    const row = credentialedRowIn(
      await handlers['accounts:clear-reader-key']({ id: connected.id }),
    );

    expect(row).toEqual(connected);
  });
});

describe('removing an account that held a read-only key beside the one it spent', () => {
  test('both secrets leave the vault, so nothing outlives the row that reached them', async () => {
    const userDataPath = await tempStorage();
    const handlers = storageOver(userDataPath);
    const connected = credentialedRowIn(
      await handlers['accounts:connect']({ ...offered, readerSecret: readerKey }),
    );

    await handlers['accounts:remove']({ id: connected.id });

    expect(Object.keys((await vaultIn(userDataPath)).entries)).toEqual([]);
  });
});
