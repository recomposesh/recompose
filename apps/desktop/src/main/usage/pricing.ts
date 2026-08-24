import type { PriceMiss, UsageBucket, UsageDayCost, UsageMeasures } from '@recompose/contracts';

/**
 * One rate band a model charges above a context threshold.
 *
 * @summary A band names the threshold rather than its place in a list, so a bucket stamped with
 * the threshold it rose above still finds its band after the prices move and a vendor adds one.
 */
export type ContextBandPrice = {
  contextOverTokens: number;
  inputPerToken: number;
  outputPerToken: number;
  cacheReadPerToken?: number;
  cacheWritePerToken?: number;
};

export type ModelPrice = {
  inputPerToken: number;
  outputPerToken: number;
  cacheReadPerToken?: number;
  cacheWritePerToken?: number;
  bands?: readonly ContextBandPrice[];
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
 * @summary The provider-prefixed form stands first, then the exact name, then the undated twin of
 * a date-suffixed name. A gateway reselling a model the map also names bare would otherwise price
 * at the model maker's rate, and the two rates differ by the margin the gateway lives on. A miss
 * answers nothing rather than a zero price, so the caller surfaces it.
 */
function priceEntryFor(
  prices: PriceMap,
  provider: string | undefined,
  providerModel: string,
): ModelPrice | undefined {
  return (
    prices.get(`${provider ?? ''}/${providerModel}`) ??
    prices.get(providerModel) ??
    prices.get(providerModel.replace(DATED_MODEL_SUFFIX, ''))
  );
}

/**
 * The rate one bucket is charged at, which is the band its prompts rose into or the base rate.
 *
 * @summary A bucket naming a threshold the prices no longer publish falls back to the base rate
 * rather than to nothing, because the traffic was really served and a vendor dropping a band is
 * not a reason to stop pricing it.
 */
function rateFor(price: ModelPrice, contextOverTokens: number | undefined): ModelPrice {
  if (contextOverTokens === undefined) {
    return price;
  }

  return price.bands?.find((band) => band.contextOverTokens === contextOverTokens) ?? price;
}

/**
 * The context thresholds one served model publishes, in the order they open.
 *
 * @summary Accrual asks this of the standing prices to stamp a bucket, so it resolves a model the
 * same way pricing does. A model nobody priced publishes none, which lands its traffic in the
 * ordinary bucket rather than refusing the row.
 */
export function contextThresholdsIn(
  prices: PriceMap,
  provider: string | undefined,
  providerModel: string | undefined,
): readonly number[] {
  if (providerModel === undefined) {
    return [];
  }

  const bands = priceEntryFor(prices, provider, providerModel)?.bands ?? [];

  return bands.map((band) => band.contextOverTokens).sort((first, next) => first - next);
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

function missedWith(
  misses: readonly PriceMiss[],
  day: UsageBucket,
  providerModel: string,
): readonly PriceMiss[] {
  const named = misses.find((miss) => miss.providerModel === providerModel);

  if (named === undefined) {
    return [
      ...misses,
      {
        ...(day.tuple.provider === undefined ? {} : { provider: day.tuple.provider }),
        providerModel,
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
        return { ...priced, priceMisses: missedWith(priced.priceMisses, day, providerModel) };
      }

      return {
        ...priced,
        dayCosts: [
          ...priced.dayCosts,
          costRowOf(
            day,
            microDollarsOf(day.measures.tokens, rateFor(entry, day.tuple.contextOverTokens)),
          ),
        ],
      };
    },
    { dayCosts: [], priceMisses: [] },
  );
}
