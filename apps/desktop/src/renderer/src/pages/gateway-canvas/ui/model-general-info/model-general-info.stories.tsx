import type { VirtualModel } from '@recompose/contracts';

import { expect, fn } from 'storybook/test';

import preview from '#.storybook/preview';

import { servingBridgeWorld, servingGateway } from '../../testing/gateway-canvas.testkit';
import { framedAsDrawerBox } from '../../testing/subject-shell.testkit';
import { ModelGeneralInfo } from './model-general-info';

const fastModel: VirtualModel = {
  id: 'fast',
  displayName: 'Fast',
  routing: {
    entry: 'seat',
    nodes: { seat: { kind: 'target', accountId: 'k1', providerModel: 'claude-haiku-4-5' } },
  },
};

const meta = preview.meta({
  component: ModelGeneralInfo,
  args: { gateway: servingGateway, model: fastModel, onRenamed: fn() },
  decorators: [framedAsDrawerBox],
  parameters: { bridge: servingBridgeWorld },
});

/** The definition facts at rest: the display name, and the id clients actually send. */
export const TheModelFactsAtRest = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Fast', { exact: true })).toBeVisible();
    await expect(await canvas.findByText('fast', { exact: true })).toBeVisible();
    await expect(await canvas.findByRole('button', { name: 'Edit' })).toBeVisible();
  },
});

/** Edit opens both fields for rewriting, seeded with the stored definition. */
export const EditingTheDefinition = meta.story({
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Edit' }));

    await expect(await canvas.findByRole('textbox', { name: 'Model name' })).toHaveValue('Fast');
    await expect(await canvas.findByRole('textbox', { name: 'Model id' })).toHaveValue('fast');
  },
});

/** A rename onto an id another definition holds refuses before anything writes. */
export const ARenameOntoAHeldId = meta.story({
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Edit' }));

    const idField = await canvas.findByRole('textbox', { name: 'Model id' });

    await userEvent.clear(idField);
    await userEvent.type(idField, 'creative');
    await userEvent.click(await canvas.findByRole('button', { name: 'Save' }));

    await expect(await canvas.findByRole('alert')).toHaveTextContent(
      '"creative" already serves this gateway.',
    );
  },
});
