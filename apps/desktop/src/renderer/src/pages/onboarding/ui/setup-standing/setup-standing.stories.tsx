import { defaultSettings } from '@recompose/contracts';
import { expect, fn, screen } from 'storybook/test';

import preview from '#.storybook/preview';

import { onAStepSurface } from '../../testing/on-a-surface';
import { SetupStanding } from './setup-standing';

const fresh = { ...defaultSettings(), setupWizardSettled: false };

const meta = preview.meta({
  component: SetupStanding,
  args: {
    built: undefined,
    isMarked: () => false,
    onBuilt: fn(),
    onConnect: fn(),
    onCreate: fn(),
    onMarkSource: fn(),
    onPickHarness: fn(),
    pickedHarnesses: new Set<string>(),
    settle: fn(),
    step: 'welcome' as const,
    walkTo: fn(),
  },
  parameters: { bridge: { settings: fresh } },
  decorators: [onAStepSurface],
});

/** The welcome step is what a new profile meets first. */
export const OnTheWelcome = meta.story({
  play: async () => {
    await expect(await screen.findByRole('button', { name: 'Set up my gateway' })).toBeVisible();
  },
});

/** Walking to the harness question draws that step and nothing of the one before it. */
export const OnTheHarnessQuestion = meta.story({
  args: { step: 'harnesses' as const },
  play: async () => {
    await expect(
      await screen.findByRole('img', { name: 'Which harnesses do you use?' }),
    ).toBeVisible();
    await expect(screen.queryByRole('button', { name: 'Set up my gateway' })).toBeNull();
  },
});

/** A step whose gateway has not been built yet draws nothing rather than a placeholder. */
export const OnPointingWithNothingBuilt = meta.story({
  args: { step: 'pointing' as const },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('button')).toBeNull();
  },
});
