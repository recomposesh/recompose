import type { ChartSeries } from './series-chart';

/**
 * The three token series in the theme's own series tokens.
 *
 * @summary The mapping from a token split to its paint is design-system knowledge, so it lives
 * beside the chart once and the page and every story read the same set.
 */
export const tokenChartSeries: readonly ChartSeries[] = [
  { key: 'input', label: 'Input', fill: 'var(--color-series-input)' },
  { key: 'cached', label: 'Cached', fill: 'var(--color-series-cached)' },
  { key: 'output', label: 'Output', fill: 'var(--color-series-output)' },
];

const CATEGORICAL_SCALE: readonly string[] = [
  'var(--color-series-slot-1)',
  'var(--color-series-slot-2)',
  'var(--color-series-slot-3)',
  'var(--color-series-slot-4)',
  'var(--color-series-slot-5)',
];

const REST_FILL = 'var(--color-series-rest)';
const REST_LABEL = 'Other';

function freeRestKey(members: readonly string[]): string {
  const taken = new Set(members);
  let key = 'rest';

  while (taken.has(key)) {
    key = `${key}-`;
  }

  return key;
}

/**
 * The paint for a breakdown drawn by member rather than by token split.
 *
 * @summary The scale holds five slots, so a longer ranking folds its tail under one named rest
 * instead of running out of paint. The fold key steps aside when a member already answers to it,
 * because a member merging into the rest unseen would read as a smaller share than it served.
 * Members arrive in rank order and keep it, so the same member wears the same slot in every panel
 * of one window.
 */
export function rankedChartSeries(members: readonly string[]): readonly ChartSeries[] {
  const painted = CATEGORICAL_SCALE.flatMap((fill, place) => {
    const member = members[place];

    return member === undefined ? [] : [{ key: member, label: member, fill }];
  });

  if (members.length <= CATEGORICAL_SCALE.length) {
    return painted;
  }

  return [...painted, { key: freeRestKey(members), label: REST_LABEL, fill: REST_FILL }];
}
