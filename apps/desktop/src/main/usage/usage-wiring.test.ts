import type { Account, LogRow } from '@recompose/contracts';

import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { UsageWiring } from './usage-wiring';

import {
  aggregatorRow,
  rewriteRegistry,
  rewriteVault,
  secret,
} from '../engine-host/spend-grant.testkit';
import { reversibleCodec } from '../storage/safe-storage-codec.testkit';
import { openUsageStore } from './usage-store';
import { openUsageIpcDeps } from './usage-wiring';

const NOW = 1_754_600_400_000;

const sonnetPriced = {
  'claude-sonnet-4-5': { input_cost_per_token: 0.000003, output_cost_per_token: 0.000015 },
};

const miniPriced = {
  'gpt-5-mini': { input_cost_per_token: 2.5e-7, output_cost_per_token: 0.000002 },
};

const rowsInFlight: readonly LogRow[] = [
  {
    id: 'log-1',
    at: NOW - 60_000,
    gateway: 'personal',
    origin: 'provider',
    method: 'POST',
    status: 200,
    clientKey: `sha256:${'a'.repeat(64)}`,
  },
];

async function usageHome(accounts: readonly Account[]): Promise<string> {
  const home = await mkdtemp(join(tmpdir(), 'recompose-usage-'));

  await rewriteRegistry(home, accounts);
  await rewriteVault(home, { 'cred-many': secret });
  await writeFile(join(home, 'bundled-prices.json'), JSON.stringify(sonnetPriced), 'utf8');

  return home;
}

function reachInto(home: string) {
  return {
    userDataPath: home,
    homeFolder: '/Users/ada',
    getCodec: () => reversibleCodec,
    onCorrupt: () => undefined,
  };
}

async function wiringOver(home: string, handed: Partial<UsageWiring> = {}): Promise<UsageWiring> {
  return {
    reach: () => reachInto(home),
    store: await openUsageStore({
      file: join(home, 'usage.json'),
      retentionDays: async () => Promise.resolve(30),
      accountKindOf: () => undefined,
    }),
    retainedRows: () => [],
    bundledPricesFile: join(home, 'bundled-prices.json'),
    ...handed,
  };
}

type UpstreamAsk = { endpoint: string; authorization: string | undefined };

