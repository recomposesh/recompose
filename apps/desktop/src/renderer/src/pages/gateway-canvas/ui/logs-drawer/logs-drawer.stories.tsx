import type { ComponentProps } from 'react';

import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { gatewaySeed } from '../../../../shared/testing';
import { servedAcrossTwoModels, storedAccounts } from '../../testing/gateway-canvas.testkit';
import { LogsDrawer } from './logs-drawer';

type DrawerStanding = ComponentProps<typeof LogsDrawer>;

const wholeGateway: DrawerStanding['subject'] = { kind: 'gateway' };
const theCreativeModel: DrawerStanding['subject'] = { kind: 'virtual-model', modelId: 'creative' };
const theFastModel: DrawerStanding['subject'] = { kind: 'virtual-model', modelId: 'fast' };
const theAggregator: DrawerStanding['subject'] = {
  kind: 'target',
  accountId: 'g1',
  modelId: 'creative',
};
const theRemovedTarget: DrawerStanding['subject'] = {
  kind: 'ghost-target',
  accountId: 'g1',
  modelId: 'creative',
};
const aDraft: DrawerStanding['subject'] = { kind: 'draft' };
const answering: DrawerStanding['serving'] = 'running';
const notAnswering: DrawerStanding['serving'] = 'stopped';

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
          routing: {
            entry: 'node-fast',
            nodes: {
              'node-fast': { kind: 'target', accountId: 'k1', providerModel: 'claude-haiku-4-5' },
            },
          },
        },
        {
          id: 'creative',
          displayName: 'Creative',
          routing: {
            entry: 'node-creative',
            nodes: {
              'node-creative': { kind: 'target', accountId: 'g1', providerModel: 'openai/gpt-5' },
            },
          },
        },
      ],
    }),
    accounts: storedAccounts.accounts,
    rows: servedAcrossTwoModels,
    serving: answering,
    subject: wholeGateway,
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
    await expect(await canvas.findByText('Logs for My Gateway')).toBeVisible();
    await expect(await canvas.findByText('Gateway', { exact: true })).toBeVisible();
    await expect(await canvas.findByText('Live')).toBeVisible();
    await expect(await canvas.findByRole('radio', { name: 'All' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(await canvas.findByRole('radio', { name: 'Success' })).toBeVisible();
    await expect(await canvas.findByRole('radio', { name: 'Errors' })).toBeVisible();
    await expect(await canvas.findByRole('separator', { name: 'Logs height' })).toBeVisible();
    await expect(await canvas.findByRole('button', { name: 'Close logs' })).toBeVisible();
  },
});

const INSPECTOR_BESIDE_PX = 176;

/**
 * The drawer against the pane a small window leaves it, whose header sheds before it clips.
 *
 * @summary The subject type and the filter segments leave rather than clipping mid-glyph, and the
 * name, the stream state, and the close control stand whole, because those three are what a person
 * checks before widening the window.
 */
export const NarrowPane = meta.story({
  decorators: [
    (Story) => (
      <div style={{ width: INSPECTOR_BESIDE_PX }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas }) => {
    const header = (await canvas.findByText('Logs for My Gateway')).closest('header');

    if (header === null) {
      throw new Error('the story rendered no header to measure');
    }

    await expect(canvas.getByText('Gateway', { exact: true })).not.toBeVisible();
    await expect(canvas.getByText('All', { exact: true })).not.toBeVisible();
    await expect(await canvas.findByText('Live')).toBeVisible();
    await expect(await canvas.findByRole('button', { name: 'Close logs' })).toBeVisible();
    await expect(header.scrollWidth).toBeLessThanOrEqual(header.clientWidth);
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

/** A virtual model selected on the canvas, whose name and type lead its scoped requests. */
export const ScopedToAVirtualModel = meta.story({
  args: { subject: theCreativeModel },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Logs for Creative')).toBeVisible();
    await expect(await canvas.findByText('Virtual model', { exact: true })).toBeVisible();
  },
});

/** A target selected on the canvas, named from the account registry. */
export const ScopedToATarget = meta.story({
  args: { subject: theAggregator },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Logs for openrouter')).toBeVisible();
    await expect(await canvas.findByText('Provider', { exact: true })).toBeVisible();
  },
});

/** A target since removed, whose type says what happened while its last known name remains. */
export const ScopedToARemovedTarget = meta.story({
  args: { subject: theRemovedTarget },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Logs for openrouter')).toBeVisible();
    await expect(await canvas.findByText('Removed provider', { exact: true })).toBeVisible();
  },
});

/** A draft in flight, named before it has a stored id. */
export const Draft = meta.story({
  args: { subject: aDraft },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Logs for New virtual model')).toBeVisible();
    await expect(await canvas.findByText('Draft', { exact: true })).toBeVisible();
  },
});

/** The drawer while its owner plays the exit animation. */
export const Leaving = meta.story({ args: { leaving: true } });

/** A scope narrowed past every request, reading its own line instead of an empty box. */
export const NothingInScope = meta.story({
  args: { rows: [], subject: theFastModel },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText('No requests through this virtual model yet.'),
    ).toBeVisible();
  },
});

/** The drawer in the dark scheme, where the header, filter, and inks all have to hold. */
export const DarkScheme = meta.story({
  globals: { theme: 'dark' },
  args: { subject: theAggregator },
});
