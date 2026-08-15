import {
  ACCOUNTS_VERSION,
  GATEWAY_CONFIG_VERSION,
  type Account,
  type EngineGateway,
  type GatewayConfig,
} from '@recompose/contracts';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { EngineHost } from './engine-host';

import { createGatewayLifecycleRequests } from './gateway-lifecycle-requests';

export function gatewayNamed(slug: string, port: number): GatewayConfig {
  return {
    schemaVersion: GATEWAY_CONFIG_VERSION,
    slug,
    displayName: slug,
    port,
    virtualModels: [],
    layout: { nodes: {} },
  };
}

export function gatewayServing(slug: string, port: number, accountId: string): GatewayConfig {
  return {
    ...gatewayNamed(slug, port),
    virtualModels: [
      {
        id: 'fast',
        displayName: 'fast',
        routing: {
          entry: 't1',
          nodes: {
            t1: { kind: 'target', accountId, providerModel: 'claude-sonnet-5' },
          },
        },
      },
    ],
  };
}

/**
 * An engine that records what it was asked to do, and reports the gateways a test says are serving.
 *
 * @summary The state a request reads decides whether it acts at all, so a test names the running
 * gateways rather than leaving that to a default nobody wrote down.
 */
export function recordingHost(running: readonly string[] = []) {
  const started: EngineGateway[] = [];
  const stopped: string[] = [];
  const restarted: EngineGateway[] = [];
  const stateReads = { count: 0 };

  const host: EngineHost = {
    replayLogs: () => undefined,
    retainedLogRows: () => [],
    start: async (gateway) => {
      started.push(gateway);

      return Promise.resolve({ status: 'running' });
    },
    stop: async (slug) => {
      stopped.push(slug);

      return Promise.resolve({ status: 'stopped' });
    },
    restart: async (gateway) => {
      restarted.push(gateway);

      return Promise.resolve({ status: 'running' });
    },
    states: () => {
      stateReads.count += 1;

      return Object.fromEntries(running.map((slug) => [slug, { status: 'running' as const }]));
    },
    onStatesChanged: () => () => undefined,
    probe: async () => Promise.resolve({ verdict: 'could-not-check' as const }),
    probeRuntime: async () => Promise.resolve({ verdict: 'unreachable' as const }),
    listModels: async () => Promise.resolve({ standing: 'unlisted' as const }),
    dispose: () => undefined,
  };

  return { host, started, stopped, restarted, stateReads: () => stateReads.count };
}

export async function directoryHolding(
  stored: readonly GatewayConfig[],
  accounts: readonly Account[] = [],
): Promise<string> {
  const userDataPath = await mkdtemp(join(tmpdir(), 'recompose-lifecycle-'));
  const gatewaysDir = join(userDataPath, 'gateways');

  await mkdir(gatewaysDir, { recursive: true });

  for (const config of stored) {
    await writeFile(join(gatewaysDir, `${config.slug}.json`), JSON.stringify(config), 'utf8');
  }

  await writeFile(
    join(userDataPath, 'accounts.json'),
    JSON.stringify({ schemaVersion: ACCOUNTS_VERSION, accounts }),
    'utf8',
  );

  return userDataPath;
}

export function complained(spy: { mock: { calls: unknown[][] } }): string {
  return spy.mock.calls.flat().map(String).join(' ');
}

export function requestsOver(host: EngineHost | null, userDataPath: string) {
  return createGatewayLifecycleRequests({
    host: () => host,
    userDataPath: () => userDataPath,
    onCorrupt: () => undefined,
  });
}
