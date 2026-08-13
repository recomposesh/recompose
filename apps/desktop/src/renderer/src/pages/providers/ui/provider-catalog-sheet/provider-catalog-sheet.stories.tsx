import { expect, screen } from 'storybook/test';

import preview from '#.storybook/preview';

import { ProviderCatalogSheet } from './provider-catalog-sheet';

const meta = preview.meta({
  component: ProviderCatalogSheet,
  args: { kind: 'subscription' as const, open: true, onOpenChange: () => undefined },
});

/**
 * The catalog standing over the subscriptions screen, holding only that kind.
 *
 * @summary The reading asks for the dialog and two plan cards, because the modal is kind-locked
 * to the screen that opened it and every card in it connects.
 */
export const Subscriptions = meta.story({
  play: async () => {
    await expect(await screen.findByRole('dialog', { name: 'Add provider' })).toBeVisible();
    await expect(await screen.findByRole('button', { name: /^Claude/ })).toBeVisible();
    await expect(
      await screen.findByRole('button', { name: /GLM Coding Plan/ }),
    ).not.toHaveAttribute('aria-disabled');
    await expect(await screen.findByRole('button', { name: 'Cancel' })).toBeVisible();
  },
});

/** The same catalog opened from the keys screen, reading each card as an endpoint. */
export const Keys = meta.story({
  args: { kind: 'api-key' as const },
  play: async () => {
    await expect(await screen.findByRole('button', { name: /Anthropic API/ })).toBeVisible();
  },
});

/** The catalog in the dark scheme, where the sheet lifts off the scrim behind it. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
