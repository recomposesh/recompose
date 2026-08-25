import type { ContextBandPrice, ModelPrice, PriceMap } from './pricing';

import { isRecord } from '../storage/json-file';
import { priceAddressBehindTheStandIn } from './price-origin';

const REGISTRY_URL = 'https://models.dev/api.json';

const REGISTRY_VENDOR = 'opencode';

const STORED_PROVIDER = 'opencode-zen';

const TOKENS_A_RATE_IS_QUOTED_PER = 1_000_000;

/**
 * What models.dev publishes about every vendor it tracks.
 *
 * @summary The gateway's own prices live nowhere the LiteLLM map reaches, and this registry is the
 * one OpenCode maintains and its own tool reads, so a price here is the price a person is charged.
 * The document covers every vendor; only the gateway's node is read.
 */
export async function fetchOpenCodeZenPrices(): Promise<unknown> {
  const answer = await fetch(priceAddressBehindTheStandIn(REGISTRY_URL));

  if (!answer.ok) {
    throw new Error(`the model registry answered ${String(answer.status)}`);
  }

  return answer.json();
}

function plainRecord(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) && !Array.isArray(value) ? value : undefined;
}

function rateAt(cost: Record<string, unknown>, field: string): number | undefined {
  const rate = cost[field];

  return typeof rate === 'number' && Number.isFinite(rate)
    ? rate / TOKENS_A_RATE_IS_QUOTED_PER
    : undefined;
}

function cacheRatesOf(cost: Record<string, unknown>): Partial<ModelPrice> {
  const cacheRead = rateAt(cost, 'cache_read');
  const cacheWrite = rateAt(cost, 'cache_write');

  return {
    ...(cacheRead === undefined ? {} : { cacheReadPerToken: cacheRead }),
    ...(cacheWrite === undefined ? {} : { cacheWritePerToken: cacheWrite }),
  };
}

function wholeTokenCount(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : undefined;
}

function contextThresholdOf(entry: Record<string, unknown>): number | undefined {
  const named = plainRecord(entry['tier']);

  return named?.['type'] === 'context' ? wholeTokenCount(named['size']) : undefined;
}

function bandOf(entry: unknown): ContextBandPrice | undefined {
  const stated = plainRecord(entry);

  if (stated === undefined) {
    return undefined;
  }

  const contextOverTokens = contextThresholdOf(stated);
  const inputPerToken = rateAt(stated, 'input');
  const outputPerToken = rateAt(stated, 'output');

  if (
    contextOverTokens === undefined ||
    inputPerToken === undefined ||
    outputPerToken === undefined
  ) {
    return undefined;
  }

  return { contextOverTokens, inputPerToken, outputPerToken, ...cacheRatesOf(stated) };
}

/**
 * The bands one model charges above a context threshold, and nothing where it charges one rate.
 *
 * @summary The registry lists a band for anything a vendor prices in steps, so only a band typed
 * `context` is read here. A batch or a service band changes the rate for a reason recompose never
 * asks for, and pricing it as long context would charge the wrong number twice over.
 */
function bandsOf(cost: Record<string, unknown>): Pick<ModelPrice, 'bands'> {
  const stated = cost['tiers'];

  if (!Array.isArray(stated)) {
    return {};
  }

  const bands = stated.flatMap((entry): ContextBandPrice[] => {
    const band = bandOf(entry);

    return band === undefined ? [] : [band];
  });

  return bands.length === 0 ? {} : { bands };
}

/**
 * The price one registry model states, and nothing where it states no rate the app prices with.
 *
 * @summary A rate of zero is a price the gateway really charges, so every read tests for a stated
 * number rather than a truthy one. Several models are served free, and dropping them would surface
 * a real turn as an unpriced miss.
 */
function pricedModel(entry: unknown): ModelPrice | undefined {
  if (!isRecord(entry) || !isRecord(entry['cost'])) {
    return undefined;
  }

  const cost = entry['cost'];
  const inputPerToken = rateAt(cost, 'input');
  const outputPerToken = rateAt(cost, 'output');

  if (inputPerToken === undefined || outputPerToken === undefined) {
    return undefined;
  }

  return { inputPerToken, outputPerToken, ...cacheRatesOf(cost), ...bandsOf(cost) };
}

function modelsOfVendor(payload: unknown): Record<string, unknown> | undefined {
  const vendor = plainRecord(plainRecord(payload)?.[REGISTRY_VENDOR]);

  return vendor === undefined ? undefined : plainRecord(vendor['models']);
}

/**
 * The gateway's prices one raw registry payload holds, keyed the way a stored row resolves them.
 *
 * @summary Keys carry the stored provider rather than the registry's own vendor word, because the
 * lookup builds `<provider>/<model>` off the account, and the two words differ on purpose. A
 * payload whose shape moved answers nothing, so a moved registry leaves the standing copy serving
 * rather than emptying it.
 */
export function openCodeZenPricesFrom(payload: unknown): PriceMap | undefined {
  const models = modelsOfVendor(payload);

  if (models === undefined) {
    return undefined;
  }

  const entries = Object.entries(models).flatMap(([id, entry]): [string, ModelPrice][] => {
    const priced = pricedModel(entry);

    return priced === undefined ? [] : [[`${STORED_PROVIDER}/${id}`, priced]];
  });

  return entries.length === 0 ? undefined : new Map(entries);
}
