import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { inACard } from '../../testing/on-a-surface';
import { JobRow } from './job-row';

const gateway = {
  id: 'gateway',
  title: 'Creating your gateway',
  note: 'A local address nothing else holds',
};

const meta = preview.meta({
  component: JobRow,
  args: { job: gateway, standing: 'running' as const },
  decorators: [inACard],
});

/** The job the run stands on, turning while it works. */
export const Running = meta.story({
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByText('Creating your gateway')).toBeVisible();
    await expect(canvasElement.querySelector('[data-job-standing="running"]')).not.toBeNull();
  },
});

/** A finished job keeps its note, because that is the record of what it touched. */
export const Finished = meta.story({
  args: { standing: 'finished' as const },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('A local address nothing else holds')).toBeVisible();
  },
});

/** A job the run has not reached quiets its own title rather than pretending to be next. */
export const Waiting = meta.story({
  args: { standing: 'waiting' as const },
  play: async ({ canvas, canvasElement }) => {
    const title = await canvas.findByText('Creating your gateway');
    const surface = canvasElement.querySelector('[data-job-standing="waiting"]');

    if (!surface) {
      throw new Error('The row drew no standing.');
    }

    await expect(getComputedStyle(title).color).not.toBe(getComputedStyle(surface).color);
  },
});

/** A refused job says why in place of its note, so the reason sits where the record was. */
export const Refused = meta.story({
  args: { refusal: 'Port 8389 is already in use.', standing: 'refused' as const },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Port 8389 is already in use.')).toBeVisible();
    await expect(canvas.queryByText('A local address nothing else holds')).toBeNull();
  },
});
