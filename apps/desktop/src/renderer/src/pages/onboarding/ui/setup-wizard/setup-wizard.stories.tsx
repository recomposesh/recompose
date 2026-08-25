import { expect, screen, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';

import { paintedBox, paintedStyle } from '../../../../shared/testing';
import { SetupWizard } from './setup-wizard';

const meta = preview.meta({
  component: SetupWizard,
  args: {
    children: (
      <div className="flex h-full items-center justify-center">
        <button type="button">Set up my gateway</button>
      </div>
    ),
    open: true,
    step: 'welcome' as const,
  },
});

/** The surface holds the window and carries the step's own name for a screen reader. */
export const Basic = meta.story({
  play: async () => {
    await expect(await screen.findByRole('dialog', { name: 'Welcome to recompose' })).toBeVisible();
  },
});

/** Escape leaves the surface standing, because leaving records a standing that never returns. */
export const EscapeLeavesItStanding = meta.story({
  play: async () => {
    const surface = await screen.findByRole('dialog', { name: 'Welcome to recompose' });

    await userEvent.keyboard('{Escape}');

    await expect(surface).toBeVisible();
  },
});

/** A press outside the surface leaves it standing for the same reason. */
export const AnOutsidePressLeavesItStanding = meta.story({
  play: async () => {
    const surface = await screen.findByRole('dialog', { name: 'Welcome to recompose' });

    await userEvent.click(document.body);

    await expect(surface).toBeVisible();
  },
});

/** The surface claims the whole window, so nothing under it is left painting a bare strip. */
export const ClaimsTheWholeWindow = meta.story({
  play: async () => {
    const surface = await screen.findByRole('dialog', { name: 'Welcome to recompose' });

    await expect(surface.getBoundingClientRect().top).toBe(0);
    await expect(getComputedStyle(surface).getPropertyValue('-webkit-app-region')).toBe('no-drag');
  },
});

/** It hands the drag back through a band of its own, so the window still moves while setup stands. */
export const HandsTheDragBack = meta.story({
  play: async () => {
    const surface = await screen.findByRole('dialog', { name: 'Welcome to recompose' });
    const band = surface.querySelector('.setup-band');

    await expect(paintedStyle(band).getPropertyValue('-webkit-app-region')).toBe('drag');
    await expect(paintedBox(band).height).toBeGreaterThan(0);
    await expect(paintedBox(band).top).toBe(0);
  },
});

/** A later step renames the surface, so the accessible name follows what a person is looking at. */
export const NamedByItsStep = meta.story({
  args: { step: 'waiting' as const },
  play: async () => {
    await expect(
      await screen.findByRole('dialog', { name: 'Waiting for your first request' }),
    ).toBeVisible();
  },
});
