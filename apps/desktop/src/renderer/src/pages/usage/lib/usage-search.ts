const USAGE_SEARCH_RANGES = ['1h', '24h', '7d', '30d'] as const;

export type UsageSearchRange = (typeof USAGE_SEARCH_RANGES)[number];

const USAGE_METRICS = ['requests', 'errors', 'latency', 'tokens', 'spend'] as const;

export type UsageMetric = (typeof USAGE_METRICS)[number];

export const SCOPE_LEVELS = [
  'gateway',
  'virtualModel',
  'providerModel',
  'provider',
  'account',
] as const;

export type ScopeLevel = (typeof SCOPE_LEVELS)[number];

export type UsageScope = Partial<Record<ScopeLevel, string>>;

export type UsageSearch = UsageScope & {
  range: UsageSearchRange;
  metric: UsageMetric;
};

export type StandingScopeLevel = { level: ScopeLevel; value: string };

function oneOf<Value extends string>(
  raw: unknown,
  vocabulary: readonly Value[],
  fallback: Value,
): Value {
  return vocabulary.find((value) => value === raw) ?? fallback;
}

function standingLevels(raw: Record<string, unknown>): UsageScope {
  return SCOPE_LEVELS.reduce<UsageScope>((scope, level) => {
    const value = raw[level];

    return typeof value === 'string' && value !== '' ? { ...scope, [level]: value } : scope;
  }, {});
}

/**
 * The typed view the address carries, with junk dropped rather than carried.
 *
 * @summary The address is the whole view: range, metric, and one optional param per hierarchy
 * level. Anything the vocabulary does not know falls back to the default landing view, so a
 * hand-edited or stale address still lands somewhere honest.
 */
export function usageSearchFrom(raw: Record<string, unknown>): UsageSearch {
  return {
    range: oneOf(raw['range'], USAGE_SEARCH_RANGES, '24h'),
    metric: oneOf(raw['metric'], USAGE_METRICS, 'requests'),
    ...standingLevels(raw),
  };
}

/** The standing scope levels in drill order, gateway first and account last. */
export function narrowedScope(search: UsageSearch): readonly StandingScopeLevel[] {
  return SCOPE_LEVELS.flatMap((level) => {
    const value = search[level];

    return value === undefined ? [] : [{ level, value }];
  });
}

/**
 * The range spend draws at, which is a day width or the nearest one.
 *
 * @summary Cost exists at day width only, so selecting the spend tile snaps a sub-day range to
 * `7d` and leaves a standing day-width range alone.
 */
export function spendSnappedRange(range: UsageSearchRange): UsageSearchRange {
  return range === '1h' || range === '24h' ? '7d' : range;
}
