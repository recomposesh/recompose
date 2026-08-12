import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { RetentionConfirmation } from './retention-confirmation';

const meta = preview.meta({
  component: RetentionConfirmation,
});

/** The shorter window holds until the person accepts the history it drops. */
export const AShorteningAwaitsItsAnswer = meta.story({
  render: () => <RetentionConfirmation days={7} onCancel={() => {}} onConfirm={() => {}} />,
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('heading', { name: 'Drop older usage history?' }),
    ).toBeVisible();
    await expect(await canvas.findByText(/drops usage older than 7 days for good/)).toBeVisible();
    await expect(await canvas.findByRole('button', { name: 'Drop history' })).toBeVisible();
  },
});

/** While no change waits, nothing stands. */
export const NothingWaiting = meta.story({
  render: () => <RetentionConfirmation days={undefined} onCancel={() => {}} onConfirm={() => {}} />,
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('dialog')).toBeNull();
  },
});
