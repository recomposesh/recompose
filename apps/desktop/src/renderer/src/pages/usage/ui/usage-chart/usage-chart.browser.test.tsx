import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import type { ChartBar, ChartSeries } from '../../../../shared/ui';

import { UsageChart } from './usage-chart';

const series: readonly ChartSeries[] = [
  { key: 'input', label: 'Input', fill: 'var(--color-series-input)' },
  { key: 'cached', label: 'Cached', fill: 'var(--color-series-cached)' },
];

const bars: readonly ChartBar[] = [
  { at: 0, label: '09:00', values: { input: 30, cached: 20 } },
  { at: 1, label: '10:00', values: { input: 12, cached: 4 } },
];

const caption =
  'Last 24 hours · hour buckets · 66 tokens total · peak 50 · day boundaries follow UTC';

test('the caption states the range, the width, the total, the peak, and the UTC rule', async () => {
  const screen = await render(
    <UsageChart caption={caption} drawn={{ series, bars }} label="Tokens over the last day" />,
  );

  await expect.element(screen.getByText(caption)).toBeVisible();
});

test('the table twin prints every bucket the chart draws as text', async () => {
  const screen = await render(
    <UsageChart caption={caption} drawn={{ series, bars }} label="Tokens over the last day" />,
  );

  await screen.getByRole('button', { name: /Data table/ }).click();

  const table = screen.getByRole('table', { name: /Tokens over the last day/ });

  await expect.element(table).toBeInTheDocument();
  await expect.element(screen.getByRole('cell', { name: '09:00' })).toBeVisible();
  await expect.element(screen.getByRole('cell', { name: '30' })).toBeVisible();
  await expect.element(screen.getByRole('cell', { name: '4' })).toBeVisible();
  await expect.element(screen.getByRole('columnheader', { name: 'Input' })).toBeInTheDocument();
  await expect.element(screen.getByRole('columnheader', { name: 'Cached' })).toBeInTheDocument();
});

test('the twin stays out of the tree until asked for', async () => {
  const screen = await render(
    <UsageChart caption={caption} drawn={{ series, bars }} label="Tokens over the last day" />,
  );

  expect(screen.container.querySelector('table')).toBeNull();
});
