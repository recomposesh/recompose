import type { PricingProvenance } from '@recompose/contracts';

import { readFile } from 'node:fs/promises';

import type { PriceMap } from './pricing';

import { isRecord, readJsonWithQuarantine, writeJsonAtomic } from '../storage/json-file';
import { fetchLiteLlmPrices, liteLlmPricesFrom } from './litellm-prices';
import { fetchOpenCodeZenPrices, openCodeZenPricesFrom } from './opencode-zen-prices';

const REFRESH_EVERY_MS = 24 * 3_600_000;

const PRICE_CACHE_VERSION = 1;

export type PriceMapDeps = {
  cacheFile: string;
  bundledFile: string;
  bundledRegistryFile: string;
  fetchPrices?: () => Promise<unknown>;
  fetchRegistryPrices?: () => Promise<unknown>;
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

function cachedAt(raw: unknown): number | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }

  const fetchedAt = raw['fetchedAt'];

  return typeof fetchedAt === 'number' && Number.isInteger(fetchedAt) ? fetchedAt : undefined;
}

/**
 * Whether this build knows the era one cached document was written at.
 *
 * @summary A document from before this cache carried a version names none, and every one of those on
 * disk holds prices a past run really did fetch, so it is read rather than thrown away for a
 * refetch that a first boot offline cannot make. A document naming any other version belongs to a
 * build that is not this one, and it reads as no cache so the bundle serves instead. Nothing here
 * moves a file aside: a cache from a newer build is a good file, and quarantining it would cost that
 * build its own prices the next time a person goes back to it.
 */
function cacheEraKnown(cached: Record<string, unknown>): boolean {
  const named = cached['schemaVersion'];

  return named === undefined || named === PRICE_CACHE_VERSION;
}

type PriceLayers = { base: PriceMap; registry: PriceMap };

type CachedPayloads = { payload: unknown; registryPayload: unknown; fetchedAt: number | undefined };

type StoredPayloads = Omit<CachedPayloads, 'fetchedAt'>;

const NOTHING_CACHED: CachedPayloads = {
  payload: undefined,
  registryPayload: undefined,
  fetchedAt: undefined,
};

type ReadPrices = (payload: unknown) => PriceMap | undefined;

/**
 * The two layers as one map, with the registry's own prices standing last.
 *
 * @summary A gateway reselling a model the wider map also names is charged at its own rate, so the
 * layer that knows the gateway wins wherever both name a key.
 */
function mergedPrices(layers: PriceLayers): PriceMap {
  return new Map([...layers.base, ...layers.registry]);
}

function cachedPayloadsIn(cached: unknown): CachedPayloads {
  const fetchedAt = cachedAt(cached);

  if (!isRecord(cached) || fetchedAt === undefined || !cacheEraKnown(cached)) {
    return NOTHING_CACHED;
  }

  return { payload: cached['payload'], registryPayload: cached['registryPayload'], fetchedAt };
}

async function bundledPricesIn(file: string, read: ReadPrices): Promise<PriceMap> {
  return read(JSON.parse(await readFile(file, 'utf8'))) ?? new Map();
}

type OpenedPrices = { layers: PriceLayers; stored: StoredPayloads; provenance: PricingProvenance };

type SyncedLayers = { base: PriceMap | undefined; registry: PriceMap | undefined };

async function layersOver(deps: PriceMapDeps, synced: SyncedLayers): Promise<PriceLayers> {
  return {
    base: synced.base ?? (await bundledPricesIn(deps.bundledFile, liteLlmPricesFrom)),
    registry:
      synced.registry ?? (await bundledPricesIn(deps.bundledRegistryFile, openCodeZenPricesFrom)),
  };
}

function provenanceOf(
  fetchedAt: number | undefined,
  base: PriceMap | undefined,
): PricingProvenance {
  return fetchedAt === undefined || base === undefined
    ? { source: 'bundled' }
    : { source: 'synced', fetchedAt };
}

