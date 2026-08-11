import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { servingBridgeWorld, servingGateway } from '../../testing/gateway-canvas.testkit';
import { framedAsDrawerBox } from '../../testing/subject-shell.testkit';
import { GatewayGeneralInfo } from './gateway-general-info';

const meta = preview.meta({
  component: GatewayGeneralInfo,
  args: { gateway: servingGateway },
  decorators: [framedAsDrawerBox],
  parameters: { bridge: servingBridgeWorld },
});

/** The gateway facts at rest, with Edit as the one way in. */
export const TheGatewayFactsAtRest = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('My Gateway')).toBeVisible();
    await expect(await canvas.findByRole('button', { name: 'Edit' })).toBeVisible();
  },
});

/** Edit opens the name for rewriting, seeded with the stored display name. */
export const EditingTheName = meta.story({
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Edit' }));

    await expect(await canvas.findByRole('textbox', { name: 'Gateway name' })).toHaveValue(
      'My Gateway',
    );
    await expect(await canvas.findByRole('button', { name: 'Save' })).toBeVisible();
  },
});
