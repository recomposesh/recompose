import { expect, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';

import { edgeRuleDrawn, hourChartBars, tokenChartSeries } from '../../../../shared/testing';
import { UsageChart } from './usage-chart';

const series = tokenChartSeries;

const bars = hourChartBars(24);

const caption =
  'Last 24 hours · hour buckets · 12,432 tokens total · peak 693 · day boundaries follow UTC';

const meta = preview.meta({
  component: UsageChart,
});

/** The chart, its printed caption, and the folded table twin standing as one figure. */
export const ADayOfTokens = meta.story({
  render: () => (
    <div style={{ width: 640 }}>
      <UsageChart caption={caption} drawn={{ series, bars }} label="Tokens over the last day" />
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('img', { name: 'Tokens over the last day' }),
    ).toBeVisible();
    await expect(await canvas.findByText(/day boundaries follow UTC/)).toBeVisible();

    await userEvent.click(await canvas.findByRole('button', { name: /Data table/ }));

    await expect(
      await canvas.findByRole('table', { name: 'Tokens over the last day' }),
    ).toBeInTheDocument();
  },
});

/** The retention edge marks where retained history begins. */
export const TheRetentionEdge = meta.story({
  render: () => (
    <div style={{ width: 640 }}>
      <UsageChart
        caption={caption}
        drawn={{ series, bars }}
        edgeAt={6}
        label="Tokens over the last day"
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await edgeRuleDrawn(canvasElement);
  },
});
