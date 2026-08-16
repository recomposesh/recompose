import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { inTheDrawersColumn, pickerArgs } from '../../testing/routing-picker-args';
import { RoutingPicker } from './routing-picker';

const meta = preview.meta({
  component: RoutingPicker,
  args: pickerArgs,
  decorators: [inTheDrawersColumn],
});

/**
 * The ask the picker opens on, which is the same one a released cable opens.
 *
 * @summary Each answer leads with the color the canvas already draws that kind in, so the row and
 * the card it will produce are recognizably the same thing before either exists.
 */
export const TheBindingAsk = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Bind this model to')).toBeVisible();
    await expect(await canvas.findByText('Picks among several providers')).toBeVisible();
    await expect(await canvas.findByText('One provider and one model')).toBeVisible();
  },
});

/** The providers on offer, with the way back to the ask that led here. */
export const PickingAProvider = meta.story({
  args: { bindsThrough: 'target' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Pick a provider')).toBeVisible();
    await expect(
      await canvas.findByRole('button', { name: 'Bind this model to something else' }),
    ).toBeVisible();
  },
});

/** A provider's detail reads under its name rather than beside it, so every name starts level. */
export const DetailUnderTheName = meta.story({
  args: { bindsThrough: 'target' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('127.0.0.1:11434')).toBeVisible();
  },
});

/** A router answers the whole question, so the step says what happens next instead of listing. */
export const RoutingThroughARouter = meta.story({
  args: { bindsThrough: 'router' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Routes through a router')).toBeVisible();
    await expect(await canvas.findByText(/drag a cable/)).toBeVisible();
  },
});

/** The models the picked provider serves, named by the provider they belong to. */
export const PickingAModel = meta.story({
  args: {
    bindsThrough: 'target',
    target: 'k1',
    targetName: 'work',
    models: ['claude-haiku-4-5', 'claude-sonnet-5'],
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Models work serves')).toBeVisible();
  },
});

/** Nothing stored can serve, so the step names the absence and points at the screen that ends it. */
export const NothingConnected = meta.story({
  args: { bindsThrough: 'target', targets: [] },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('No provider connected yet')).toBeVisible();
    await expect(await canvas.findByRole('link', { name: 'Open Providers' })).toBeVisible();
  },
});

/** The ask in the dark scheme, where both kind glyphs have to hold against the box. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
