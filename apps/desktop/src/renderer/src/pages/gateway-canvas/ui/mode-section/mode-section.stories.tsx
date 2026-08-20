import { expect, fn, screen } from 'storybook/test';

import preview from '#.storybook/preview';

import { framedAsDrawerBox } from '../../testing/subject-shell.testkit';
import { ModeSection } from './mode-section';

const resting = {
  leavingFor: undefined,
  askToLeave: fn(),
  onCancel: fn(),
  onConfirm: fn(),
};

const meta = preview.meta({
  component: ModeSection,
  args: {
    childCount: 2,
    mode: 'failover' as const,
    onChangeValue: fn(),
    leaving: resting,
    routerName: 'Failover',
  },
  decorators: [framedAsDrawerBox],
});

/** The three modes, each over the cost of standing in it, with nothing waiting on an answer. */
export const Basic = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('radio', { name: 'Failover' })).toBeChecked();
    await expect(await canvas.findByRole('radio', { name: 'Round-robin' })).toBeVisible();
    await expect(await canvas.findByRole('radio', { name: 'Conditional' })).toBeVisible();
    await expect(screen.queryByRole('dialog')).toBeNull();
  },
});

/** A router holding no child cannot branch, and the conditional row says what it would take. */
export const AChildlessRouterCannotBranch = meta.story({
  args: { childCount: 0 },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('radio', { name: 'Conditional' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await expect(await canvas.findByText(/needs a judge and an else branch/)).toBeVisible();
  },
});

/** Pressing another mode hands the choice back to whoever owns the router. */
export const PressingAModeHandsItBack = meta.story({
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('radio', { name: 'Round-robin' }));

    await expect(args.onChangeValue).toHaveBeenCalledWith('round-robin');
  },
});

/** A switch out of conditional stands its question here, beside the rows that raised it. */
export const AwaySwitchStandsItsQuestion = meta.story({
  args: {
    mode: 'conditional' as const,
    routerName: 'Conditional',
    leaving: { ...resting, leavingFor: 'failover' as const },
  },
  play: async () => {
    await expect(screen.getByRole('dialog')).toHaveTextContent(/labels and rules go/);
  },
});

/** The rows in the dark scheme, where the chosen row has to separate from the ones beside it. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
