import { defaultSettings } from '@recompose/contracts';
import { expect, screen } from 'storybook/test';

import preview from '#.storybook/preview';

import { claudePlan, ollama } from '../../testing/found-source';
import { onAStepSurface } from '../../testing/on-a-surface';
import { BuildingStanding } from './building-standing';

const fresh = { ...defaultSettings(), setupWizardSettled: false };

const meta = preview.meta({
  component: BuildingStanding,
  args: {
    harnesses: new Set(['claude-code']),
    isMarked: (source) => source.id !== '',
    onBack: () => undefined,
    onBuilt: () => undefined,
    onSkip: () => undefined,
  },
  parameters: { bridge: { gateways: [], settings: fresh } },
  decorators: [onAStepSurface],
});

/** A machine holding nothing reports no accounts, and the run has only its own work left. */
export const NothingRecorded = meta.story({
  play: async () => {
    await expect(await screen.findByText(/Composing claude-my-model/u)).toBeVisible();
    await expect(await screen.findByText('Creating your gateway')).toBeVisible();
  },
});

/** Every account the sources step recorded reads as finished before the run's own work. */
export const AccountsAlreadyRecorded = meta.story({
  args: { isMarked: (source) => source.id === claudePlan.id || source.id === ollama.id },
  play: async () => {
    await expect(await screen.findByText('Creating your gateway')).toBeVisible();
  },
});
