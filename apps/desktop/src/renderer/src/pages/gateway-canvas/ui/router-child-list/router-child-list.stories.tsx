import { expect, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';

import type { RouterChild } from './router-child-list';

import { paintedBox, paintedStyle } from '../../../../shared/testing';
import { RouterChildList } from './router-child-list';

const rows: readonly RouterChild[] = [
  { routeNodeId: 'n1', cardId: 'target:fast@n1', name: 'Work key', detail: 'gpt-5' },
  { routeNodeId: 'n2', cardId: 'target:fast@n2', name: 'Claude Max', detail: 'claude-opus-5' },
  { routeNodeId: 'n3', cardId: 'target:fast@n3', name: 'Ollama', detail: 'qwen3' },
];

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
