import { describe, expect, test, vi } from 'vitest';

import { storageHolding } from '../engine-host/spend-grant.testkit';
import { bootFromStoredState } from './stored-boot';
import { depsOver } from './stored-boot.testkit';

vi.mock('electron', () => ({
  app: { isPackaged: false },
  BrowserWindow: { getAllWindows: (): unknown[] => [] },
}));

vi.mock('../engine-host/spawn-engine', () => ({
  spawnEngineChild: () => ({
    postMessage: () => undefined,
    onMessage: () => undefined,
    onExit: () => undefined,
    kill: () => undefined,
  }),
}));

const CHEAP = {
  litellm_provider: 'anthropic',
  input_cost_per_token: 0.000_001,
  output_cost_per_token: 0.000_002,
};

async function priced(payload: unknown): Promise<unknown> {
  await Promise.resolve();

  return payload;
}

describe('the prices the boot stands up', () => {
  test('the boot prices from the lookup it was handed rather than reaching a vendor', async () => {
    const home = await storageHolding([], []);
    const boot = await bootFromStoredState(
      depsOver(home, { fetchPrices: async () => priced({ 'claude-thrifty': CHEAP }) }),
    );

    await boot.priceMap.refreshNow();

    expect(boot.priceMap.standing().prices.get('claude-thrifty')?.inputPerToken).toBe(0.000_001);

    boot.close();
  });

  test('the registry lookup it was handed answers the same way', async () => {
    const home = await storageHolding([], []);
    const boot = await bootFromStoredState(
      depsOver(home, {
        fetchRegistryPrices: async () =>
          priced({ opencode: { models: { thrifty: { cost: { input: 1, output: 2 } } } } }),
      }),
    );

    await boot.priceMap.refreshNow();

    expect(boot.priceMap.standing().prices.get('opencode-zen/thrifty')).toBeDefined();

    boot.close();
  });
});
