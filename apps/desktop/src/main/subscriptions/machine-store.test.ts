import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, test } from 'vitest';

import type { MachineReach } from './machine-store';

import { credentialCustody } from './credential-custody';
import { machineStoreFor } from './machine-store';
import { fakeKeychain, machineHolding, osUser } from './subscriptions.testkit';
import { codexVendorItem } from './vendor-item';

let homeFolder = '';

beforeEach(async () => {
  homeFolder = await mkdtemp(join(tmpdir(), 'recompose-machine-home-'));
});

function reaching(over: Partial<Omit<MachineReach, 'homeFolder'>> = {}): MachineReach {
  return { homeFolder, platform: 'darwin', custody: null, keyringHolds: null, ...over };
}

async function fileAt(...parts: readonly string[]): Promise<void> {
  const path = join(homeFolder, ...parts);

  await mkdir(join(path, '..'), { recursive: true });
  await writeFile(path, `held at ${parts.join('/')}`, 'utf8');
}

describe('where each provider keeps what its own tool wrote', () => {
  test('given macOS, Claude Code keeps its credential in the login keychain', async () => {
    const keychain = fakeKeychain(machineHolding('the-persons-login'));
    const store = machineStoreFor(
      'anthropic',
      reaching({ custody: credentialCustody(keychain.seam, osUser) }),
    );

    await expect(store.readBlob()).resolves.toBe('the-persons-login');
  });

  test('given a platform with no keychain, Claude Code keeps it beside its config home', async () => {
    await fileAt('.claude', '.credentials.json');

    const store = machineStoreFor('anthropic', reaching({ platform: 'linux' }));

    await expect(store.readBlob()).resolves.toBe('held at .claude/.credentials.json');
  });

  test('given macOS without custody, Claude Code falls back to the file rather than answering nothing', async () => {
    await fileAt('.claude', '.credentials.json');

    const store = machineStoreFor('anthropic', reaching());

    await expect(store.readBlob()).resolves.toBe('held at .claude/.credentials.json');
  });

  test('given a Codex reach, the reader never opens Claude Code’s keychain item', async () => {
    const keychain = fakeKeychain(machineHolding('the-persons-claude-login'));
    const store = machineStoreFor(
      'openai',
      reaching({ custody: credentialCustody(keychain.seam, osUser) }),
    );

    await expect(store.readBlob()).resolves.toBeNull();
  });
});

describe('where Codex keeps its own record', () => {
  test('given Codex, the record sits in its own configuration directory', async () => {
    await fileAt('.codex', 'auth.json');

    const store = machineStoreFor('openai', reaching());

    await expect(store.readBlob()).resolves.toBe('held at .codex/auth.json');
  });

  test('given nothing written anywhere, the store answers nothing rather than failing', async () => {
    const store = machineStoreFor('openai', reaching({ platform: 'linux' }));

    await expect(store.readBlob()).resolves.toBeNull();
    await expect(store.readIdentity()).resolves.toBeNull();
  });
});

describe('where the address and the plan are read from', () => {
  test('given Claude Code, identity comes from a plain file that asks no permission', async () => {
    await fileAt('.claude.json');

    const store = machineStoreFor('anthropic', reaching());

    await expect(store.readIdentity()).resolves.toBe('held at .claude.json');
  });

  test('given Codex, the identity rides inside the record itself rather than a file beside it', async () => {
    await fileAt('.claude.json');

    const store = machineStoreFor('openai', reaching());

    await expect(store.readIdentity()).resolves.toBeNull();
  });
});

describe('two stores that disagree about the same account', () => {
  const stale = JSON.stringify({ claudeAiOauth: { accessToken: 'a', expiresAt: 1_000 } });
  const fresh = JSON.stringify({ claudeAiOauth: { accessToken: 'b', expiresAt: 9_000 } });

  async function claudeFileHolding(blob: string): Promise<void> {
    await mkdir(join(homeFolder, '.claude'), { recursive: true });
    await writeFile(join(homeFolder, '.claude', '.credentials.json'), blob, 'utf8');
  }

  test('given the keychain fresher than the file, the fresher record wins', async () => {
    await claudeFileHolding(stale);

    const keychain = fakeKeychain(machineHolding(fresh));
    const store = machineStoreFor(
      'anthropic',
      reaching({ custody: credentialCustody(keychain.seam, osUser) }),
    );

    await expect(store.readBlob()).resolves.toBe(fresh);
  });

  test('given the file fresher than the keychain, the fresher record wins', async () => {
    await claudeFileHolding(fresh);

    const keychain = fakeKeychain(machineHolding(stale));
    const store = machineStoreFor(
      'anthropic',
      reaching({ custody: credentialCustody(keychain.seam, osUser) }),
    );

    await expect(store.readBlob()).resolves.toBe(fresh);
  });
});

describe('a Codex record kept in the keyring rather than a file', () => {
  test('given no file, the keyring answers rather than the machine reading as empty', async () => {
    const held = JSON.stringify({ tokens: { access_token: 'opaque' } });
    const codexHome = join(homeFolder, '.codex');
    const entry = codexVendorItem(codexHome);
    const keychain = fakeKeychain({ [`${entry.service} ${entry.account}`]: held });
    const store = machineStoreFor(
      'openai',
      reaching({ keyringHolds: async () => keychain.seam.read(entry) }),
    );

    await expect(store.readBlob()).resolves.toBe(held);
  });

  test('given a file, it answers and the keyring is never opened', async () => {
    await fileAt('.codex', 'auth.json');

    let opened = 0;
    const store = machineStoreFor(
      'openai',
      reaching({
        keyringHolds: async () => {
          opened += 1;

          return Promise.resolve('from the keyring');
        },
      }),
    );

    await expect(store.readBlob()).resolves.toBe('held at .codex/auth.json');
    expect(opened).toBe(0);
  });
});
