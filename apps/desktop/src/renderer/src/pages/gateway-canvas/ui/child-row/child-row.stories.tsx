import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { panelBounds } from '../../../../shared/lib';
import { fitsItsPane, narrowed, paintedBox } from '../../../../shared/testing';
import { boundRow, branchRow, elseRow, ladderRowOf } from '../../testing/router-child.testkit';
import { ChildRow } from './child-row';

const meta = preview.meta({
  component: ChildRow,
  args: { onOpen: () => {}, row: ladderRowOf(boundRow, 2) },
  decorators: [
    (Story) => (
      <ul className="mx-auto my-4 w-80 field-box p-px" data-pane="">
        <Story />
      </ul>
    ),
  ],
});

function lineAt(canvasElement: HTMLElement, mark: string): Element {
  const held = canvasElement.querySelector(mark);

  if (held === null) {
    throw new Error(`the row printed no ${mark} line`);
  }

  return held;
}

/**
 * Whether the facts a row carries each start below the one above it.
 *
 * @summary A line that shares a box top with the line before it is a line standing beside it, which
 * is the crammed reading the stacking replaced, so the check reads geometry rather than markup.
 */
function stacked(canvasElement: HTMLElement, marks: readonly string[]): boolean {
  const boxes = marks.map((mark) => paintedBox(lineAt(canvasElement, mark)));

  return boxes.every((box, place) => place === 0 || box.top >= (boxes[place - 1]?.bottom ?? 0));
}

const BRANCH_LINES = ['[data-branch-label]', '[data-rule-preview]', '[data-child-name]'];

const ELSE_LINES = ['[data-branch-label]', '[data-else-reason]', '[data-child-name]'];

function narrowedToTheSmallestInspector(canvasElement: HTMLElement): Element {
  const pane = lineAt(canvasElement, '[data-pane]');

  narrowed(pane, panelBounds.inspector.min);

  return pane;
}

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

/**
 * The label with its tally, the rule, and the destination each take a line of their own.
 *
 * @summary Three facts side by side truncate each other away at the width the inspector actually
 * stands at, so the row stacks them and every one reads whole.
 */
export const ABranchStacksItsFacts = meta.story({
  args: { row: ladderRowOf(branchRow, 1) },
  play: async ({ canvasElement }) => {
    await expect(stacked(canvasElement, BRANCH_LINES)).toBe(true);
  },
});

/** The else row wears the same three lines: its title, its reason, and what it catches with. */
export const TheElseRowStacksTheSameWay = meta.story({
  args: { row: ladderRowOf(elseRow, 3) },
  play: async ({ canvasElement }) => {
    await expect(stacked(canvasElement, ELSE_LINES)).toBe(true);
  },
});

/** At the narrowest the inspector goes, the row still holds every line inside its own box. */
export const NothingCramsAtTheNarrowestInspector = meta.story({
  args: { row: ladderRowOf(branchRow, 1) },
  play: async ({ canvasElement }) => {
    const pane = narrowedToTheSmallestInspector(canvasElement);

    await expect(fitsItsPane(pane)).toBe(true);
    await expect(stacked(canvasElement, BRANCH_LINES)).toBe(true);
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
