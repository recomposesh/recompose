import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { servingBridgeWorld, servingGateway } from '../../testing/gateway-canvas.testkit';
import { framedAsDrawerBox } from '../../testing/subject-shell.testkit';
import { EndpointBox } from './endpoint-box';

const meta = preview.meta({
  component: EndpointBox,
  args: { gateway: servingGateway, status: 'running' as const, bindAddress: '127.0.0.1' },
  decorators: [framedAsDrawerBox],
  parameters: { bridge: servingBridgeWorld },
});

/** A serving gateway's endpoint: the base URL clients call, its standing, and the port. */
export const AServingEndpoint = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('http://127.0.0.1:8397')).toBeVisible();
    await expect(await canvas.findByText('Running')).toBeVisible();
    await expect(await canvas.findByRole('textbox', { name: 'Port' })).toHaveValue('8397');
  },
});

/** A resting gateway's endpoint, where a settled port applies with no question. */
export const ARestingEndpoint = meta.story({
  args: { status: 'stopped' as const },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Stopped')).toBeVisible();
    await expect(await canvas.findByRole('textbox', { name: 'Port' })).toHaveValue('8397');
  },
});
