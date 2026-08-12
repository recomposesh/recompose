import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import type { BreakdownFace } from './breakdown-table';

import { BreakdownTable } from './breakdown-table';

const rows: readonly BreakdownFace[] = [
  {
    key: 'relay',
    name: 'relay',
    requests: '1,204',
    tokens: '41.2M',
    spend: '$1.92',
    share: 0.9,
    drillable: true,
  },
  {
    key: 'backup',
    name: 'backup',
    requests: '134',
    tokens: '4.1M',
    spend: '$0.20',
    share: 0.1,
    drillable: true,
  },
];

const unattributed: BreakdownFace = {
  key: undefined,
  name: 'No provider reached',
  requests: '2',
  tokens: '0',
  share: 0.01,
  drillable: false,
};

test('every reading prints as text in a named table with a share meter per row', async () => {
  const screen = await render(
    <BreakdownTable
      level="gateway"
      onDrill={() => {}}
      onLevelChange={() => {}}
      rows={rows}
      spendColumn
    />,
  );

  await expect.element(screen.getByRole('table', { name: 'Breakdown' })).toBeInTheDocument();
  await expect.element(screen.getByText('relay')).toBeVisible();
  await expect.element(screen.getByText('1,204')).toBeVisible();
  await expect.element(screen.getByText('$1.92')).toBeVisible();
  await expect.element(screen.getByRole('meter', { name: /relay.*share/ })).toBeInTheDocument();
});

test('the group-by control hands the picked level up', async () => {
  const onLevelChange = vi.fn<(level: string) => void>();
  const screen = await render(
    <BreakdownTable
      level="gateway"
      onDrill={() => {}}
      onLevelChange={onLevelChange}
      rows={rows}
      spendColumn
    />,
  );

  await screen.getByRole('radio', { name: 'Virtual model' }).click();

  expect(onLevelChange).toHaveBeenCalledWith('virtualModel');
});

test('a drillable row offers the drill and hands its key up', async () => {
  const onDrill = vi.fn<(key: string) => void>();
  const screen = await render(
    <BreakdownTable
      level="gateway"
      onDrill={onDrill}
      onLevelChange={() => {}}
      rows={rows}
      spendColumn
    />,
  );

  await screen.getByRole('button', { name: /Drill into relay/ }).click();

  expect(onDrill).toHaveBeenCalledWith('relay');
});

test('a row without the level keeps its measures and offers no drill', async () => {
  const screen = await render(
    <BreakdownTable
      level="provider"
      onDrill={() => {}}
      onLevelChange={() => {}}
      rows={[unattributed]}
      spendColumn={false}
    />,
  );

  await expect.element(screen.getByText('No provider reached')).toBeVisible();
  expect(screen.container.querySelector('button[aria-label^="Drill"]')).toBeNull();
});

test('without a day-wide range the spend column leaves entirely', async () => {
  const screen = await render(
    <BreakdownTable
      level="gateway"
      onDrill={() => {}}
      onLevelChange={() => {}}
      rows={rows}
      spendColumn={false}
    />,
  );

  expect(screen.container.textContent).not.toContain('Spend');
  expect(screen.container.textContent).not.toContain('$1.92');
});
