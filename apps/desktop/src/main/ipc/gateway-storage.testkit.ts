import {
  ACCOUNTS_VERSION,
  GATEWAY_CONFIG_VERSION,
  type AccountsDocument,
  type EngineGateway,
  type GatewayConfig,
  type VirtualModel,
} from '@recompose/contracts';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { SecretCodec } from '../storage/safe-storage-codec';
import type { StorageIpcContext } from './storage-context';

import { createStorageIpcHandlers } from './storage-ipc';

const fakeCodec: SecretCodec = {
  encrypt: (plain) => Buffer.from(plain, 'utf8').toString('base64'),
  decrypt: (encrypted) => Buffer.from(encrypted, 'base64').toString('utf8'),
  isPlaintextFallback: false,
};

const registry: AccountsDocument = {
  schemaVersion: ACCOUNTS_VERSION,
  accounts: [
    { id: 'acc-key', provider: 'anthropic', kind: 'api-key', label: 'work', credentialRef: 'c1' },
    {
      id: 'acc-plan',
      provider: 'anthropic',
      kind: 'subscription',
      provenance: 'sign-in',
      label: 'Max',
    },
  ],
};

export function gatewayServing(models: readonly VirtualModel[], port = 8397): GatewayConfig {
  return {
    schemaVersion: GATEWAY_CONFIG_VERSION,
    slug: 'codex',
    displayName: 'Codex',
    port,
    virtualModels: [...models],
    layout: { nodes: {} },
  };
}

export type Desk = {
  restarted: EngineGateway[];
  userDataPath: string;
  handlers: ReturnType<typeof createStorageIpcHandlers>;
};

export async function deskHolding(stored: readonly GatewayConfig[]): Promise<Desk> {
  const started: EngineGateway[] = [];
  const restarted: EngineGateway[] = [];
  const userDataPath = await mkdtemp(join(tmpdir(), 'recompose-update-'));
  const context: StorageIpcContext = {
    userDataPath,
    homeFolder: '/Users/ada',
    getCodec: () => fakeCodec,
    isEncryptionAvailable: () => true,
    onCorrupt: () => undefined,
    onSettingsWritten: () => undefined,
    applySettings: () => undefined,
    readLoginItem: () => false,
    startGateway: (gateway) => {
      started.push(gateway);
    },
    restartGateway: (gateway) => {
      restarted.push(gateway);
    },
    stopGateway: () => undefined,
    isServing: () => true,
    releaseSubscription: async () => Promise.resolve({ ok: true }),
  };

  await writeFile(join(userDataPath, 'accounts.json'), JSON.stringify(registry), 'utf8');

  const handlers = createStorageIpcHandlers(context);

  await Promise.all(stored.map(async (gateway) => handlers['gateways:save'](gateway)));

  started.length = 0;

  return { restarted, userDataPath, handlers };
}

export async function storedBytes(userDataPath: string, slug: string): Promise<string> {
  return readFile(join(userDataPath, 'gateways', `${slug}.json`), 'utf8');
}