/**
 * Both layers as a boot resolves them, each from the cache where a past run fetched it.
 *
 * @summary Provenance follows the wider map rather than either layer, because that map prices all
 * but one vendor, and a person reading a stale date wants to know how old the bulk of it is.
 */
async function standingFromDisk(deps: PriceMapDeps): Promise<OpenedPrices> {
  const cached = cachedPayloadsIn(
    await readJsonWithQuarantine(deps.cacheFile, deps.onCorrupt ?? (() => undefined)),
  );
  const synced: SyncedLayers = {
    base: liteLlmPricesFrom(cached.payload),
    registry: openCodeZenPricesFrom(cached.registryPayload),
  };

  return {
    layers: await layersOver(deps, synced),
    stored: { payload: cached.payload, registryPayload: cached.registryPayload },
    provenance: provenanceOf(cached.fetchedAt, synced.base),
  };
}

type FetchedLayer = { prices: PriceMap; payload: unknown };

type FetchedLayers = { base: FetchedLayer | undefined; registry: FetchedLayer | undefined };

function layersAfter(standing: PriceLayers, fetched: FetchedLayers): PriceLayers {
  return {
    base: fetched.base?.prices ?? standing.base,
    registry: fetched.registry?.prices ?? standing.registry,
  };
}

function payloadsAfter(stored: StoredPayloads, fetched: FetchedLayers): StoredPayloads {
  return {
    payload: fetched.base === undefined ? stored.payload : fetched.base.payload,
    registryPayload:
      fetched.registry === undefined ? stored.registryPayload : fetched.registry.payload,
  };
}

async function fetchedLayer(
  askFor: () => Promise<unknown>,
  read: ReadPrices,
  named: string,
): Promise<FetchedLayer | undefined> {
  let payload: unknown;

  try {
    payload = await askFor();
  } catch (failure) {
    console.error(`recompose could not fetch ${named}.`, failure);

    return undefined;
  }

  const prices = read(payload);

  if (prices === undefined) {
    console.error(`recompose refused ${named}, whose shape moved.`);

    return undefined;
  }

  return { prices, payload };
}

/**
 * The price map through its whole life in main: bundle, cache, and a day-long refresh.
 *
 * @summary Resolution runs memory, then the cache a past run fetched, then the vendored snapshot,
 * so a first boot offline still prices. The two sources refresh independently, so one host being
 * unreachable costs only the layer it serves. A refresh that fails or answers a moved shape keeps
 * the standing copy serving and stamps nothing, which bounds the failure to prices going stale
 * rather than a screen breaking. Every answer names its source and fetch instant.
 */
export async function openPriceMap(deps: PriceMapDeps): Promise<PriceMapDesk> {
  const askForPrices = deps.fetchPrices ?? fetchLiteLlmPrices;
  const askForRegistry = deps.fetchRegistryPrices ?? fetchOpenCodeZenPrices;

  const opened = await standingFromDisk(deps);
  let layers = opened.layers;
  let stored = opened.stored;
  let standing: StandingPrices = {
    prices: mergedPrices(layers),
    provenance: opened.provenance,
  };

  const refreshNow = async (): Promise<void> => {
    const [base, registry] = await Promise.all([
      fetchedLayer(askForPrices, liteLlmPricesFrom, 'the model price map'),
      fetchedLayer(askForRegistry, openCodeZenPricesFrom, 'the model registry'),
    ]);

    if (base === undefined && registry === undefined) {
      return;
    }

    const fetchedAt = Date.now();

    layers = layersAfter(layers, { base, registry });
    stored = payloadsAfter(stored, { base, registry });
    standing = { prices: mergedPrices(layers), provenance: { source: 'synced', fetchedAt } };

    await writeJsonAtomic(deps.cacheFile, {
      schemaVersion: PRICE_CACHE_VERSION,
      fetchedAt,
      ...stored,
    });
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
