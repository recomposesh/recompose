import type { Account } from '@recompose/contracts';

import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, vi } from 'vitest';

import type { UsageWiring } from './usage-wiring';

import {
  readerSecret,
  rewriteRegistry,
  rewriteVault,
  secret,
} from '../engine-host/spend-grant.testkit';
import { reversibleCodec } from '../storage/safe-storage-codec.testkit';
import { openPriceMap } from './price-map';
import { neverFetches } from './price-map.testkit';
import { openUsageStore } from './usage-store';

/** The instant every usage-wiring story reads the clock at, so a reading stamp is a fixed number. */
export const NOW = 1_754_600_400_000;

const sonnetPriced = {
  'claude-sonnet-4-5': { input_cost_per_token: 0.000003, output_cost_per_token: 0.000015 },
};

const zenPriced = { opencode: { models: { 'kimi-k3': { cost: { input: 3, output: 15 } } } } };

/** Stands the clock at `NOW` and clears the stubbed reach a story left behind. */
export function aUsageClock(): void {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'],
    });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
}

export async function usageHome(accounts: readonly Account[]): Promise<string> {
  const home = await mkdtemp(join(tmpdir(), 'recompose-usage-'));

  await rewriteRegistry(home, accounts);
  await rewriteVault(home, { 'cred-many': secret, 'read-many': readerSecret });
  await writeFile(join(home, 'bundled-prices.json'), JSON.stringify(sonnetPriced), 'utf8');
  await writeFile(join(home, 'bundled-registry-prices.json'), JSON.stringify(zenPriced), 'utf8');

  return home;
}

export function reachInto(home: string) {
  return {
    userDataPath: home,
    homeFolder: '/Users/ada',
    getCodec: () => reversibleCodec,
    onCorrupt: () => undefined,
  };
}

export async function wiringOver(
  home: string,
  handed: Partial<UsageWiring> = {},
): Promise<UsageWiring> {
  return {
    reach: () => reachInto(home),
    store: await openUsageStore({
      file: join(home, 'usage.json'),
      retentionDays: async () => Promise.resolve(30),
      accountKindOf: () => undefined,
    }),
    retainedRows: () => [],
    planUsage: () => ({}),
    priceMap: await openPriceMap({
      cacheFile: join(home, 'prices.json'),
      bundledFile: join(home, 'bundled-prices.json'),
      bundledRegistryFile: join(home, 'bundled-registry-prices.json'),
      fetchPrices: neverFetches,
      fetchRegistryPrices: neverFetches,
    }),
    ...handed,
  };
}

export type UpstreamAsk = { endpoint: string; authorization: string | undefined };

/**
 * Stubs the one reach a balance read makes, and records what it was asked for.
 *
 * @summary The recorded asks are the only evidence the endpoint and the credential were the ones
 * intended, because a card carries neither.
 */
export function fetchAnswering(answer: unknown): UpstreamAsk[] {
  const asked: UpstreamAsk[] = [];

  vi.stubGlobal('fetch', async (endpoint: string | URL, init?: RequestInit) => {
    asked.push({
      endpoint: String(endpoint),
      authorization: new Headers(init?.headers).get('Authorization') ?? undefined,
    });

    return Promise.resolve(answer);
  });

  return asked;
}

export function creditsAnswer(payload: unknown) {
  return { ok: true, status: 200, json: async () => Promise.resolve(payload) };
}