function fetchAnswering(answer: unknown): UpstreamAsk[] {
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

function creditsAnswer(payload: unknown) {
  return { ok: true, status: 200, json: async () => Promise.resolve(payload) };
}

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

describe('the price map the usage report prices with', () => {
  test('a first boot prices from the vendored bundle', async () => {
    const deps = await openUsageIpcDeps(await wiringOver(await usageHome([])));

    const { prices, provenance } = deps.standingPrices();

    expect(provenance).toEqual({ source: 'bundled' });
    expect(prices.get('claude-sonnet-4-5')?.inputPerToken).toBe(0.000003);
  });

  test('a cache a past run fetched beside the store beats the bundle', async () => {
    const home = await usageHome([]);

    await writeFile(
      join(home, 'prices.json'),
      JSON.stringify({ fetchedAt: NOW - 3_600_000, payload: miniPriced }),
    );

    const deps = await openUsageIpcDeps(await wiringOver(home));

    expect(deps.standingPrices().provenance).toEqual({
      source: 'synced',
      fetchedAt: NOW - 3_600_000,
    });
    expect(deps.standingPrices().prices.get('gpt-5-mini')).toBeDefined();
  });
});

describe('what the usage channels answer from', () => {
  test('the report reads the boot store the wiring hands over', async () => {
    const wiring = await wiringOver(await usageHome([]));

    const deps = await openUsageIpcDeps(wiring);

    expect(deps.store).toBe(wiring.store);
  });

  test('the quota fold borrows the rows still riding the host', async () => {
    const wiring = await wiringOver(await usageHome([]), { retainedRows: () => rowsInFlight });

    const deps = await openUsageIpcDeps(wiring);

    expect(deps.retainedRows()).toBe(rowsInFlight);
  });

  test('the menu note stands quiet until the Usage menu lands to read it', async () => {
    const deps = await openUsageIpcDeps(await wiringOver(await usageHome([])));

    expect(() => {
      deps.noteUsageTable(true);
    }).not.toThrow();
  });

  test('a menu that landed hears every note', async () => {
    const noted: boolean[] = [];
    const heard = (open: boolean): void => {
      noted.push(open);
    };
    const deps = await openUsageIpcDeps(
      await wiringOver(await usageHome([]), { noteUsageTable: heard }),
    );

    deps.noteUsageTable(true);
    deps.noteUsageTable(false);

    expect(noted).toEqual([true, false]);
  });
});

describe('the balance cards reaching OpenRouter', () => {
  test('a read answers the totals through the vaulted key of the account', async () => {
    const asked = fetchAnswering(creditsAnswer({ data: { total_credits: 25, total_usage: 18.4 } }));

    const deps = await openUsageIpcDeps(await wiringOver(await usageHome([aggregatorRow])));

    expect(await deps.balances.read(false)).toEqual([
      { accountId: 'acc-many', reading: { totalCredits: 25, totalUsage: 18.4, readAt: NOW } },
    ]);
    expect(asked).toEqual([
      { endpoint: 'https://openrouter.ai/api/v1/credits', authorization: `Bearer ${secret}` },
    ]);
  });

  test('an endpoint that refuses names the status on the card', async () => {
    fetchAnswering({ ok: false, status: 402 });

    const deps = await openUsageIpcDeps(await wiringOver(await usageHome([aggregatorRow])));

    expect(await deps.balances.read(false)).toEqual([
      { accountId: 'acc-many', failure: 'The credits endpoint answered 402.' },
    ]);
  });

  test('an answer holding no readable totals reads as a failure rather than zeros', async () => {
    fetchAnswering(creditsAnswer({ data: { credits: 25 } }));

    const deps = await openUsageIpcDeps(await wiringOver(await usageHome([aggregatorRow])));

    expect(await deps.balances.read(false)).toEqual([
      { accountId: 'acc-many', failure: 'The credits answer held no readable totals.' },
    ]);
  });
});

describe('the vaulted key a balance read stands on', () => {
  test('a vault holding no secret for the account answers the failure card', async () => {
    const asked = fetchAnswering(creditsAnswer({}));
    const home = await usageHome([aggregatorRow]);

    await rewriteVault(home, {});

    const deps = await openUsageIpcDeps(await wiringOver(home));

    expect(await deps.balances.read(false)).toEqual([
      { accountId: 'acc-many', failure: 'The vault holds no secret for this account.' },
    ]);
    expect(asked).toEqual([]);
  });

  test('a vault written by a newer recompose refuses in its own words', async () => {
    fetchAnswering(creditsAnswer({}));

    const home = await usageHome([aggregatorRow]);

    await writeFile(join(home, 'vault.bin'), JSON.stringify({ schemaVersion: 2, entries: {} }));

    const deps = await openUsageIpcDeps(await wiringOver(home));

    expect(await deps.balances.read(false)).toEqual([
      { accountId: 'acc-many', failure: 'vault schemaVersion 2 is newer than supported 1' },
    ]);
  });
});

describe('a registry that moves under a read', () => {
  test('an account that leaves before its secret is read answers a failure card', async () => {
    fetchAnswering(creditsAnswer({}));

    const stocked = await usageHome([aggregatorRow]);
    const emptied = await usageHome([]);
    let registry = stocked;
    let leavesOnTheNextAsk = false;
    const reach = () => {
      const home = registry;

      if (leavesOnTheNextAsk) {
        registry = emptied;
      }

      return reachInto(home);
    };
    const deps = await openUsageIpcDeps(await wiringOver(stocked, { reach }));

    leavesOnTheNextAsk = true;

    expect(await deps.balances.read(false)).toEqual([
      { accountId: 'acc-many', failure: 'no aggregator account is held under acc-many.' },
    ]);
  });
});
