import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { panelBounds } from '../../../../shared/lib';
import { fitsItsPane, narrowed, paintedBox, paintedStyle } from '../../../../shared/testing';
import {
  boundRow,
  branchRow,
  chatRow,
  elseRow,
  ladderRowOf,
  unwordedRow,
} from '../../testing/router-child.testkit';
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

function inkAt(canvasElement: HTMLElement, mark: string): string {
  return paintedStyle(lineAt(canvasElement, mark)).color;
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

/** A branch leads with the word the judge answers with rather than with a rank. */
export const AWordedBranch = meta.story({
  args: { row: ladderRowOf(chatRow, 1) },
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByText('chat')).toBeVisible();
    await expect(await canvas.findByText('everyday conversation')).toBeVisible();
    await expect(canvasElement.querySelectorAll('[data-rank]')).toHaveLength(0);
    await expect(canvasElement.querySelectorAll('[data-pin-tally]')).toHaveLength(0);
  },
});

/** A branch holding conversations counts them beside its own word. */
export const APinnedBranch = meta.story({
  args: { row: ladderRowOf(branchRow, 1) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('code')).toBeVisible();
    await expect(await canvas.findByText('3 pinned')).toBeVisible();
  },
});

/**
 * A branch nobody has worded asks for its words in the attention ink.
 *
 * @summary It is the one row standing between a person and a switch they cannot save, so the row
 * that owes something reads differently from the rows that do not.
 */
export const AnUnwordedBranch = meta.story({
  args: { row: ladderRowOf(unwordedRow, 1) },
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByText('Needs a rule')).toBeVisible();
    await expect(inkAt(canvasElement, '[data-branch-label]')).not.toBe(
      inkAt(canvasElement, '[data-child-name]'),
    );
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

/** A worded branch in the dark scheme, where its three lines have to separate from the box. */
export const AWordedBranchInDarkScheme = meta.story({
  args: { row: ladderRowOf(chatRow, 1) },
  globals: { theme: 'dark' },
});

/** A pinned branch in the dark scheme, where the tally has to stay quieter than the word. */
export const APinnedBranchInDarkScheme = meta.story({
  args: { row: ladderRowOf(branchRow, 1) },
  globals: { theme: 'dark' },
});

/** An unworded branch in the dark scheme, where the attention ink has to carry. */
export const AnUnwordedBranchInDarkScheme = meta.story({
  args: { row: ladderRowOf(unwordedRow, 1) },
  globals: { theme: 'dark' },
});

/** The else row in the dark scheme, where its reason has to read against the box. */
export const TheElseRowInDarkScheme = meta.story({
  args: { row: ladderRowOf(elseRow, 3) },
  globals: { theme: 'dark' },
});
