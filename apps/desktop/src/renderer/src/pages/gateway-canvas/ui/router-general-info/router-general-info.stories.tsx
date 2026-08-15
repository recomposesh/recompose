import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { listedModels, storedAccounts } from '../../testing/gateway-canvas.testkit';
import { pooledGateway } from '../../testing/routed-gateways.testkit';
import { framedAsDrawerBox } from '../../testing/subject-shell.testkit';
import { RouterGeneralInfo } from './router-general-info';

const meta = preview.meta({
  component: RouterGeneralInfo,
  args: {
    gateway: pooledGateway,
    modelId: 'pooled',
    routeNodeId: 'r1',
    mode: 'failover' as const,
    displayName: undefined,
  },
  decorators: [framedAsDrawerBox],
  parameters: {
    bridge: {
      accounts: storedAccounts,
      gateways: [pooledGateway],
      providerModels: listedModels,
    },
  },
});

/**
 * A router nobody has named, which reads by the mode it spreads requests by.
 *
 * @summary The derived name stands in the value seat rather than in a placeholder, because a
 * person reading the box wants the name every other surface is calling this router right now.
 */
export const Unnamed = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Failover', { exact: true })).toBeVisible();
    await expect(await canvas.findByRole('button', { name: 'Edit' })).toBeVisible();
  },
});

/** A router a person named, which reads by that name from every surface on. */
export const Named = meta.story({
  args: { displayName: 'Ladder' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Ladder', { exact: true })).toBeVisible();
  },
});

/**
 * The box mid-edit, where a sentence names what clearing the field puts back.
 *
 * @summary Emptying the field is the whole of taking a name back, so the mode has to be readable
 * from inside the edit rather than only after a save proves what happened. It reads as a sentence
 * rather than as the placeholder, because a placeholder paints too quietly to carry a rule and
 * leaves the moment a person types.
 */
export const Editing = meta.story({
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Edit' }));

    const field = await canvas.findByRole('textbox', { name: 'Router name' });

    await expect(field).toHaveAttribute('placeholder', 'Failover');
    await expect(await canvas.findByText(/answers to Failover again/)).toBeVisible();
    await expect(await canvas.findByRole('button', { name: 'Save' })).toBeVisible();
    await expect(canvas.queryByRole('button', { name: 'Edit' })).toBeNull();
  },
});

/** Cancelling leaves the stored name exactly as it stood, whatever was typed over it. */
export const CancelKeepsTheName = meta.story({
  args: { displayName: 'Ladder' },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Edit' }));
    await userEvent.type(await canvas.findByRole('textbox', { name: 'Router name' }), 'x');
    await userEvent.click(await canvas.findByRole('button', { name: 'Cancel' }));

    await expect(await canvas.findByText('Ladder', { exact: true })).toBeVisible();
  },
});

/** The box in the dark scheme, where the field has to separate from the panel behind it. */
export const DarkScheme = meta.story({
  args: { displayName: 'Ladder' },
  globals: { theme: 'dark' },
});
