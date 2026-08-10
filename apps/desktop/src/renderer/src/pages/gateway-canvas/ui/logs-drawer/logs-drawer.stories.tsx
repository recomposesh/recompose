import type { ComponentProps } from 'react';

import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { gatewaySeed } from '../../../../shared/testing';
import {
  crowdedGateway,
  servedRequest,
  servedRun,
  storedAccounts,
} from '../../testing/gateway-canvas.testkit';
import { LogsDrawer } from './logs-drawer';

type DrawerStanding = ComponentProps<typeof LogsDrawer>;

const wholeGateway: DrawerStanding['subject'] = { kind: 'gateway' };
const theCreativeModel: DrawerStanding['subject'] = { kind: 'virtual-model', modelId: 'creative' };
const theFastModel: DrawerStanding['subject'] = { kind: 'virtual-model', modelId: 'fast' };
const theAggregator: DrawerStanding['subject'] = { kind: 'target', accountId: 'g1' };
const theRemovedTarget: DrawerStanding['subject'] = { kind: 'ghost-target', accountId: 'g1' };
const answering: DrawerStanding['serving'] = 'running';
const notAnswering: DrawerStanding['serving'] = 'stopped';

const acrossTwoModels = [
  servedRequest({ id: 'a', virtualModel: 'fast' }),
  servedRequest({
    id: 'b',
    at: servedRequest().at - 1000,
    virtualModel: 'creative',
    provider: 'openrouter',
    accountId: 'g1',
    providerModel: 'openai/gpt-5',
    status: 429,
  }),
  servedRequest({
    id: 'c',
    at: servedRequest().at - 2000,
    virtualModel: 'fast',
    status: 500,
    durationMs: undefined,
  }),
  ...servedRun(30).map((row) => ({ ...row, id: `older-${row.id}`, at: row.at - 10_000 })),
];

const meta = preview.meta({
  component: LogsDrawer,
  args: {
    gateway: gatewaySeed({
      slug: 'my-gateway',
      displayName: 'My Gateway',
      port: 8397,
      virtualModels: [
        {
          id: 'fast',
          displayName: 'Fast',
          target: { accountId: 'k1', providerModel: 'claude-haiku-4-5' },
        },
        {
          id: 'creative',
          displayName: 'Creative',
          target: { accountId: 'g1', providerModel: 'openai/gpt-5' },
        },
      ],
    }),
    accounts: storedAccounts.accounts,
    rows: acrossTwoModels,
    serving: answering,
    subject: wholeGateway,
    onSelectSubject: () => {},
  },
  decorators: [
    (Story) => (
      <div className="flex h-100 w-full flex-col justify-end bg-surface-content dot-grid">
        <Story />
      </div>
    ),
  ],
});

/** The drawer a person opens on a working gateway, streaming under the canvas. */
export const Streaming = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Logs · My Gateway')).toBeVisible();
    await expect(await canvas.findByText('Live')).toBeVisible();
    await expect(await canvas.findByRole('separator', { name: 'Logs height' })).toBeVisible();
    await expect(await canvas.findByRole('button', { name: 'Close logs' })).toBeVisible();
  },
});

/** A gateway that stopped, whose state holds its place rather than leaving the header. */
export const Stopped = meta.story({
  args: { serving: notAnswering },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Stopped')).toBeVisible();
    await expect(await canvas.findByText('14:22:09')).toBeVisible();
  },
});

/** A virtual model selected on the canvas, whose segment lights and whose requests remain. */
export const ScopedToAVirtualModel = meta.story({
  args: { subject: theCreativeModel },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('radio', { name: 'Creative' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  },
});

/** A target selected on the canvas, which brings a scope of its own for as long as it holds. */
export const ScopedToATarget = meta.story({
  args: { subject: theAggregator },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('radio', { name: 'openrouter' })).toBeVisible();
  },
});

/** A target since removed, whose transient scope says removed rather than naming what is gone. */
export const ScopedToARemovedTarget = meta.story({
  args: { subject: theRemovedTarget },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('radio', { name: 'Removed' })).toBeVisible();
  },
});

/** A gateway serving more virtual models than the header holds, the rest behind the overflow. */
export const MoreScopesThanTheHeaderHolds = meta.story({
  args: { gateway: crowdedGateway, rows: [] },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: 'More log scopes' })).toBeVisible();
  },
});

/** A scope narrowed past every request, reading its own line instead of an empty box. */
export const NothingInScope = meta.story({
  args: { rows: [], subject: theFastModel },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText('No requests through this virtual model yet.'),
    ).toBeVisible();
  },
});

/** The drawer in the dark scheme, where the header, the strip, and the inks all have to hold. */
export const DarkScheme = meta.story({
  globals: { theme: 'dark' },
  args: { subject: theAggregator },
});
