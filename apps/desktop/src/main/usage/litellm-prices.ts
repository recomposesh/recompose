import type { ModelPrice, PriceMap } from './pricing';

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
