import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import type { PanelRow, PanelUnit } from './breakdown-panel';

import { BreakdownPanel } from './breakdown-panel';

const rows: readonly PanelRow[] = [
  { key: 'claude-code', name: 'claude-code', requests: '6,120', tokens: '18.4M', share: 1 },
  { key: 'cursor', name: 'cursor', requests: '3,240', tokens: '9.1M', share: 0.53 },
  { key: undefined, name: 'No gateway', requests: '4', tokens: '0', share: 0.01 },
];

function panel(over: Partial<Parameters<typeof BreakdownPanel>[0]> = {}) {
  const props = {
    onUnitChange: () => {},
    rows,
    title: 'By gateway',
    unit: 'requests' as const,
    ...over,
  };

  return (
    <BreakdownPanel
      onUnitChange={props.onUnitChange}
      rows={props.rows}
      title={props.title}
      unit={props.unit}
    />
  );
}

test('every row prints its name, its figure, and a share meter beside them', async () => {
  const screen = await render(panel());

  await expect.element(screen.getByRole('region', { name: 'By gateway' })).toBeVisible();
  await expect.element(screen.getByText('claude-code')).toBeVisible();
  await expect.element(screen.getByText('6,120')).toBeVisible();
  await expect
    .element(screen.getByRole('meter', { name: 'claude-code share' }))
    .toHaveAttribute('aria-valuenow', '1');
});

test('the unit control reprints the same fold in tokens', async () => {
  const screen = await render(panel({ unit: 'tokens' }));

  await expect.element(screen.getByText('18.4M')).toBeVisible();
  await expect.element(screen.getByText('6,120')).not.toBeInTheDocument();
});

test('picking a unit hands it back rather than fetching another fold', async () => {
  const onUnitChange = vi.fn<(unit: PanelUnit) => void>();
  const screen = await render(panel({ onUnitChange }));

  await screen.getByRole('radio', { name: 'Tokens' }).click();

  expect(onUnitChange).toHaveBeenCalledWith('tokens');
});

test('traffic that never reached the dimension still reads, under a printed absence', async () => {
  const screen = await render(panel());

  await expect.element(screen.getByText('No gateway')).toBeVisible();
});
