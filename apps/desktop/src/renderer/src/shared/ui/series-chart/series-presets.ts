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
