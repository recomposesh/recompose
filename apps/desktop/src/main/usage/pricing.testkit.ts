import type { UsageBucket } from '@recompose/contracts';

const DAY_START = 1_754_524_800_000;

export type BucketStanding = {
  accountKind?: UsageBucket['tuple']['accountKind'];
  provider?: string | undefined;
  providerModel?: string | undefined;
  tokens?: Partial<UsageBucket['measures']['tokens']>;
  requests?: number;
  contextOverTokens?: number;
};

function servedNamesOf(
  standing: BucketStanding,
): Pick<UsageBucket['tuple'], 'provider' | 'providerModel'> {
  const provider = 'provider' in standing ? standing.provider : 'anthropic';
  const providerModel = 'providerModel' in standing ? standing.providerModel : 'claude-sonnet-4-5';

  return {
    ...(provider === undefined ? {} : { provider }),
    ...(providerModel === undefined ? {} : { providerModel }),
  };
}

function aTupleOf(standing: BucketStanding): UsageBucket['tuple'] {
  return {
    gateway: 'relay',
    virtualModel: 'creative',
    ...servedNamesOf(standing),
    accountId: 'work',
    accountKind: standing.accountKind ?? 'api-key',
    ...(standing.contextOverTokens === undefined
      ? {}
      : { contextOverTokens: standing.contextOverTokens }),
  };
}

export function aDay(standing: BucketStanding = {}): UsageBucket {
  const requests = standing.requests ?? 4;

  return {
    start: DAY_START,
    tuple: aTupleOf(standing),
    measures: {
      requests,
      failed: 0,
      answered: requests,
      durationMsSum: 4_000,
      tokens: {
        input: 1_000_000,
        output: 100_000,
        cacheRead: 0,
        cacheWrite: 0,
        reasoning: 0,
        total: 1_100_000,
        ...standing.tokens,
      },
    },
  };
}
