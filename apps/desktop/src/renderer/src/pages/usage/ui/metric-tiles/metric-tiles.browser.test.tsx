import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import type { MetricFaces } from './metric-tiles';

import { MetricTiles } from './metric-tiles';

const faces: MetricFaces = {
  requests: { reading: '1,204' },
  errors: { reading: '3' },
  latency: { reading: '840ms', detail: 'average' },
  tokens: { reading: '45.1M', detail: '38% cached' },
  spend: { reading: '$1.92', detail: 'today so far' },
};

test('the five tiles stand as one radio group with their faces printed', async () => {
  const screen = await render(
    <MetricTiles faces={faces} metric="requests" onMetricChange={() => {}} />,
  );

  await expect.element(screen.getByRole('radiogroup', { name: 'Chart metric' })).toBeVisible();
  await expect.element(screen.getByRole('radio', { name: /Requests/ })).toBeChecked();
  await expect.element(screen.getByRole('radio', { name: /Tokens/ })).not.toBeChecked();
  await expect.element(screen.getByText('38% cached')).toBeVisible();
  await expect.element(screen.getByText('today so far')).toBeVisible();
});

test('picking a tile hands the choice up rather than keeping it', async () => {
  const onMetricChange = vi.fn<(metric: string) => void>();
  const screen = await render(
    <MetricTiles faces={faces} metric="requests" onMetricChange={onMetricChange} />,
  );

  await screen.getByRole('radio', { name: /Spend/ }).click();

  expect(onMetricChange).toHaveBeenCalledWith('spend');
});

test('the latency face names its statistic', async () => {
  const screen = await render(
    <MetricTiles faces={faces} metric="latency" onMetricChange={() => {}} />,
  );

  const latency = screen.getByRole('radio', { name: /Latency/ });

  await expect.element(latency).toBeChecked();
  await expect.element(screen.getByText('average')).toBeVisible();
});
