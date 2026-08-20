import { expect, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';

import type { RouterChild } from './router-child-list';

import { paintedBox, paintedStyle } from '../../../../shared/testing';
import {
  branchRow,
  chatRow,
  elseRow,
  plainRows,
  unruledRow,
} from '../../testing/router-child.testkit';
import { RouterChildList } from './router-child-list';

const rows = plainRows;

const branched: readonly RouterChild[] = [branchRow, chatRow, elseRow];

const HIT_TARGET = 24;

const meta = preview.meta({
  component: RouterChildList,
  args: { mode: 'failover' as const, rows, onMove: () => {}, onOpen: () => {} },
  decorators: [
    (Story) => (
      <div className="w-80 bg-surface-toolbar p-3.5">
        <Story />
      </div>
    ),
  ],
});

/** The failover ladder: a printed rank, the child's name, and the handle that reorders it. */
export const Basic = meta.story({});

/** Under round-robin the same list stands unordered, so no row claims an end that wins. */
export const RoundRobinCarriesNoRank = meta.story({
  args: { mode: 'round-robin' },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('[data-rank]')).toHaveLength(0);
  },
});

/** Every rank prints in one column, so a glance down the ladder reads the order. */
export const TheRankColumnAligns = meta.story({
  play: async ({ canvasElement }) => {
    const cells = [...canvasElement.querySelectorAll('[data-rank]')].map((cell) =>
      paintedBox(cell),
    );
    const edges = new Set(cells.map((cell) => Math.round(cell.x)));
    const widths = new Set(cells.map((cell) => Math.round(cell.width)));

    await expect(cells).toHaveLength(3);
    await expect([...edges]).toHaveLength(1);
    await expect([...widths]).toHaveLength(1);
  },
});

/** Every handle and button keeps the twenty-four pixel target the shipped contract requires. */
export const EveryControlKeepsItsHitTarget = meta.story({
  play: async ({ canvasElement }) => {
    const controls = canvasElement.querySelectorAll('button, [data-drag-handle]');

    await expect(controls.length).toBeGreaterThan(0);

    for (const control of controls) {
      const box = paintedBox(control);

      await expect(box.width).toBeGreaterThanOrEqual(HIT_TARGET);
      await expect(box.height).toBeGreaterThanOrEqual(HIT_TARGET);
    }
  },
});

const conditional = { mode: 'conditional' as const, rows: branched };

const unruled: readonly RouterChild[] = [unruledRow, elseRow];

/** A branch reads by its label, with its rule under the binding and its pinned tally beside it. */
export const BranchesReadByTheirLabel = meta.story({
  args: conditional,
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByText('code')).toBeVisible();
    await expect(await canvas.findByText(/questions about source code/)).toBeVisible();
    await expect(canvasElement.querySelectorAll('[data-rank]')).toHaveLength(0);
  },
});

/** A branch holding conversations says how many, because a pin never tints a cable. */
export const ABranchCountsItsStickyConversations = meta.story({
  args: conditional,
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('3 pinned')).toBeVisible();
  },
});

/** The else row offers no way to move or leave, and says why where a person meets it. */
export const TheElseRowSaysWhyItStays = meta.story({
  args: conditional,
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByText(/keeps an else branch/)).toBeVisible();
    await expect(canvas.queryByRole('button', { name: 'Move Ollama up' })).toBeNull();
    await expect(canvasElement.querySelectorAll('[data-held] [data-drag-handle]')).toHaveLength(0);
  },
});

/** A child bound by cable but never ruled says the judge is never offered it. */
export const AnUnruledBranchRoutesNothing = meta.story({
  args: { mode: 'conditional' as const, rows: unruled },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/No rule yet/)).toBeVisible();
  },
});

/** The branch ladder in the dark scheme, where the label column sits against the box. */
export const ConditionalDarkScheme = meta.story({
  args: conditional,
  globals: { theme: 'dark' },
});

/**
 * The move buttons rest out of sight and reveal the moment keyboard focus reaches one.
 *
 * @summary The row's own name takes the first tab stop, because opening the child it names is what
 * a person reaches for most, so the move controls answer the tab after it.
 */
export const TheMoveButtonsRevealUnderFocus = meta.story({
  play: async ({ canvas }) => {
    const moveUp = await canvas.findByRole('button', { name: 'Move Work key up' });

    await expect(paintedStyle(moveUp).opacity).toBe('0');

    await userEvent.tab();
    await userEvent.tab();

    await expect(document.activeElement).toBe(moveUp);
    await expect(paintedStyle(moveUp).opacity).toBe('1');
  },
});
