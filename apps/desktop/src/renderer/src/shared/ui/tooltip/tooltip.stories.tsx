import { expect, userEvent, waitFor } from 'storybook/test';

import preview from '#.storybook/preview';

import { Icon } from '../icon/icon';
import { Tooltip } from './tooltip';

const control = (
  <button
    className="flex size-hit-target items-center justify-center rounded-control focus-ring text-ink-secondary hover:bg-surface-hover active:bg-surface-pressed"
    type="button"
  >
    <Icon className="size-4" name="panel-right" />
  </button>
);

type TriggerCanvas = {
  findByRole: (role: string, options: { name: string }) => Promise<HTMLElement>;
};

/**
 * Rest on the control and wait for its reading to stand on screen.
 *
 * @summary The wait is what the reading needs rather than what the assertion needs: the tooltip
 * holds its own delay before it opens, so a story that hovers and returns paints a control with
 * nothing beside it.
 */
async function theReadingComesUp(canvas: TriggerCanvas): Promise<void> {
  await userEvent.hover(await canvas.findByRole('button', { name: 'Inspector' }));

  await waitFor(async () => {
    await expect(document.body).toHaveTextContent('Inspector');
  });
}

const meta = preview.meta({
  component: Tooltip,
  args: { children: control, label: 'Inspector' },
  decorators: [
    (Story) => (
      <div className="flex items-center justify-center p-12">
        <Story />
      </div>
    ),
  ],
});

/**
 * The control at rest, which keeps its reading out of the way until a person asks.
 *
 * @summary The reading asks for the accessible name too, because the glyph is decorative and the
 * one string the tooltip prints is the same string a screen reader answers to.
 */
export const Resting = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: 'Inspector' })).toBeVisible();
    await expect(canvas.queryByText('Inspector')).not.toBeInTheDocument();
  },
});

/** Resting on the glyph prints what it does, in the words the control already answers to. */
export const Rested = meta.story({
  play: async ({ canvas }) => {
    await theReadingComesUp(canvas);
  },
});

/**
 * A control whose machinery has not landed, which names what it waits for.
 *
 * @summary A dead control that says nothing reads as broken, so the reading carries the waiting,
 * and the sentence beyond the name reads as the control's description rather than a second name.
 */
export const Waiting = meta.story({
  args: { note: 'Waits on the guide.' },
  play: async ({ canvas }) => {
    const asked = await canvas.findByRole('button', { name: 'Inspector' });

    await userEvent.hover(asked);

    await expect(asked).toHaveAccessibleDescription('Waits on the guide.');

    await waitFor(async () => {
      await expect(document.body).toHaveTextContent('Inspector. Waits on the guide.');
    });
  },
});

/** The same reading in the dark scheme, where the raised surface has to keep its edge. */
export const DarkScheme = meta.story({
  globals: { theme: 'dark' },
  play: async ({ canvas }) => {
    await theReadingComesUp(canvas);
  },
});
