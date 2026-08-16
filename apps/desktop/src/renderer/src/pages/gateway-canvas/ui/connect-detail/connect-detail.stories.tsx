import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { clientNamed } from '../../model/connect-catalog';
import { ConnectDetail } from './connect-detail';

const serving = {
  gatewayName: 'My Gateway',
  baseUrl: 'http://127.0.0.1:8397',
  apiKey: 'rc-local-4Xh2p9Fd',
  modelId: 'creative',
};

const models = [
  { id: 'creative', displayName: 'Creative' },
  { id: 'fast', displayName: 'Fast' },
];

const meta = preview.meta({
  component: ConnectDetail,
  args: { client: clientNamed('claude-code'), facts: serving, models, answered: 0 },
});

/** The pane a person lands on: the two variables Claude Code reads, written from this gateway. */
export const ClaudeCode = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { name: 'Claude Code' })).toBeVisible();
    await expect(
      await canvas.findByText(/export ANTHROPIC_BASE_URL=http:\/\/127.0.0.1:8397/),
    ).toBeVisible();
    await expect(await canvas.findByText(/export ANTHROPIC_MODEL=creative/)).toBeVisible();
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
  args: { facts: { ...serving, apiKey: undefined } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/This gateway enforces no key/)).toBeVisible();
  },
});

/** A gateway with nothing composed yet, which points at the canvas rather than at a blank id. */
export const NoModelComposed = meta.story({
  args: { facts: { ...serving, modelId: undefined }, models: [] },
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
