import type { LogRow, PlanUsageReadings } from '@recompose/contracts';

import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import { openUsageIpcDeps } from './usage-wiring';
import { aUsageClock, NOW, usageHome, wiringOver } from './usage-wiring.testkit';

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

const planReadings: PlanUsageReadings = {
  'sub-1': {
    accountId: 'sub-1',
    provider: 'anthropic',
    readAt: NOW - 30_000,
    windows: [{ length: '5h', spentShare: 0.62 }],
  },
};

aUsageClock();

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

  test('the quota fold borrows the plan readings the host last heard', async () => {
    const wiring = await wiringOver(await usageHome([]), { planUsage: () => planReadings });

    const deps = await openUsageIpcDeps(wiring);

    expect(deps.planUsage()).toBe(planReadings);
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
