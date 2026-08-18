import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, vi } from 'vitest';

import type { PriceMapDesk, PriceMapDeps } from './price-map';

import { openPriceMap } from './price-map';

/** The instant every pricing story reads the clock at, so a fetch stamp is a fixed number. */
export const NOW = 1_754_600_400_000;

/** What `quarantineFile` names a file it moved aside at `NOW`. */
export const CORRUPT_SUFFIX = 'corrupt-2025-08-07T21-00-00.000Z';

const sonnetPriced = {
  'claude-sonnet-4-5': {
    input_cost_per_token: 0.000003,
    output_cost_per_token: 0.000015,
    cache_read_input_token_cost: 3e-7,
    cache_creation_input_token_cost: 0.00000375,
  },
};

/** A second map that shares no model with the bundle, so a swap is visible in one lookup. */
export const miniPriced = {
  'gpt-5-mini': { input_cost_per_token: 2.5e-7, output_cost_per_token: 0.000002 },
};

export type PricingFiles = { cacheFile: string; bundledFile: string };

/** A profile holding the bundled snapshot, with nothing cached beside it yet. */
export async function aPricingHome(): Promise<PricingFiles> {
  const home = await mkdtemp(join(tmpdir(), 'recompose-prices-'));
  const bundledFile = join(home, 'bundled-prices.json');

  await writeFile(bundledFile, JSON.stringify(sonnetPriced));

  return { cacheFile: join(home, 'prices.json'), bundledFile };
}

/** A lane that never answers, which is what a first boot offline reaches. */
export const neverFetches = async (): Promise<never> =>
  Promise.reject(new Error('the network is unreachable'));

const disposers: (() => void)[] = [];

/**
 * Stands the clock at `NOW` and closes every desk a story opened.
 *
 * @summary Call it once at the top of a pricing spec. The day-long refresh timer keeps the process
 * alive on its own, so a desk left open outlives the test that opened it and the next file inherits
 * a refresh it never asked for.
 */
export function aPricingClock(): void {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'],
    });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    for (const dispose of disposers) {
      dispose();
    }

    disposers.length = 0;
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
}

/** A price desk over one profile, closed when the story ends. */
export async function aMapOver(
  files: PricingFiles,
  fetchPrices?: () => Promise<unknown>,
): Promise<PriceMapDesk> {
  return aMapWatching({
    ...files,
    ...(fetchPrices === undefined ? {} : { fetchPrices }),
  });
}

/** The same desk for a story that wants to hear which paths were moved aside. */
export async function aMapWatching(deps: PriceMapDeps): Promise<PriceMapDesk> {
  const map = await openPriceMap(deps);

  disposers.push(map.dispose);

  return map;
}
