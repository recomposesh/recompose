import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

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

const meta = preview.meta({
  component: BreakdownTable,
});

/** The pivot prints every reading as text, with the share meter as decoration beside it. */
export const ByGateway = meta.story({
  render: () => (
    <BreakdownTable
      level="gateway"
      onDrill={() => {}}
      onLevelChange={() => {}}
      rows={rows}
      spendColumn
    />
  ),
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('table', { name: 'Breakdown' })).toBeInTheDocument();
    await expect(await canvas.findByText('1,204')).toBeVisible();
    await expect(await canvas.findByRole('button', { name: 'Drill into relay' })).toBeVisible();
  },
});
