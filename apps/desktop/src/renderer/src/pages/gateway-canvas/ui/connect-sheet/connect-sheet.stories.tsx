import { expect, fn, screen, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';

import { servingGateway } from '../../../../entities/harness';
import { ConnectSheet } from './connect-sheet';

const meta = preview.meta({
  component: ConnectSheet,
  args: {
    open: true,
    onOpenChange: fn(),
    facts: servingGateway,
    answered: 0,
  },
});

/** The sheet as it arrives: the rail on the left, and the first client already open beside it. */
export const Open = meta.story({
  play: async () => {
    const sheet = await screen.findByRole('dialog', { name: 'Connect a client to My Gateway' });

    await expect(sheet).toHaveAccessibleDescription(
      'Point a client at http://127.0.0.1:8397 and it reaches every model this gateway serves.',
    );
    await expect(await screen.findByRole('heading', { name: 'Claude Code' })).toBeVisible();
  },
});

/** Picking another client in the rail moves the pane without leaving the sheet. */
export const PickingAnotherClient = meta.story({
  play: async () => {
    await userEvent.click(await screen.findByRole('button', { name: /Gemini CLI/ }));

    await expect(await screen.findByRole('heading', { name: 'Gemini CLI' })).toBeVisible();
    await expect(await screen.findByText(/GOOGLE_GEMINI_BASE_URL/)).toBeVisible();
  },
});

/** Narrowing the rail, which is how a person with one tool in mind finds it in one gesture. */
export const NarrowingTheRail = meta.story({
  play: async () => {
    await userEvent.type(await screen.findByRole('textbox', { name: 'Search clients' }), 'kimi');

    await expect(await screen.findByRole('button', { name: /Kimi Code/ })).toBeVisible();
    await expect(screen.queryByRole('button', { name: /opencode/ })).toBeNull();
  },
});

/** The broad surface this sheet stands at, which is what leaves room for a rail and a pane. */
export const BroadSurface = meta.story({
  play: async () => {
    const sheet = await screen.findByRole('dialog', { name: 'Connect a client to My Gateway' });

    await expect(sheet.getBoundingClientRect().width).toBe(940);
  },
});

/** The whole sheet in the dark scheme, rail and pane together. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
