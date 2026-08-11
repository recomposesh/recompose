import { expect, screen } from 'storybook/test';

import preview from '#.storybook/preview';

import { RestartConfirmation } from './restart-confirmation';

const meta = preview.meta({
  component: RestartConfirmation,
  args: {
    address: '0.0.0.0',
    running: 2,
    onCancel: () => {},
    onConfirm: () => {},
  },
});

/** The dialog names the address and counts the gateways the change restarts. */
export const Open = meta.story({
  play: async () => {
    const dialog = await screen.findByRole('dialog', { name: 'Restart running gateways?' });

    await expect(dialog).toHaveTextContent(
      'Changing the bind address to 0.0.0.0 restarts 2 running gateways.',
    );
    await expect(await screen.findByRole('button', { name: 'Restart gateways' })).toBeVisible();
    await expect(await screen.findByRole('button', { name: 'Cancel' })).toBeVisible();
  },
});

/** A single running gateway reads in the singular. */
export const OneRunningGateway = meta.story({
  args: { running: 1 },
  play: async () => {
    const dialog = await screen.findByRole('dialog', { name: 'Restart running gateways?' });

    await expect(dialog).toHaveTextContent(
      'Changing the bind address to 0.0.0.0 restarts 1 running gateway.',
    );
  },
});

/** The same dialog under the dark scheme. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
