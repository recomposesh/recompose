import { expect, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';

import type { PanelRow } from './breakdown-panel';

import { BreakdownPanel } from './breakdown-panel';

const rows: readonly PanelRow[] = [
  { key: 'claude-code', name: 'claude-code', requests: '6,120', tokens: '18.4M', share: 1 },
  { key: 'cursor', name: 'cursor', requests: '3,240', tokens: '9.7M', share: 0.53 },
  { key: 'api-playground', name: 'api-playground', requests: '2,100', tokens: '6.3M', share: 0.34 },
  { key: 'raycast', name: 'raycast', requests: '1,020', tokens: '3.1M', share: 0.17 },
];

const meta = preview.meta({
  component: BreakdownPanel,
  args: { title: 'By gateway', rows, unit: 'requests' as const, onUnitChange: () => {} },
  decorators: [
    (Story) => (
      <div className="flex w-96">
        <Story />
      </div>
    ),
  ],
});

/** One dimension folded out of the window, counted in requests. */
export const ByRequests = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('6,120')).toBeVisible();
  },
});

/** The same fold, reprinted in tokens rather than fetched again. */
export const ByTokens = meta.story({
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('radio', { name: 'Tokens' }));
  },
});

/** Traffic that never reached the dimension keeps its measures under a named absence. */
export const WithAnAbsence = meta.story({
  args: {
    rows: [
      ...rows,
      { key: undefined, name: 'Direct traffic', requests: '12', tokens: '0', share: 0.01 },
    ],
  },
});
