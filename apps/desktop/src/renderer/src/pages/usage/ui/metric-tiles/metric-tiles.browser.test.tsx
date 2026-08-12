import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import type { MetricFaces } from '../../lib/usage-faces';

import { MetricTiles } from './metric-tiles';

const faces: MetricFaces = {
  requests: { reading: '1,204', detail: '+12% vs prev 24h' },
  errors: { reading: '3', detail: '0.2% of requests' },
  latency: { reading: '840ms', detail: 'average' },
  tokens: { reading: '45.1M', detail: '38% cached' },
  spend: { reading: '$1.92', detail: 'today so far' },
};

test('the five readings headline the window, each with the line qualifying it', async () => {
  const screen = await render(<MetricTiles faces={faces} />);

  await expect.element(screen.getByRole('region', { name: 'Window readings' })).toBeVisible();
  await expect.element(screen.getByText('1,204')).toBeVisible();
  await expect.element(screen.getByText('+12% vs prev 24h')).toBeVisible();
  await expect.element(screen.getByText('0.2% of requests')).toBeVisible();
  await expect.element(screen.getByText('38% cached')).toBeVisible();
  await expect.element(screen.getByText('today so far')).toBeVisible();
});

test('the tiles read the window rather than choosing what the chart draws', async () => {
  const screen = await render(<MetricTiles faces={faces} />);

  expect(screen.container.querySelector('[role="radio"]')).toBeNull();
});

test('a face with nothing to qualify it prints the figure alone', async () => {
  const screen = await render(<MetricTiles faces={{ ...faces, requests: { reading: '1,204' } }} />);

  await expect.element(screen.getByText('1,204')).toBeVisible();
  await expect.element(screen.getByText('+12% vs prev 24h')).not.toBeInTheDocument();
});
