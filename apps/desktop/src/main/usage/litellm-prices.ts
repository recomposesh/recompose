import type { ContextBandPrice, ModelPrice, PriceMap } from './pricing';

import { isRecord } from '../storage/json-file';

const PRICE_MAP_URL =
  'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json';

/** The community price map recompose prices every vendor but the one gateway with. */
export async function fetchLiteLlmPrices(): Promise<unknown> {
  const answer = await fetch(PRICE_MAP_URL);

  if (!answer.ok) {
    throw new Error(`the price map answered ${String(answer.status)}`);
  }

  return answer.json();
}

function finiteRate(stated: unknown): number | undefined {
  return typeof stated === 'number' && Number.isFinite(stated) ? stated : undefined;
}

function rateAt(entry: Record<string, unknown>, field: string): number | undefined {
  return finiteRate(entry[field]);
}

function cacheRatesOf(raw: Record<string, unknown>): Partial<ModelPrice> {
  const cacheRead = rateAt(raw, 'cache_read_input_token_cost');
  const cacheWrite = rateAt(raw, 'cache_creation_input_token_cost');

  return {
    ...(cacheRead === undefined ? {} : { cacheReadPerToken: cacheRead }),
    ...(cacheWrite === undefined ? {} : { cacheWritePerToken: cacheWrite }),
  };
}

const TOKENS_A_THRESHOLD_COUNTS_IN = 1_000;

/**
 * The one field shape a context threshold is written into, and nothing else that looks like one.
 *
 * @summary The upstream writes several suffixes past the threshold. `_priority` and `_flex` name a
 * service level rather than a context, and `_above_1hr` names a cache lifetime, so an exact match
 * is what keeps a rate recompose never asks for out of the band it would otherwise price.
 */
const BAND_FIELD =
  /^(input_cost_per_token|output_cost_per_token|cache_read_input_token_cost|cache_creation_input_token_cost)_above_(\d+)k_tokens$/u;

const BAND_RATE_BY_FIELD: Readonly<Record<string, keyof ContextBandPrice>> = {
  input_cost_per_token: 'inputPerToken',
  output_cost_per_token: 'outputPerToken',
  cache_read_input_token_cost: 'cacheReadPerToken',
  cache_creation_input_token_cost: 'cacheWritePerToken',
};

type StatedBandRate = { threshold: number; rate: keyof ContextBandPrice; perToken: number };

function bandRateIn(field: string, stated: unknown): StatedBandRate | undefined {
  const named = BAND_FIELD.exec(field);
  const perToken = finiteRate(stated);

  if (named === null || perToken === undefined) {
    return undefined;
  }

  const rate = BAND_RATE_BY_FIELD[String(named[1])];

  return rate === undefined
    ? undefined
    : { threshold: Number(named[2]) * TOKENS_A_THRESHOLD_COUNTS_IN, rate, perToken };
}

function ratesByThreshold(raw: Record<string, unknown>): Map<number, Partial<ContextBandPrice>> {
  const gathered = new Map<number, Partial<ContextBandPrice>>();

  for (const [field, stated] of Object.entries(raw)) {
    const band = bandRateIn(field, stated);

    if (band !== undefined) {
      gathered.set(band.threshold, {
        ...gathered.get(band.threshold),
        [band.rate]: band.perToken,
      });
    }
  }

  return gathered;
}

function bandFrom(contextOverTokens: number, rates: Partial<ContextBandPrice>): ContextBandPrice[] {
  const { inputPerToken, outputPerToken } = rates;

  if (inputPerToken === undefined || outputPerToken === undefined) {
    return [];
  }

  return [{ ...rates, contextOverTokens, inputPerToken, outputPerToken }];
}

function rangeOpensAt(entry: Record<string, unknown>): number | undefined {
  const range = entry['range'];

  if (!Array.isArray(range)) {
    return undefined;
  }

  const opensAt: unknown = range[0];

  return typeof opensAt === 'number' && opensAt > 0 ? opensAt : undefined;
}

function rangeRates(entry: Record<string, unknown>): Partial<ContextBandPrice> {
  const inputPerToken = rateAt(entry, 'input_cost_per_token');
  const outputPerToken = rateAt(entry, 'output_cost_per_token');

  return {
    ...cacheRatesOf(entry),
    ...(inputPerToken === undefined ? {} : { inputPerToken }),
    ...(outputPerToken === undefined ? {} : { outputPerToken }),
  };
}

function rangedBand(entry: unknown): ContextBandPrice[] {
  if (!isRecord(entry)) {
    return [];
  }

  const contextOverTokens = rangeOpensAt(entry);

  return contextOverTokens === undefined ? [] : bandFrom(contextOverTokens, rangeRates(entry));
}

/**
 * The bands one model charges above a context threshold, and nothing where it charges one rate.
 *
 * @summary The upstream states a band two ways and this reads both, because the models split
 * between them and neither is being retired. A band missing either rate a turn is charged on is
 * dropped rather than half-priced, which is the rule the base rate already follows.
 */
function bandsOf(raw: Record<string, unknown>): Pick<ModelPrice, 'bands'> {
  const ranged = raw['tiered_pricing'];
  const bands = Array.isArray(ranged)
    ? ranged.flatMap(rangedBand)
    : [...ratesByThreshold(raw)].flatMap(([threshold, rates]) => bandFrom(threshold, rates));

  return bands.length === 0
    ? {}
    : { bands: bands.sort((a, b) => a.contextOverTokens - b.contextOverTokens) };
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

  return { inputPerToken, outputPerToken, ...cacheRatesOf(raw), ...bandsOf(raw) };
}

/**
 * The usable entries one raw map payload holds, and nothing when the payload is not a map at all.
 *
 * @summary Parsing stays lenient on purpose: the upstream adds fields freely, so each entry is
 * read for the four rates this app prices with and the rest is ignored. An entry missing either
 * required rate is dropped rather than priced wrong, and a payload that is not an object refuses
 * whole so a moved shape never empties the standing copy.
 */
export function liteLlmPricesFrom(payload: unknown): PriceMap | undefined {
  if (!isRecord(payload) || Array.isArray(payload)) {
    return undefined;
  }

  const entries = Object.entries(payload).flatMap(([name, raw]): [string, ModelPrice][] => {
    const priced = pricedEntryOf(raw);

    return priced === undefined ? [] : [[name, priced]];
  });

  return new Map(entries);
}
