import { expect, fn, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';

import { jobsFor } from '../../model/setup-job';
import { onAStepSurface } from '../../testing/on-a-surface';
import { BuildingStep } from './building-step';

const jobs = jobsFor(
  [
    { id: 'a1', title: 'Claude plan connected', note: 'alpcan@alpcanaydin.com' },
    { id: 'a2', title: 'Ollama linked', note: '127.0.0.1:11434' },
  ],
  'claude-my-model',
  2,
);

const meta = preview.meta({
  component: BuildingStep,
  args: {
    jobs,
    onBack: fn(),
    onPointHarnesses: fn(),
    onRetry: fn(),
    onSkip: fn(),
    run: { at: 2, refusal: undefined },
  },
  decorators: [onAStepSurface],
});

/** The run working: the accounts done, the gateway turning, the model still waiting. */
export const Working = meta.story({
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByText(/Each of these becomes a card/u)).toBeVisible();
    await expect(canvasElement.querySelectorAll('[data-job-standing="finished"]')).toHaveLength(2);
    await expect(canvasElement.querySelectorAll('[data-job-standing="running"]')).toHaveLength(1);
    await expect(canvasElement.querySelectorAll('[data-job-standing="waiting"]')).toHaveLength(1);
  },
});

/** A working run offers no act, because there is nothing to decide while it works. */
export const AWorkingRunOffersNoAct = meta.story({
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('button', { name: 'Try again' })).toBeNull();
    await expect(canvas.queryByRole('button', { name: 'Point your harnesses at it' })).toBeNull();
  },
});

/** Every job done, and the one act that carries a person on. */
export const Done = meta.story({
  args: { run: { at: jobs.length, refusal: undefined } },
  play: async ({ args, canvas, canvasElement }) => {
    await expect(canvasElement.querySelectorAll('[data-job-standing="finished"]')).toHaveLength(4);

    await userEvent.click(
      await canvas.findByRole('button', { name: 'Point your harnesses at it' }),
    );

    await expect(args.onPointHarnesses).toHaveBeenCalledOnce();
  },
});

/** A refused job carries its reason, halts the rest, and offers a way to try again. */
export const ARefusedJob = meta.story({
  args: { run: { at: 2, refusal: 'Port 8389 is already in use.' } },
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByText('Port 8389 is already in use.')).toBeVisible();
    await expect(await canvas.findByText(/Nothing you already connected is lost/u)).toBeVisible();
    await expect(canvasElement.querySelectorAll('[data-job-standing="waiting"]')).toHaveLength(1);
    await expect(canvasElement.querySelectorAll('[data-job-standing="finished"]')).toHaveLength(2);
  },
});

/** Trying again is what a refusal offers, beside the way back. */
export const TryingAgain = meta.story({
  args: { run: { at: 2, refusal: 'Port 8389 is already in use.' } },
  play: async ({ args, canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Try again' }));

    await expect(args.onRetry).toHaveBeenCalledOnce();
    await expect(await canvas.findByRole('button', { name: 'Back' })).toBeVisible();
  },
});

/** The run reports itself as it moves, so a screen reader hears each job land. */
export const TheRunAnnouncesItself = meta.story({
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[aria-live="polite"]')).not.toBeNull();
  },
});
