import type { GatewayConfig } from '@recompose/contracts';

import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { servingBridgeWorld, servingGateway } from '../../testing/gateway-canvas.testkit';
import { framedAsDrawerBox } from '../../testing/subject-shell.testkit';
import { GatewayAccess } from './gateway-access';

const KEY = 'rc-local-J8xQm2NpVr4wYs6bZa1cLd3fGh5jKm9';

const requiringTheKey: GatewayConfig = {
  ...servingGateway,
  apiKey: { value: KEY, required: true },
};

const holdingItUnenforced: GatewayConfig = {
  ...servingGateway,
  apiKey: { value: KEY, required: false },
};

const meta = preview.meta({
  component: GatewayAccess,
  args: { gateway: servingGateway },
  decorators: [framedAsDrawerBox],
  parameters: { bridge: servingBridgeWorld },
});

/** A gateway nobody has closed yet says so, and offers the switch that closes it. */
export const OpenToEveryCaller = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/without a key/)).toBeVisible();
    await expect(await canvas.findByRole('switch', { name: /API key/ })).not.toBeChecked();
  },
});

/** The key at rest: masked, copyable, and never shown whole. */
export const TheKeyMasked = meta.story({
  args: { gateway: requiringTheKey },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/••••••••/)).toBeVisible();
    await expect(canvas.queryByText(KEY)).toBeNull();
    await expect(await canvas.findByRole('button', { name: 'Copy API key' })).toBeVisible();
  },
});

/** The section names the fields a client can carry the key in, because copying is only half of it. */
export const WhereTheKeyGoes = meta.story({
  args: { gateway: requiringTheKey },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/x-goog-api-key/)).toBeVisible();
  },
});

/** A key the gateway stores but no longer requires reads as open, and keeps its value out of sight. */
export const HeldButNotRequired = meta.story({
  args: { gateway: holdingItUnenforced },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/without a key/)).toBeVisible();
    await expect(canvas.queryByText(KEY)).toBeNull();
  },
});

/** Nothing here waits for a save, because nothing here is a field a person types into. */
export const NothingWaitsForASave = meta.story({
  args: { gateway: requiringTheKey },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('switch', { name: /API key/ })).toBeVisible();
    await expect(canvas.queryByRole('button', { name: 'Save' })).toBeNull();
    await expect(canvas.queryByRole('button', { name: 'Cancel' })).toBeNull();
  },
});

/** Regenerating asks first, and the question names the clients it breaks. */
export const RegeneratingAsksFirst = meta.story({
  args: { gateway: requiringTheKey },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Regenerate' }));

    await expect(await canvas.findByText(/stop reaching/)).toBeVisible();
  },
});

/** Backing out of the question leaves the key the gateway already held. */
export const BackingOutOfARegeneration = meta.story({
  args: { gateway: requiringTheKey },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Regenerate' }));
    await userEvent.click(await canvas.findByRole('button', { name: 'Cancel' }));

    await expect(canvas.queryByText(/stop reaching/)).toBeNull();
    await expect(await canvas.findByText(/••••••••/)).toBeVisible();
  },
});
