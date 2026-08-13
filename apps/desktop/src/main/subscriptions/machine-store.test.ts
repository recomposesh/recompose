import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, test } from 'vitest';

import { credentialCustody } from './credential-custody';
import { machineStoreFor } from './machine-store';
import { fakeKeychain, machineHolding, osUser } from './subscriptions.testkit';

let homeFolder = '';

beforeEach(async () => {
  homeFolder = await mkdtemp(join(tmpdir(), 'recompose-machine-home-'));
});

async function fileAt(...parts: readonly string[]): Promise<void> {
  const path = join(homeFolder, ...parts);

  await mkdir(join(path, '..'), { recursive: true });
  await writeFile(path, `held at ${parts.join('/')}`, 'utf8');
}

describe('where each provider keeps what its own tool wrote', () => {
  test('given macOS, Claude Code keeps its credential in the login keychain', async () => {
    const keychain = fakeKeychain(machineHolding('the-persons-login'));
    const store = machineStoreFor({
      provider: 'anthropic',
      homeFolder,
      platform: 'darwin',
      custody: credentialCustody(keychain.seam, osUser),
    });

    await expect(store.readBlob()).resolves.toBe('the-persons-login');
  });

  test('given a platform with no keychain, Claude Code keeps it beside its config home', async () => {
    await fileAt('.claude', '.credentials.json');

    const store = machineStoreFor({
      provider: 'anthropic',
      homeFolder,
      platform: 'linux',
      custody: null,
    });

    await expect(store.readBlob()).resolves.toBe('held at .claude/.credentials.json');
  });

  test('given macOS without custody, Claude Code falls back to the file rather than answering nothing', async () => {
    await fileAt('.claude', '.credentials.json');

    const store = machineStoreFor({
      provider: 'anthropic',
      homeFolder,
      platform: 'darwin',
      custody: null,
    });

    await expect(store.readBlob()).resolves.toBe('held at .claude/.credentials.json');
  });
});

describe('where Codex keeps its own record', () => {
  test('given Codex, the record sits in its own configuration directory', async () => {
    await fileAt('.codex', 'auth.json');

    const store = machineStoreFor({
      provider: 'openai',
      homeFolder,
      platform: 'darwin',
      custody: null,
    });

    await expect(store.readBlob()).resolves.toBe('held at .codex/auth.json');
  });

  test('given nothing written anywhere, the store answers nothing rather than failing', async () => {
    const store = machineStoreFor({
      provider: 'openai',
      homeFolder,
      platform: 'linux',
      custody: null,
    });

    await expect(store.readBlob()).resolves.toBeNull();
    await expect(store.readIdentity()).resolves.toBeNull();
  });
});

describe('where the address and the plan are read from', () => {
  test('given Claude Code, identity comes from a plain file that asks no permission', async () => {
    await fileAt('.claude.json');

    const store = machineStoreFor({
      provider: 'anthropic',
      homeFolder,
      platform: 'darwin',
      custody: null,
    });

    await expect(store.readIdentity()).resolves.toBe('held at .claude.json');
  });

  test('given Codex, the identity rides inside the record itself rather than a file beside it', async () => {
    await fileAt('.claude.json');

    const store = machineStoreFor({
      provider: 'openai',
      homeFolder,
      platform: 'darwin',
      custody: null,
    });

    await expect(store.readIdentity()).resolves.toBeNull();
  });
});

describe('two stores that disagree about the same account', () => {
  test('given the keychain fresher than the file, the fresher record wins', async () => {
    const stale = JSON.stringify({ claudeAiOauth: { accessToken: 'a', expiresAt: 1_000 } });
    const fresh = JSON.stringify({ claudeAiOauth: { accessToken: 'b', expiresAt: 9_000 } });

    await mkdir(join(homeFolder, '.claude'), { recursive: true });
    await writeFile(join(homeFolder, '.claude', '.credentials.json'), stale, 'utf8');

    const keychain = fakeKeychain(machineHolding(fresh));
    const store = machineStoreFor({
      provider: 'anthropic',
      homeFolder,
      platform: 'darwin',
      custody: credentialCustody(keychain.seam, osUser),
    });

    await expect(store.readBlob()).resolves.toBe(fresh);
  });

  test('given the file fresher than the keychain, the fresher record wins', async () => {
    const stale = JSON.stringify({ claudeAiOauth: { accessToken: 'a', expiresAt: 1_000 } });
    const fresh = JSON.stringify({ claudeAiOauth: { accessToken: 'b', expiresAt: 9_000 } });

    await mkdir(join(homeFolder, '.claude'), { recursive: true });
    await writeFile(join(homeFolder, '.claude', '.credentials.json'), fresh, 'utf8');

    const keychain = fakeKeychain(machineHolding(stale));
    const store = machineStoreFor({
      provider: 'anthropic',
      homeFolder,
      platform: 'darwin',
      custody: credentialCustody(keychain.seam, osUser),
    });

    await expect(store.readBlob()).resolves.toBe(fresh);
  });
});

describe('a Codex record kept in the keyring rather than a file', () => {
  test('given no file, the keyring answers rather than the machine reading as empty', async () => {
    const held = JSON.stringify({ tokens: { access_token: 'opaque' } });
    const keychain = fakeKeychain({ [`Codex Auth ${osUser}`]: held });
    const store = machineStoreFor({
      provider: 'openai',
      homeFolder,
      platform: 'darwin',
      custody: null,
      keychain: keychain.seam,
      osUser,
    });

    await expect(store.readBlob()).resolves.toBe(held);
  });

  test('given a file, it answers and the keyring is never opened', async () => {
    await fileAt('.codex', 'auth.json');

    const keychain = fakeKeychain({ [`Codex Auth ${osUser}`]: 'from the keyring' });
    const store = machineStoreFor({
      provider: 'openai',
      homeFolder,
      platform: 'darwin',
      custody: null,
      keychain: keychain.seam,
      osUser,
    });

    await expect(store.readBlob()).resolves.toBe('held at .codex/auth.json');
  });
});
