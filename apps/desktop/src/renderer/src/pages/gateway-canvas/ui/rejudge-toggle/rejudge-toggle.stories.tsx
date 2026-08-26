import { expect, fn } from 'storybook/test';

import { withInspectorPanel } from '#.storybook/inspector-panel';
import preview from '#.storybook/preview';

import { RejudgeToggle } from './rejudge-toggle';

const meta = preview.meta({
  component: RejudgeToggle,
  args: { rejudgeEveryRequest: false, onChangeChecked: fn() },
  decorators: [withInspectorPanel],
});

/**
 * The section is titled by the act its toggle carries out, never by a category.
 *
 * @summary A person reading the panel meets the decision they are about to make rather than a
 * heading they have to translate into one first.
 */
export const Basic = meta.story({
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('heading', { name: 'Re-judge every request' }),
    ).toBeVisible();
    await expect(
      await canvas.findByRole('switch', { name: 'Re-judge every request' }),
    ).not.toBeChecked();
  },
});

/** Resting, one sentence says a conversation stays on the branch it first earned. */
export const RestingSaysTheBranchHolds = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/stays on the branch it first earned/)).toBeVisible();
  },
});

/** Switched on, one sentence says the judge reads every request, and names the turn it judges too. */
export const SwitchedOnSaysTheJudgeReadsEveryRequest = meta.story({
  args: { rejudgeEveryRequest: true },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('switch')).toBeChecked();
    await expect(await canvas.findByText(/picks a branch for every request/)).toBeVisible();
    await expect(await canvas.findByText(/server-held state/)).toBeVisible();
  },
});

/** Moving the toggle asks for the other rhythm, which is a stored edit either way. */
export const MovingItAsksForTheOtherRhythm = meta.story({
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('switch'));

    await expect(args.onChangeChecked).toHaveBeenCalledWith(true);
  },
});

/** The toggle in the dark scheme, where the track and its sentence both have to read. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });

/** Switched on in the dark scheme, where the filled track has to separate from the panel. */
export const SwitchedOnInDarkScheme = meta.story({
  args: { rejudgeEveryRequest: true },
  globals: { theme: 'dark' },
});
