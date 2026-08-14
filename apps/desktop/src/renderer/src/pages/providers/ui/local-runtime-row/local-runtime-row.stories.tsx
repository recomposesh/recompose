import type { AccountsDocument, LocalAccount } from '@recompose/contracts';

import { ACCOUNTS_VERSION } from '@recompose/contracts';
import { expect, screen, userEvent, waitFor } from 'storybook/test';

import preview from '#.storybook/preview';

import { LocalRuntimeRow } from './local-runtime-row';

const stored: LocalAccount = {
  id: 'l1',
  provider: 'ollama',
  kind: 'local',
  address: 'http://127.0.0.1:11434',
};

const heldRegistry: AccountsDocument = { schemaVersion: ACCOUNTS_VERSION, accounts: [stored] };

const meta = preview.meta({
  component: LocalRuntimeRow,
  args: { account: stored },
  decorators: [
    (Story) => (
      <ul className="mx-auto w-full max-w-column py-4">
        <Story />
      </ul>
    ),
  ],
  parameters: { bridge: { accounts: heldRegistry } },
});

/**
 * A stored runtime whose server answered the look, reading Running as of this mount.
 *
 * @summary The reading asks for the address in the mono value style and the standing word,
 * because the row is a name, an address, and an observation, and nothing else.
 */
export const Running = meta.story({
  parameters: {
    bridge: {
      accounts: heldRegistry,
      reachability: { verdict: 'answers' as const, version: '0.5.1' },
    },
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('http://127.0.0.1:11434')).toBeVisible();
    await expect(await canvas.findByText('Running')).toBeVisible();
  },
});

/**
 * A stored runtime whose server didn't answer, reading the quiet fact rather than an alarm.
 *
 * @summary A stopped loopback server is expected life, so the word rides the inert tone and the
 * stored address stands unchanged beneath the name.
 */
export const NotRunning = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Not running')).toBeVisible();
    await expect(await canvas.findByText('http://127.0.0.1:11434')).toBeVisible();
  },
});

/**
 * A stranger answering on the runtime's port, which must never read as the runtime running.
 *
 * @summary The one standing a person acts on differently, so it carries the attention tone.
 */
export const AnotherServer = meta.story({
  parameters: {
    bridge: {
      accounts: heldRegistry,
      reachability: { verdict: 'unrecognized' as const, status: 404 },
    },
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Another server answered')).toBeVisible();
  },
});

/**
 * The overflow holding the row's three acts and nothing else.
 *
 * @summary None of the three is part of reading the row, so all three live behind the overflow,
 * matching the key row's anatomy.
 */
export const Acts = meta.story({
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Actions for Ollama' }));

    const actions = await screen.findAllByRole('menuitem');

    await expect(actions.map((action) => action.textContent)).toEqual([
      'Check again',
      'Move to another port',
      'Remove',
    ]);
  },
});

/**
 * The move opens on the port the row answers at now, and closes once it is asked for.
 *
 * @summary The row reads its address from a prop, so what the move did to the registry shows on
 * the surface that lists rows rather than here. What belongs here is that the act opens the right
 * dialog, prefilled, and that asking for the move leaves no refusal behind.
 */
export const MovedToAnotherPort = meta.story({
  parameters: { bridge: { accounts: heldRegistry } },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Actions for Ollama' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Move to another port' }));

    const port = await screen.findByRole('textbox', { name: 'Port' });

    await expect(port).toHaveValue('11434');

    await userEvent.clear(port);
    await userEvent.type(port, '11435');
    await userEvent.click(await screen.findByRole('button', { name: 'Move' }));

    await waitFor(() => {
      void expect(screen.queryByRole('textbox', { name: 'Port' })).toBeNull();
    });
    await expect(canvas.queryByRole('alert')).toBeNull();
  },
});

/** The runtime row in the dark scheme, where the inert word has to hold against the card. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
