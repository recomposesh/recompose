import type { PriceMiss, UsageBucket, UsageDayCost, UsageMeasures } from '@recompose/contracts';

export type ModelPrice = {
  inputPerToken: number;
  outputPerToken: number;
  cacheReadPerToken?: number;
  cacheWritePerToken?: number;
};

export type PriceMap = ReadonlyMap<string, ModelPrice>;

export type DayCosts = {
  dayCosts: readonly UsageDayCost[];
  priceMisses: readonly PriceMiss[];
};

const MICRO_DOLLARS = 1_000_000;

const DATED_MODEL_SUFFIX = /-\d{8}$/;

/**
 * The price entry one served model resolves to, tried the way the LiteLLM map writes keys.
 *
 * @summary Exact name first, then the provider-prefixed form, then the undated twin of a
 * date-suffixed name. A miss answers nothing rather than a zero price, so the caller surfaces it.
 */
function priceEntryFor(
  prices: PriceMap,
  provider: string | undefined,
  providerModel: string,
): ModelPrice | undefined {
  return (
    prices.get(providerModel) ??
    prices.get(`${provider ?? ''}/${providerModel}`) ??
    prices.get(providerModel.replace(DATED_MODEL_SUFFIX, ''))
  );
}

function microDollarsOf(tokens: UsageMeasures['tokens'], price: ModelPrice): number {
  const dollars =
    tokens.input * price.inputPerToken +
    tokens.output * price.outputPerToken +
    tokens.cacheRead * (price.cacheReadPerToken ?? 0) +
    tokens.cacheWrite * (price.cacheWritePerToken ?? 0);

  return Math.round(dollars * MICRO_DOLLARS);
}

function costRowOf(day: UsageBucket, priced: number): UsageDayCost {
  const basis =
    day.tuple.accountKind === 'subscription'
      ? { equivalentMicroDollars: priced }
      : { billedMicroDollars: priced };

  return { dayStart: day.start, tuple: day.tuple, ...basis };
}

function missedWith(misses: readonly PriceMiss[], day: UsageBucket): readonly PriceMiss[] {
  if (day.tuple.providerModel === undefined) {
    return misses;
  }

  const named = misses.find((miss) => miss.providerModel === day.tuple.providerModel);

  if (named === undefined) {
    return [
      ...misses,
      {
        ...(day.tuple.provider === undefined ? {} : { provider: day.tuple.provider }),
        providerModel: day.tuple.providerModel,
        requests: day.measures.requests,
      },
    ];
  }

  return misses.map((miss) =>
    miss === named ? { ...miss, requests: miss.requests + day.measures.requests } : miss,
  );
}

/**
 * The day costs one range read answers, priced at answer time and never persisted.
 *
 * @summary Key-served and aggregator traffic bill; subscription traffic answers the equivalent
 * figure the approximation prefix rides; local traffic costs nothing and reasoning tokens carry no
 * price of their own. Amounts stay integer micro-dollars so summed figures hold exact until the
 * one rounding a print takes, and a model the map cannot name surfaces by request count rather
 * than pricing as zero.
 */
export function dayCostsOf(days: readonly UsageBucket[], prices: PriceMap): DayCosts {
  return days.reduce<DayCosts>(
    (priced, day) => {
      const { providerModel, accountKind } = day.tuple;

      if (accountKind === 'local' || providerModel === undefined) {
        return priced;
      }

      const entry = priceEntryFor(prices, day.tuple.provider, providerModel);

      if (entry === undefined) {
        return { ...priced, priceMisses: missedWith(priced.priceMisses, day) };
      }

      return {
        ...priced,
        dayCosts: [...priced.dayCosts, costRowOf(day, microDollarsOf(day.measures.tokens, entry))],
      };
    },
    { dayCosts: [], priceMisses: [] },
  );
}
