import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { onASurface } from '../../testing/on-a-surface';
import { SetupProgress } from './setup-progress';

const meta = preview.meta({
  component: SetupProgress,
  args: { step: 'harnesses' as const },
  decorators: [onASurface],
});

function marked(canvasElement: HTMLElement): readonly string[] {
  return [...canvasElement.querySelectorAll('[aria-current="step"]')].map(
    (beat) => beat.textContent,
  );
}

/** Five beats, with the first one marked as the turn a person stands on. */
export const FirstBeat = meta.story({
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByRole('list', { name: 'Setup progress' })).toBeVisible();
    await expect(canvasElement.querySelectorAll('li')).toHaveLength(5);
    await expect(marked(canvasElement)).toEqual(['harnesses']);
  },
});

/** Building marks the same beat as composing, because the two are one turn. */
export const BuildingMarksTheComposeBeat = meta.story({
  args: { step: 'building' as const },
  play: async ({ canvasElement }) => {
    await expect(marked(canvasElement)).toEqual(['compose']);
  },
});

/** The welcome step marks nothing, because it asks for nothing. */
export const WelcomeMarksNothing = meta.story({
  args: { step: 'welcome' as const },
  play: async ({ canvasElement }) => {
    await expect(marked(canvasElement)).toEqual([]);
  },
});
