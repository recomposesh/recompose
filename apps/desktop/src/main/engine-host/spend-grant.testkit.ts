import type {
  Account,
  CredentialedAccount,
  EngineTargetStanding,
  EngineVirtualModel,
  GatewayConfig,
  LocalAccount,
  ProviderModelPolicies,
  RouteNode,
  RouterPolicy,
  SubscriptionAccount,
  VirtualModel,
} from '@recompose/contracts';

import { ACCOUNTS_VERSION, defaultSettings, GATEWAY_CONFIG_VERSION } from '@recompose/contracts';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { SpendGrantContext } from './spend-grant';

import { reversibleCodec } from '../storage/safe-storage-codec.testkit';
import { saveVaultFile, setSecret, type VaultDocument } from '../storage/vault';
import { subscriptionCredentialStore } from '../subscriptions/subscription-credential-store';

const fakeCodec = reversibleCodec;

export const secret = 'sk-ant-api03-long-secret-7f2c';

export const keyRow: CredentialedAccount = {
  id: 'acc-key',
  provider: 'anthropic',
  kind: 'api-key',
  label: 'build',
  credentialRef: 'cred-key',
};

export const aggregatorRow: CredentialedAccount = {
  id: 'acc-many',
  provider: 'openrouter',
  kind: 'aggregator',
  label: 'shared',
  credentialRef: 'cred-many',
};

export const localRow: LocalAccount = {
  id: 'acc-here',
  provider: 'ollama',
  kind: 'local',
  address: 'http://127.0.0.1:11434',
};

export const planRow: SubscriptionAccount = {
  id: 'acc-plan',
  provider: 'anthropic',
  kind: 'subscription',
  provenance: 'sign-in',
  label: 'Max',
};

export const codexPlanRow: SubscriptionAccount = {
  id: 'acc-codex-plan',
  provider: 'openai',
  kind: 'subscription',
  provenance: 'sign-in',
  label: 'Plus',
};

const everyRefHoldsTheSecret: Readonly<Record<string, string>> = {
  'cred-key': secret,
  'cred-many': secret,
};

export function pointingAt(accountId: string, providerModel = 'claude-sonnet-5'): VirtualModel {
  return {
    id: 'fast',
    displayName: 'fast',
    routing: { entry: 't1', nodes: { t1: { kind: 'target', accountId, providerModel } } },
  };
}

export type LadderChild = { node: string; accountId: string; providerModel?: string };

const LADDER = 'ladder';

function childNodes(children: readonly LadderChild[]): Record<string, RouteNode> {
  const nodes: Record<string, RouteNode> = {};

  for (const child of children) {
    nodes[child.node] = {
      kind: 'target',
      accountId: child.accountId,
      providerModel: child.providerModel ?? 'claude-sonnet-5',
    };
  }

  return nodes;
}

/**
 * A virtual model whose entry hands the request to a router over the children named.
 *
 * @summary Every per-node spec stands the same stored shape up, so the one rule that writes it
 * lives here rather than in each spec's own literal.
 */
export function ladderedOver(
  children: readonly LadderChild[],
  policy: RouterPolicy = { mode: 'failover' },
): VirtualModel {
  return {
    id: 'fast',
    displayName: 'fast',
    routing: {
      entry: LADDER,
      nodes: {
        [LADDER]: { kind: 'router', policy, children: children.map((child) => child.node) },
        ...childNodes(children),
      },
    },
  };
}

export function routedAs(standing: EngineTargetStanding): EngineVirtualModel['routing'] {
  return { entry: 't1', nodes: { t1: { kind: 'target', standing } } };
}

export function spendAskFor(id: string, slug: string, virtualModel: string): unknown {
  return { kind: 'spend-request', id, slug, virtualModel, routeNode: 't1' };
}

export function gatewayHolding(models: readonly VirtualModel[]): GatewayConfig {
  return {
    schemaVersion: GATEWAY_CONFIG_VERSION,
    slug: 'personal',
    displayName: 'Personal',
    port: 8397,
    virtualModels: [...models],
    layout: { nodes: {} },
  };
}

function vaultHolding(entries: Readonly<Record<string, string>>): VaultDocument {
  return Object.entries(entries).reduce<VaultDocument>(
    (vault, [ref, plain]) => setSecret(vault, fakeCodec, ref, plain),
    { schemaVersion: 1, entries: {} },
  );
}

export async function rewriteRegistry(
  userDataPath: string,
  accounts: readonly Account[],
  modelPolicies?: ProviderModelPolicies,
): Promise<void> {
  await writeFile(
    join(userDataPath, 'accounts.json'),
    JSON.stringify({
      schemaVersion: ACCOUNTS_VERSION,
      accounts,
      ...(modelPolicies === undefined ? {} : { modelPolicies }),
    }),
    'utf8',
  );
}

/**
 * Writes the settings document a gateway snapshot is minted against.
 *
 * @summary Only the bind address changes what the child is handed, so the helper names that one
 * field and fills the rest from the defaults. Leaving it out writes a document that names no
 * address at all, which is what a profile saved before the setting existed looks like.
 */
export async function rewriteSettings(userDataPath: string, bindAddress?: string): Promise<void> {
  const stored = { ...defaultSettings(), bindAddress };

  await writeFile(join(userDataPath, 'settings.json'), JSON.stringify(stored), 'utf8');
}

export async function rewriteVault(
  userDataPath: string,
  credentials: Readonly<Record<string, string>>,
): Promise<void> {
  await saveVaultFile(join(userDataPath, 'vault.bin'), vaultHolding(credentials));
}

export async function storageHolding(
  models: readonly VirtualModel[],
  accounts: readonly Account[],
  credentials: Readonly<Record<string, string>> = everyRefHoldsTheSecret,
  modelPolicies?: ProviderModelPolicies,
): Promise<string> {
  const userDataPath = await mkdtemp(join(tmpdir(), 'recompose-spend-'));
  const config = gatewayHolding(models);

  await mkdir(join(userDataPath, 'gateways'), { recursive: true });
  await writeFile(
    join(userDataPath, 'gateways', `${config.slug}.json`),
    JSON.stringify(config),
    'utf8',
  );
  await rewriteRegistry(userDataPath, accounts, modelPolicies);
  await rewriteVault(userDataPath, credentials);

  return userDataPath;
}

export async function holdSubscriptionCredential(
  userDataPath: string,
  provider: SubscriptionAccount['provider'],
  accountId: string,
  blob: string,
): Promise<void> {
  await subscriptionCredentialStore(userDataPath, 'linux', null).write(provider, accountId, blob);
}

export function contextFor(userDataPath: string): SpendGrantContext {
  return {
    userDataPath,
    homeFolder: '/Users/ada',
    getCodec: () => fakeCodec,
    onCorrupt: () => undefined,
    readSubscriptionCredential: subscriptionCredentialStore(userDataPath, 'linux', null).read,
    readAdoptedCredential: async () => Promise.resolve(null),
    copilotCredential: async (_id, githubCredential) => Promise.resolve(githubCredential),
  };
}
