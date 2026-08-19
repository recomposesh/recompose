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

/**
 * The mode step, where a router draft says which kind it is before owing anything else.
 *
 * @summary It stacks the three modes the way the provider step stacks accounts, because both ask
 * one question with a handful of answers and both have a column rather than a row to spend.
 */
export const PickingTheRoutingMode = meta.story({
  args: {
    ask: { ...pickerArgs, bindsThrough: 'router' as const },
    step: 'router-mode' as const,
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Pick the routing mode')).toBeVisible();
    await expect(await canvas.findByRole('radiogroup', { name: 'Routing mode' })).toBeVisible();
    await expect(await canvas.findByText(/topmost healthy provider/)).toBeVisible();
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

/** The mode step in the dark scheme, where each row's ring has to hold against the picker box. */
export const ModeStepDarkScheme = meta.story({
  args: {
    ask: { ...pickerArgs, bindsThrough: 'router' as const },
    step: 'router-mode' as const,
  },
  globals: { theme: 'dark' },
});

/** The judge step in the dark scheme, where its note sits above the provider list. */
export const DarkScheme = meta.story({
  args: {
    ask: { ...pickerArgs, bindsThrough: 'router' as const, routerMode: 'conditional' as const },
    step: 'judge-provider' as const,
  },
  globals: { theme: 'dark' },
});
