import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { fitsItsPane } from '../../../../shared/testing';
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

/** The rows in the dark scheme, where the selected ring has to hold against the drawer panel. */
export const DarkScheme = meta.story({
  args: { value: 'conditional' },
  globals: { theme: 'dark' },
});
