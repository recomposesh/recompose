import { expect, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';

import { ConsequenceDialog } from './consequence-dialog';

const meta = preview.meta({
  component: ConsequenceDialog,
});

/** The change waits behind its named cost until the person answers. */
export const AwaitingTheAnswer = meta.story({
  render: () => (
    <ConsequenceDialog
      confirmLabel="Drop history"
      heading="Drop older usage history?"
      onCancel={() => {}}
      onConfirm={() => {}}
      open
    >
      Shortening retention drops older usage for good.
    </ConsequenceDialog>
  ),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('heading', { name: 'Drop older usage history?' }),
    ).toBeVisible();
    await expect(await canvas.findByRole('button', { name: 'Drop history' })).toBeVisible();
    await expect(await canvas.findByRole('button', { name: 'Cancel' })).toBeVisible();
  },
});

/** Each act reaches the seam it names. */
export const AnsweredEitherWay = meta.story({
  render: () => (
    <ConsequenceDialog
      confirmLabel="Proceed"
      heading="Proceed?"
      onCancel={() => {}}
      onConfirm={() => {}}
      open
    >
      A cost worth naming.
    </ConsequenceDialog>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Proceed' }));
    await expect(await canvas.findByRole('button', { name: 'Cancel' })).toBeVisible();
  },
});

/** While no change waits, nothing stands. */
export const NothingWaiting = meta.story({
  render: () => (
    <ConsequenceDialog
      confirmLabel="Proceed"
      heading="Proceed?"
      onCancel={() => {}}
      onConfirm={() => {}}
      open={false}
    >
      A cost worth naming.
    </ConsequenceDialog>
  ),
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('dialog')).toBeNull();
  },
});
