import type { PricingProvenance } from '@recompose/contracts';

import { readFile } from 'node:fs/promises';

import type { ModelPrice, PriceMap } from './pricing';

import { isRecord, readJsonWithQuarantine, writeJsonAtomic } from '../storage/json-file';

const REFRESH_EVERY_MS = 24 * 3_600_000;

export type PriceMapDeps = {
  cacheFile: string;
  bundledFile: string;
  fetchPrices?: () => Promise<unknown>;
  onCorrupt?: (quarantinedPath: string) => void;
};

export type StandingPrices = {
  prices: PriceMap;
  provenance: PricingProvenance;
};

export type PriceMapDesk = {
  standing: () => StandingPrices;
  refreshNow: () => Promise<void>;
  dispose: () => void;
};

async function fetchFromLiteLlm(): Promise<unknown> {
  const answer = await fetch(
    'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json',
  );

  if (!answer.ok) {
    throw new Error(`the price map answered ${String(answer.status)}`);
  }

  return answer.json();
}

function rateAt(entry: Record<string, unknown>, field: string): number | undefined {
  const rate = entry[field];

  return typeof rate === 'number' && Number.isFinite(rate) ? rate : undefined;
}

function cacheRatesOf(raw: Record<string, unknown>): Partial<ModelPrice> {
  const cacheRead = rateAt(raw, 'cache_read_input_token_cost');
  const cacheWrite = rateAt(raw, 'cache_creation_input_token_cost');

  return {
    ...(cacheRead === undefined ? {} : { cacheReadPerToken: cacheRead }),
    ...(cacheWrite === undefined ? {} : { cacheWritePerToken: cacheWrite }),
  };
}

function pricedEntryOf(raw: unknown): ModelPrice | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }

  const inputPerToken = rateAt(raw, 'input_cost_per_token');
  const outputPerToken = rateAt(raw, 'output_cost_per_token');

  if (inputPerToken === undefined || outputPerToken === undefined) {
    return undefined;
  }

  return { inputPerToken, outputPerToken, ...cacheRatesOf(raw) };
}

/**
 * The usable entries one raw map payload holds, and nothing when the payload is not a map at all.
 *
 * @summary Parsing stays lenient on purpose: the upstream adds fields freely, so each entry is
 * read for the four rates this app prices with and the rest is ignored. An entry missing either
 * required rate is dropped rather than priced wrong, and a payload that is not an object refuses
 * whole so a moved shape never empties the standing copy.
 */
function pricesFrom(payload: unknown): PriceMap | undefined {
  if (!isRecord(payload) || Array.isArray(payload)) {
    return undefined;
  }

  const entries = Object.entries(payload).flatMap(([name, raw]): [string, ModelPrice][] => {
    const priced = pricedEntryOf(raw);

    return priced === undefined ? [] : [[name, priced]];
  });

  return new Map(entries);
}

function cachedAt(raw: unknown): number | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }

  const fetchedAt = raw['fetchedAt'];

  return typeof fetchedAt === 'number' && Number.isInteger(fetchedAt) ? fetchedAt : undefined;
}

function syncedFromCache(cached: unknown): StandingPrices | undefined {
  const fetchedAt = cachedAt(cached);

  if (!isRecord(cached) || fetchedAt === undefined) {
    return undefined;
  }

  const prices = pricesFrom(cached['payload']);

  return prices === undefined ? undefined : { prices, provenance: { source: 'synced', fetchedAt } };
}

async function standingFromDisk(deps: PriceMapDeps): Promise<StandingPrices> {
  const synced = syncedFromCache(
    await readJsonWithQuarantine(deps.cacheFile, deps.onCorrupt ?? (() => undefined)),
  );

  if (synced !== undefined) {
    return synced;
  }

  const bundled = pricesFrom(JSON.parse(await readFile(deps.bundledFile, 'utf8')));

  return { prices: bundled ?? new Map(), provenance: { source: 'bundled' } };
}

/**
 * The price map through its whole life in main: bundle, cache, and a day-long refresh.
 *
 * @summary Resolution runs memory, then the cache a past run fetched, then the vendored snapshot,
 * so a first boot offline still prices. A refresh that fails or answers a moved shape keeps the
 * standing copy serving and stamps nothing, which bounds the failure to prices going stale rather
 * than a screen breaking. Every answer names its source and fetch instant, so staleness is data.
 */
export async function openPriceMap(deps: PriceMapDeps): Promise<PriceMapDesk> {
  const fetchPrices = deps.fetchPrices ?? fetchFromLiteLlm;

  let standing = await standingFromDisk(deps);

  const refreshNow = async (): Promise<void> => {
    let payload: unknown;

    try {
      payload = await fetchPrices();
    } catch (failure) {
      console.error('recompose could not fetch the model price map.', failure);

      return;
    }

    const prices = pricesFrom(payload);

    if (prices === undefined) {
      console.error('recompose refused a price map whose shape moved.');

      return;
    }

    const fetchedAt = Date.now();

    standing = { prices, provenance: { source: 'synced', fetchedAt } };
    await writeJsonAtomic(deps.cacheFile, { fetchedAt, payload });
  };

  const beat = setInterval(() => {
    void refreshNow();
  }, REFRESH_EVERY_MS);

  return {
    standing: () => standing,
    refreshNow,
    dispose: () => {
      clearInterval(beat);
    },
  };
}
