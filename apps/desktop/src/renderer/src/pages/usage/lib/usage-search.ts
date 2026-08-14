const USAGE_SEARCH_RANGES = [
  '1h',
  '24h',
  '7d',
  '30d',
  'this-week',
  'this-month',
  'custom',
] as const;

export type UsageSearchRange = (typeof USAGE_SEARCH_RANGES)[number];

export type PresetRange = Exclude<UsageSearchRange, 'custom'>;

const CHART_MEASURES = ['requests', 'tokens', 'latency', 'spend'] as const;

export type ChartMeasure = (typeof CHART_MEASURES)[number];

const TILE_METRICS = ['requests', 'errors', 'latency', 'tokens', 'spend'] as const;

export type UsageMetric = (typeof TILE_METRICS)[number];

const STACK_DIMENSIONS = ['gateway', 'virtualModel', 'provider', 'account'] as const;

export type StackDimension = (typeof STACK_DIMENSIONS)[number];

const FILTER_LEVELS = ['gateways', 'providers'] as const;

export type FilterLevel = (typeof FILTER_LEVELS)[number];

type UsageFilters = Partial<Record<FilterLevel, readonly string[]>>;

/**
 * The typed view one address stands for.
 *
 * @summary A provider is a connected account, which is what the sidebar and the catalog both call
 * one, so the providers filter carries account ids. A custom window carries both of its edges or
 * the range is not custom at all.
 */
export type UsageSearch = UsageFilters & {
  range: UsageSearchRange;
  metric: ChartMeasure;
  stackedBy: StackDimension;
  from?: number;
  to?: number;
};

export type StandingFilter = { level: FilterLevel; values: readonly string[] };

function oneOf<Value extends string>(
  raw: unknown,
  vocabulary: readonly Value[],
  fallback: Value,
): Value {
  return vocabulary.find((value) => value === raw) ?? fallback;
}

function namedMembers(raw: unknown): readonly string[] {
  const listed = Array.isArray(raw) ? raw : [raw];

  return listed.filter((one): one is string => typeof one === 'string' && one !== '');
}

function standingFilters(raw: Record<string, unknown>): UsageFilters {
  return FILTER_LEVELS.reduce<UsageFilters>((filters, level) => {
    const members = namedMembers(raw[level]);

    return members.length === 0 ? filters : { ...filters, [level]: members };
  }, {});
}

function wholeInstant(raw: unknown): number | undefined {
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined;
}

type CustomWindow = { range: 'custom'; from: number; to: number } | { range: UsageSearchRange };

function windowFrom(raw: Record<string, unknown>, range: UsageSearchRange): CustomWindow {
  if (range !== 'custom') {
    return { range };
  }

  const from = wholeInstant(raw['from']);
  const to = wholeInstant(raw['to']);

  if (from === undefined || to === undefined || from >= to) {
    return { range: '24h' };
  }

  return { range: 'custom', from, to };
}

/**
 * The typed view the address carries, with junk dropped rather than carried.
 *
 * @summary The address is the whole view: the window, the chart's measure and stack, and one
 * optional member list per filter. Anything the vocabulary does not know falls back to the default
 * landing view, so a hand-edited or stale address still lands somewhere honest.
 */
export function usageSearchFrom(raw: Record<string, unknown>): UsageSearch {
  return {
    ...windowFrom(raw, oneOf(raw['range'], USAGE_SEARCH_RANGES, '24h')),
    metric: oneOf(raw['metric'], CHART_MEASURES, 'requests'),
    stackedBy: oneOf(raw['stackedBy'], STACK_DIMENSIONS, 'gateway'),
    ...standingFilters(raw),
  };
}

/** The members one filter stands on, empty when it stands on everything. */
export function filteredMembers(search: UsageSearch, level: FilterLevel): readonly string[] {
  return search[level] ?? [];
}

/**
 * The same view over another range, without the edges only a drawn window stands on.
 *
 * @summary A drawn window is the one range that carries edges, so moving onto any other range
 * drops them rather than leaving a stale pair behind for the next drawing to inherit.
 */
export function withRange(search: UsageSearch, range: UsageSearchRange): UsageSearch {
  const { from: _from, to: _to, ...kept } = search;

  return { ...kept, range };
}

/** The same view with one filter standing on everything again. */
export function withoutFilter(search: UsageSearch, level: FilterLevel): UsageSearch {
  const { [level]: _dropped, ...kept } = search;

  return kept;
}

/** The standing filters in reading order, gateways first. */
export function narrowedScope(search: UsageSearch): readonly StandingFilter[] {
  return FILTER_LEVELS.flatMap((level) => {
    const values = search[level];

    return values === undefined ? [] : [{ level, values }];
  });
}

/**
 * The range spend draws at, which is a day width or the nearest one.
 *
 * @summary Cost exists at day width only, so selecting the spend measure snaps a sub-day preset to
 * `7d`. A custom window spans whatever it spans and keeps its edges.
 */
export function spendSnappedRange(range: UsageSearchRange): UsageSearchRange {
  return range === '1h' || range === '24h' ? '7d' : range;
}
