import type { UsageBucket, UsageReport } from '@recompose/contracts';

const HOUR_MS = 3_600_000;
const NOW_HOUR = Date.now() - (Date.now() % HOUR_MS);
const DAY_START = NOW_HOUR - (NOW_HOUR % 86_400_000);

function servedBucket(start: number, gateway: string, requests: number): UsageBucket {
  return {
    start,
    tuple: { gateway, virtualModel: 'creative', provider: 'openai', accountId: 'work' },
    measures: {
      requests,
      failed: 1,
      answered: requests,
      durationMsSum: requests * 640,
      tokens: {
        input: requests * 420,
        output: requests * 160,
        cacheRead: requests * 210,
        cacheWrite: 0,
        reasoning: 0,
        total: requests * 790,
      },
    },
  };
}

/**
 * A week of served history: thirty-six hour buckets across two gateways, and a day of spend.
 *
 * @summary The usage screen and a whole-window capture read the same week, so a figure that moves
 * in one moves in the other.
 */
export const servedReport: UsageReport = {
  range: '7d',
  bucketWidth: 'hour',
  buckets: Array.from({ length: 36 }, (_unused, hour) =>
    servedBucket(
      NOW_HOUR - (36 - hour) * HOUR_MS,
      hour % 5 === 0 ? 'backup' : 'relay',
      3 + (hour % 7),
    ),
  ),
  dayCosts: [
    {
      dayStart: DAY_START,
      tuple: { gateway: 'relay', accountKind: 'api-key' },
      billedMicroDollars: 1_920_000,
    },
    {
      dayStart: DAY_START,
      tuple: { gateway: 'relay', accountKind: 'subscription' },
      equivalentMicroDollars: 804_000,
    },
  ],
  priceMisses: [],
  pricing: { source: 'bundled' },
};
