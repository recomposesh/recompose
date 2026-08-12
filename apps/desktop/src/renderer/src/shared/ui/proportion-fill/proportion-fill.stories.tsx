import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { ProportionFill } from '../index';

const meta = preview.meta({
  component: ProportionFill,
  args: {
    label: 'Window burn against the record',
    value: 0.62,
  },
  decorators: [
    (Story) => (
      <div className="w-64">
        <Story />
      </div>
    ),
  ],
});

/** A burn standing at about two thirds, read by assistive tech through the meter role. */
export const PartWayAlong = meta.story({
  play: async ({ canvas }) => {
    const gauge = await canvas.findByRole('meter', { name: 'Window burn against the record' });

    await expect(gauge).toHaveAttribute('aria-valuenow', '0.62');
  },
});

/** The record standing as a marker line on a fixed track, so a new record never rescales history. */
export const WithTheRecordMarked = meta.story({
  args: { marker: 0.8 },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('meter', { name: 'Window burn against the record' }),
    ).toBeVisible();
  },
});

/** A quiet track reads zero rather than hiding, the posture every live surface keeps. */
export const Quiet = meta.story({
  args: { value: 0 },
  play: async ({ canvas }) => {
    const gauge = await canvas.findByRole('meter', { name: 'Window burn against the record' });

    await expect(gauge).toHaveAttribute('aria-valuenow', '0');
  },
});
