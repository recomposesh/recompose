import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { inTheDrawersColumn, pickerArgs } from '../../testing/routing-picker-args';
import { PickerStep } from './picker-step';

const meta = preview.meta({
  component: PickerStep,
  args: { ask: pickerArgs, step: 'kind' as const },
  decorators: [inTheDrawersColumn],
});

/** The ask a draft opens on, which is the same one a released cable opens. */
export const TheBindingAsk = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Bind this model to')).toBeVisible();
  },
});

/** The provider step, which names the one account a plain binding reaches. */
export const PickingAProvider = meta.story({
  args: { step: 'provider' as const },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Pick a provider')).toBeVisible();
  },
});

/**
 * The same step under conditional asks for the else branch instead.
 *
 * @summary One step, two questions: a person picking here under conditional is naming what catches
 * everything the judge cannot place rather than the one thing the model binds to.
 */
export const TheProviderStepRenamedUnderConditional = meta.story({
  args: {
    ask: { ...pickerArgs, bindsThrough: 'router' as const, routerMode: 'conditional' as const },
    step: 'provider' as const,
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Pick the else branch')).toBeVisible();
  },
});

/** The judge step, which says what shape of model suits the job before it lists any. */
export const PickingTheJudge = meta.story({
  args: {
    ask: { ...pickerArgs, bindsThrough: 'router' as const, routerMode: 'conditional' as const },
    step: 'judge-provider' as const,
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/Fast, cheap models judge best/)).toBeVisible();
  },
});

/** The judge step in the dark scheme, where its note sits above the provider list. */
export const DarkScheme = meta.story({
  args: {
    ask: { ...pickerArgs, bindsThrough: 'router' as const, routerMode: 'conditional' as const },
    step: 'judge-provider' as const,
  },
  globals: { theme: 'dark' },
});
