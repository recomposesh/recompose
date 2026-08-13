import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { RangeCalendar } from './range-calendar';

const AUGUST = new Date(2026, 7, 1).getTime();
const DAY = 86_400_000;

const meta = preview.meta({
  component: RangeCalendar,
  args: {
    month: AUGUST,
    onMonthChange: () => {},
    window: { from: AUGUST + 4 * DAY, to: AUGUST + 11 * DAY },
    onDayPress: () => {},
    spanWording: 'Aug 5, 2026 12:00 – Aug 12, 2026 12:00',
  },
  decorators: [
    (Story) => (
      <div className="w-110 rounded-card border border-line-subtle bg-surface-card">
        <Story />
      </div>
    ),
  ],
});

/** Two months side by side, both edges marked and the days between them tinted. */
export const AWindowDrawn = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('grid', { name: /August 2026/ })).toBeVisible();
    await expect(await canvas.findByText('September 2026')).toBeVisible();
  },
});

/** A single day still reads as a window, opening and closing on itself. */
export const OneDay = meta.story({
  args: { window: { from: AUGUST + 4 * DAY, to: AUGUST + 4 * DAY } },
});
