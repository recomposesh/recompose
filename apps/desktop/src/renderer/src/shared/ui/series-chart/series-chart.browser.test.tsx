import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import type { ChartBar, ChartSeries } from './series-chart';

import { SeriesChart } from './series-chart';

const series: readonly ChartSeries[] = [
  { key: 'input', label: 'Input', fill: 'var(--color-series-input)' },
  { key: 'cached', label: 'Cached', fill: 'var(--color-series-cached)' },
];

const bars: readonly ChartBar[] = [
  { at: 0, label: '09:00', values: { input: 30, cached: 12 } },
  { at: 1, label: '10:00', values: { input: 18, cached: 0 } },
  { at: 2, label: '11:00', values: { input: 9 } },
];

function slicesPainted(container: HTMLElement, paint: string) {
  return [...container.querySelectorAll('rect')].filter(
    (slice) => slice.getAttribute('fill') === paint,
  );
}

test('a series paints no slice for a bucket that holds nothing of it', async () => {
  const screen = await render(
    <div style={{ width: 480 }}>
      <SeriesChart bars={bars} label="Tokens over three hours" series={series} />
    </div>,
  );

  await expect.element(screen.getByRole('img', { name: 'Tokens over three hours' })).toBeVisible();
  await expect
    .poll(() => slicesPainted(screen.container, 'var(--color-series-input)'))
    .toHaveLength(3);
  expect(slicesPainted(screen.container, 'var(--color-series-cached)')).toHaveLength(1);
});

test('the bars arrive still where a reader asked for less motion', async () => {
  const screen = await render(
    <div style={{ width: 480 }}>
      <SeriesChart bars={bars} label="Tokens over three hours" series={series} />
    </div>,
  );

  await expect.element(screen.getByRole('img', { name: 'Tokens over three hours' })).toBeVisible();

  const [arrival] = [...screen.container.querySelectorAll('[data-chart-arrival] rect')];

  expect(arrival).toBeDefined();
  expect(arrival === undefined ? '' : getComputedStyle(arrival).animationName).toBe('none');
});
