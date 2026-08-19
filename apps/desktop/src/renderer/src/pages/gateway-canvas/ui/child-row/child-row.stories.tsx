import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { boundRow, branchRow, elseRow, ladderRowOf } from '../../testing/router-child.testkit';
import { ChildRow } from './child-row';

const meta = preview.meta({
  component: ChildRow,
  args: { onOpen: () => {}, row: ladderRowOf(boundRow, 2) },
  decorators: [
    (Story) => (
      <ul className="mx-auto my-4 w-80 field-box p-px">
        <Story />
      </ul>
    ),
  ],
});

/**
 * One row of a failover ladder: its rank, what it binds, and the controls that reorder it.
 *
 * @summary The move buttons rest out of sight until the row is hovered or focused, so the reading
 * is that they exist and answer to the row's own name rather than that they are on screen.
 */
export const Basic = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('2')).toBeVisible();
    await expect(
      await canvas.findByRole('button', { name: 'Move Work key up' }),
    ).toBeInTheDocument();
  },
});

/** A branch leads with the word the judge answers with, and counts what it holds under it. */
export const ABranchRow = meta.story({
  args: { row: ladderRowOf(branchRow, 1) },
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByText('code')).toBeVisible();
    await expect(await canvas.findByText('3 pinned')).toBeVisible();
    await expect(canvasElement.querySelectorAll('[data-rank]')).toHaveLength(0);
  },
});

/** The else row keeps its face and its reason, and offers no way to move or leave. */
export const AHeldRow = meta.story({
  args: { row: ladderRowOf(elseRow, 3) },
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByText(/keeps an else branch/)).toBeVisible();
    await expect(canvasElement.querySelectorAll('[data-drag-handle]')).toHaveLength(0);
  },
});

/** The rows in the dark scheme, where the label column has to hold against the box. */
export const DarkScheme = meta.story({
  args: { row: ladderRowOf(branchRow, 1) },
  globals: { theme: 'dark' },
});
