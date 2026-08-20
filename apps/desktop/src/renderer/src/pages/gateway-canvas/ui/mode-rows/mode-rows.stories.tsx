import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { fitsItsPane, paintedBox } from '../../../../shared/testing';
import { framedAsDrawerBox } from '../../testing/subject-shell.testkit';
import { ModeRows } from './mode-rows';

const A_SWITCH_WOULD_NEED =
  'Conditional needs a judge and an else branch. Compose one when you add the virtual model.';

const meta = preview.meta({
  component: ModeRows,
  args: { onChangeValue: () => {}, value: 'failover' as const },
  decorators: [framedAsDrawerBox],
});

/** The mode a router stands in, over the two it could move to, each carrying its own cost. */
export const Basic = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('radiogroup', { name: 'Routing mode' })).toBeVisible();
    await expect(await canvas.findByRole('radio', { name: 'Failover' })).toBeChecked();
  },
});

/** Rotation names the prompt cache it costs, which is the reason to weigh it against failover. */
export const RoundRobinSelected = meta.story({
  args: { value: 'round-robin' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('radio', { name: 'Round-robin' })).toBeChecked();
    await expect(await canvas.findByText(/prompt cache hit/)).toBeVisible();
  },
});

/** Judging names the else branch as what catches everything, at the point of choice. */
export const ConditionalSelected = meta.story({
  args: { value: 'conditional' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('radio', { name: 'Conditional' })).toBeChecked();
    await expect(await canvas.findByText(/else branch/)).toBeVisible();
  },
});

/**
 * The step that asks the question opens with every row resting, so nobody answers by default.
 *
 * @summary A preselected row would store a mode the person never chose, which is the whole reason
 * the choice earns a step of its own rather than a strip carrying a default.
 */
export const NothingChosenYet = meta.story({
  args: { value: undefined },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('radio', { name: 'Failover' })).not.toBeChecked();
    await expect(await canvas.findByRole('radio', { name: 'Conditional' })).not.toBeChecked();
  },
});

/**
 * A mode this surface cannot write says what it would need, on the row and in its description.
 *
 * @summary The reason reads as visible text rather than living only in the control's state, so a
 * person who looks at the panel learns the same thing as one who hears it.
 */
export const AModeThatCannotBeWritten = meta.story({
  args: { inertReasons: { conditional: A_SWITCH_WOULD_NEED }, value: 'failover' },
  play: async ({ canvas }) => {
    const held = await canvas.findByRole('radio', { name: 'Conditional' });

    await expect(held).toHaveAttribute('aria-disabled', 'true');
    await expect(held).toHaveAccessibleDescription(/judge and an else branch/);
    await expect(await canvas.findByText(/Compose one when you add/)).toBeVisible();
  },
});

/**
 * No row overflows the narrowest inspector, which is what the stack exists to buy.
 *
 * @summary The strip these rows replace wrapped "Round-robin" onto two lines at this width, since
 * three names split one row between them. A row spans the whole column instead, so a name and its
 * sentence each get the full width and a fourth mode costs the layout nothing.
 */
export const NoModeRowOverflowsTheNarrowestPanel = meta.story({
  play: async ({ canvas }) => {
    for (const name of ['Failover', 'Round-robin', 'Conditional']) {
      await expect(fitsItsPane(await canvas.findByRole('radio', { name }))).toBe(true);
    }
  },
});

/**
 * Every row spans the whole column and starts at the same edge, so no mode reads as the bigger one.
 *
 * The strip these rows replace split one row between three names, which is what made the longest
 * wrap. Measuring both edges is what proves the stack rather than the eye: a row inset by a
 * hair would still look right in a screenshot and still crowd its sentence at this width.
 */
export const EveryModeOwnsAWholeRow = meta.story({
  play: async ({ canvas }) => {
    const stack = paintedBox(await canvas.findByRole('radiogroup', { name: 'Routing mode' }));

    for (const name of ['Failover', 'Round-robin', 'Conditional']) {
      const row = paintedBox(await canvas.findByRole('radio', { name }));

      await expect(Math.round(stack.width - row.width)).toBe(0);
      await expect(Math.round(stack.left - row.left)).toBe(0);
    }
  },
});

/**
 * Each row leads with its own mark, drawn from the marks the canvas already spends on routers.
 *
 * @summary Three names of similar length in one column are read by shape before they are read by
 * word, so the marks are what let a person find the row they meant without parsing all three.
 */
export const EveryModeLeadsWithItsOwnMark = meta.story({
  play: async ({ canvas, canvasElement }) => {
    for (const name of ['Failover', 'Round-robin', 'Conditional']) {
      const row = await canvas.findByRole('radio', { name });
      const mark = row.querySelector('[data-glyph]');

      await expect(mark).not.toBeNull();
      await expect(paintedBox(mark).width).toBe(14);
    }

    const marks = canvasElement.querySelectorAll('[data-glyph]');
    const named = new Set([...marks].map((mark) => mark.getAttribute('data-glyph')));

    await expect(named.size).toBe(marks.length);
  },
});

/** The marks line up down the column, so the names start on one edge rather than three. */
export const TheMarksShareOneEdge = meta.story({
  play: async ({ canvas }) => {
    const lefts = [];

    for (const name of ['Failover', 'Round-robin', 'Conditional']) {
      const row = await canvas.findByRole('radio', { name });

      lefts.push(Math.round(paintedBox(row.querySelector('[data-glyph]')).left));
    }

    await expect(new Set(lefts).size).toBe(1);
  },
});

/** The rows in the dark scheme, where the selected ring has to hold against the drawer panel. */
export const DarkScheme = meta.story({
  args: { value: 'conditional' },
  globals: { theme: 'dark' },
});
