import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { clientNamed, servingGateway } from '../../../../entities/harness';
import { ConnectDetail } from './connect-detail';

const meta = preview.meta({
  component: ConnectDetail,
  args: { client: clientNamed('claude-code'), facts: servingGateway, answered: 0 },
});

/** The pane a person lands on: one command carrying what Claude Code reads from this gateway. */
export const ClaudeCode = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { name: 'Claude Code' })).toBeVisible();

    const block = await canvas.findByText(/ANTHROPIC_BASE_URL="http:\/\/127.0.0.1:8397"/);

    await expect(block).toBeVisible();
    await expect(block).toHaveTextContent(/ANTHROPIC_MODEL="creative"/);
    await expect(block).not.toHaveTextContent(/export /);
  },
});

/** A client that wants the version segment, which the address row spells out rather than implying. */
export const AddressCarriesTheVersionSegment = meta.story({
  args: { client: clientNamed('codex-cli') },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('http://127.0.0.1:8397/v1')).toBeVisible();
    await expect(
      await canvas.findByRole('button', { name: 'Copy the base URL for Codex CLI' }),
    ).toBeVisible();
  },
});

/** A gateway enforcing no key, where the blocks carry a stand-in and the pane says why. */
export const NoKeyEnforced = meta.story({
  args: { facts: { ...servingGateway, apiKey: undefined } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/This gateway enforces no key/)).toBeVisible();
  },
});

/** A gateway with nothing composed yet, which points at the canvas rather than at a blank id. */
export const NoModelComposed = meta.story({
  args: { facts: { ...servingGateway, models: [] } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/serves no virtual model yet/)).toBeVisible();
  },
});

/** A client with nowhere to put a key, which says so instead of handing one over. */
export const ClientWithoutAKeyField = meta.story({
  args: { client: clientNamed('claude-desktop') },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/takes an address and no credential/)).toBeVisible();
  },
});

/** The whole pane in the dark scheme, where the copy blocks lift off the sheet behind them. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' }, args: { answered: 6 } });
