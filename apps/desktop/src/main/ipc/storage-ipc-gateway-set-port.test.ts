import {
  ACCOUNTS_VERSION,
  GATEWAY_CONFIG_VERSION,
  type AccountsDocument,
  type EngineGateway,
  type GatewayConfig,
} from '@recompose/contracts';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import type { StorageIpcContext } from './storage-context';

import { reversibleCodec } from '../storage/safe-storage-codec.testkit';
import { createStorageIpcHandlers } from './storage-ipc';

const registry: AccountsDocument = {
  schemaVersion: ACCOUNTS_VERSION,
  accounts: [
    { id: 'acc-key', provider: 'anthropic', kind: 'api-key', label: 'work', credentialRef: 'c1' },
  ],
};

function gatewayNamed(slug: string, port: number): GatewayConfig {
  return {
    schemaVersion: GATEWAY_CONFIG_VERSION,
    slug,
    displayName: slug,
    port,
    virtualModels: [],
    layout: { nodes: {} },
  };
}

async function deskHolding(stored: readonly GatewayConfig[], serving: readonly string[]) {
  const restarted: EngineGateway[] = [];
  const userDataPath = await mkdtemp(join(tmpdir(), 'recompose-set-port-'));
  const context: StorageIpcContext = {
    userDataPath,
    homeFolder: '/Users/ada',
    getCodec: () => reversibleCodec,
    isEncryptionAvailable: () => true,
    onCorrupt: () => undefined,
    onSettingsWritten: () => undefined,
    applySettings: () => undefined,
    readLoginItem: () => false,
    startGateway: () => undefined,
    restartGateway: (gateway) => {
      restarted.push(gateway);
    },
    stopGateway: () => undefined,
    isServing: (slug) => serving.includes(slug),
    releaseSubscription: async () => Promise.resolve({ ok: true }),
  };

  await writeFile(join(userDataPath, 'accounts.json'), JSON.stringify(registry), 'utf8');

  const handlers = createStorageIpcHandlers(context);

  for (const gateway of stored) {
    await handlers['gateways:save'](gateway);
  }

  return { handlers, restarted };
}

describe('moving a stored gateway onto a chosen port', () => {
  test('the chosen port lands in the stored document', async () => {
    const { handlers } = await deskHolding([gatewayNamed('codex', 8397)], []);

    const answer = await handlers['gateways:set-port']({ slug: 'codex', port: 8500 });

    expect(answer.ok && answer.value.map((gateway) => gateway.port)).toEqual([8500]);
  });

  test('a serving gateway restarts on the chosen port', async () => {
    const { handlers, restarted } = await deskHolding([gatewayNamed('codex', 8397)], ['codex']);

    await handlers['gateways:set-port']({ slug: 'codex', port: 8500 });

    expect(restarted.map((gateway) => gateway.port)).toEqual([8500]);
  });

  test('a stopped gateway keeps resting, holding the new port for its next start', async () => {
    const { handlers, restarted } = await deskHolding([gatewayNamed('codex', 8397)], []);

    await handlers['gateways:set-port']({ slug: 'codex', port: 8500 });

    expect(restarted).toEqual([]);
  });

  test('the port it already holds asks for no write and no restart', async () => {
    const { handlers, restarted } = await deskHolding([gatewayNamed('codex', 8397)], ['codex']);

    const answer = await handlers['gateways:set-port']({ slug: 'codex', port: 8397 });

    expect(answer.ok && answer.value.map((gateway) => gateway.port)).toEqual([8397]);
    expect(restarted).toEqual([]);
  });

  test('a port another gateway holds refuses with its holder named', async () => {
    const { handlers } = await deskHolding(
      [gatewayNamed('codex', 8397), gatewayNamed('relay', 8398)],
      [],
    );

    const answer = await handlers['gateways:set-port']({ slug: 'codex', port: 8398 });

    expect(answer.ok).toBe(false);
    expect(!answer.ok && answer.error.code).toBe('port-conflict');
    expect(!answer.ok && answer.error.message).toContain('relay');
  });

  test('a slug nothing is stored under refuses with the move spelled out', async () => {
    const { handlers } = await deskHolding([gatewayNamed('codex', 8397)], []);

    const answer = await handlers['gateways:set-port']({ slug: 'ghost', port: 8500 });

    expect(answer.ok).toBe(false);
    expect(!answer.ok && answer.error.message).toContain('no port to move');
  });
});

async function deskOverANotFolder() {
  const blockingDir = await mkdtemp(join(tmpdir(), 'recompose-set-port-blocked-'));
  const notAFolder = join(blockingDir, 'not-a-folder');

  await writeFile(notAFolder, '', 'utf8');

  return createStorageIpcHandlers({
    userDataPath: notAFolder,
    homeFolder: '/Users/ada',
    getCodec: () => reversibleCodec,
    isEncryptionAvailable: () => true,
    onCorrupt: () => undefined,
    onSettingsWritten: () => undefined,
    applySettings: () => undefined,
    readLoginItem: () => false,
    startGateway: () => undefined,
    restartGateway: () => undefined,
    stopGateway: () => undefined,
    isServing: () => false,
    releaseSubscription: async () => Promise.resolve({ ok: true }),
  });
}

describe('moving a port when the storage folder cannot be read', () => {
  test('the move answers a typed storage failure rather than throwing', async () => {
    const broken = await deskOverANotFolder();

    expect(await broken['gateways:set-port']({ slug: 'codex', port: 8500 })).toMatchObject({
      ok: false,
      error: { code: 'storage-failed' },
    });
  });
});
