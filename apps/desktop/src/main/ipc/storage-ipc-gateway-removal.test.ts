import {
  ACCOUNTS_VERSION,
  GATEWAY_CONFIG_VERSION,
  type AccountsDocument,
  type GatewayConfig,
} from '@recompose/contracts';
import { access, mkdtemp, writeFile } from 'node:fs/promises';
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
  const stoppedSlugs: string[] = [];
  const userDataPath = await mkdtemp(join(tmpdir(), 'recompose-removal-'));
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
    restartGateway: () => undefined,
    stopGateway: (slug) => {
      stoppedSlugs.push(slug);
    },
    isServing: (slug) => serving.includes(slug),
    releaseSubscription: async () => Promise.resolve({ ok: true }),
  };

  await writeFile(join(userDataPath, 'accounts.json'), JSON.stringify(registry), 'utf8');

  const handlers = createStorageIpcHandlers(context);

  for (const gateway of stored) {
    await handlers['gateways:save'](gateway);
  }

  return { handlers, stoppedSlugs, userDataPath };
}

async function documentStands(userDataPath: string, slug: string): Promise<boolean> {
  try {
    await access(join(userDataPath, 'gateways', `${slug}.json`));

    return true;
  } catch {
    return false;
  }
}

describe('removing a stored gateway', () => {
  test('the removed gateway leaves the disk and the answer carries the remaining list', async () => {
    const { handlers, userDataPath } = await deskHolding(
      [gatewayNamed('codex', 8397), gatewayNamed('relay', 8398)],
      [],
    );

    const answer = await handlers['gateways:remove']({ slug: 'codex' });

    expect(answer.ok).toBe(true);
    expect(answer.ok && answer.value.map((gateway) => gateway.slug)).toEqual(['relay']);
    expect(await documentStands(userDataPath, 'codex')).toBe(false);
    expect(await documentStands(userDataPath, 'relay')).toBe(true);
  });

  test('a serving gateway stops before its document leaves', async () => {
    const { handlers, stoppedSlugs } = await deskHolding([gatewayNamed('codex', 8397)], ['codex']);

    await handlers['gateways:remove']({ slug: 'codex' });

    expect(stoppedSlugs).toEqual(['codex']);
  });

  test('a stopped gateway is never asked to stop again', async () => {
    const { handlers, stoppedSlugs } = await deskHolding([gatewayNamed('codex', 8397)], []);

    await handlers['gateways:remove']({ slug: 'codex' });

    expect(stoppedSlugs).toEqual([]);
  });

  test('removing the last gateway answers an empty list', async () => {
    const { handlers } = await deskHolding([gatewayNamed('codex', 8397)], []);

    const answer = await handlers['gateways:remove']({ slug: 'codex' });

    expect(answer.ok && answer.value).toEqual([]);
  });

  test('a slug nothing is stored under refuses with the removal spelled out', async () => {
    const { handlers } = await deskHolding([gatewayNamed('codex', 8397)], []);

    const answer = await handlers['gateways:remove']({ slug: 'ghost' });

    expect(answer.ok).toBe(false);
    expect(!answer.ok && answer.error.message).toContain('"ghost"');
    expect(!answer.ok && answer.error.message).toContain('nothing to remove');
  });
});
