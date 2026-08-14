import type { GatewayConfig, VirtualModel } from '@recompose/contracts';

import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import type { StoredRouter } from './router-inspector';

import { gatewaySeed, paintedBox } from '../../../../shared/testing';
import { servingBridgeWorld, storedAccounts } from '../../testing/gateway-canvas.testkit';
import { framedAsDrawerBox } from '../../testing/subject-shell.testkit';
import { RouterInspector } from './router-inspector';

const failover: StoredRouter = {
  kind: 'router',
  policy: { mode: 'failover' },
  children: ['t1', 't2'],
};

const rotating: StoredRouter = { ...failover, policy: { mode: 'round-robin' } };

function pooled(router: StoredRouter): VirtualModel {
  return {
    id: 'pooled',
    displayName: 'Pooled',
    routing: {
      entry: 'r1',
      nodes: {
        r1: router,
        t1: { kind: 'target', accountId: 'k1', providerModel: 'claude-haiku-4-5' },
        t2: { kind: 'target', accountId: 'g1', providerModel: 'openai/gpt-5' },
      },
    },
  };
}

const gateway: GatewayConfig = gatewaySeed({
  slug: 'my-gateway',
  displayName: 'My Gateway',
  port: 8397,
  virtualModels: [pooled(failover)],
});

const meta = preview.meta({
  component: RouterInspector,
  args: {
    accounts: storedAccounts.accounts,
    gateway,
    model: pooled(failover),
    routeNodeId: 'r1',
    router: failover,
  },
  decorators: [framedAsDrawerBox],
  parameters: { bridge: servingBridgeWorld },
});

/** The whole of what a person decides about a router: the mode, and the ladder under it. */
export const Basic = meta.story({});

const SELECTION_BORDER = 2;

const STRIP_INSET = 6;

/**
 * The two segments split the row evenly and fill it, so neither mode looks like the bigger choice.
 *
 * The checked segment measures wider by exactly the one-pixel selection border the shipped chip
 * language draws on each of its sides, and the strip keeps only its own two-pixel padding and the
 * two-pixel gap between the pair. Nothing else stands between them and the full row.
 */
export const TheTwoSegmentsSplitTheRowEvenly = meta.story({
  play: async ({ canvas }) => {
    const strip = paintedBox(await canvas.findByRole('radiogroup', { name: 'Routing mode' }));
    const failing = paintedBox(await canvas.findByRole('radio', { name: 'Failover' }));
    const rotate = paintedBox(await canvas.findByRole('radio', { name: 'Round-robin' }));

    await expect(Math.round(failing.width - rotate.width)).toBe(SELECTION_BORDER);
    await expect(Math.round(strip.width - (failing.width + rotate.width))).toBe(STRIP_INSET);
  },
});

/** Under failover the sentence says which end wins, above a ladder of printed ranks. */
export const FailoverSaysWhichEndWins = meta.story({
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByText(/topmost healthy target/)).toBeVisible();
    await expect(
      [...canvasElement.querySelectorAll('[data-rank]')].map((cell) => cell.textContent),
    ).toEqual(['1', '2']);
  },
});

/** Under round-robin the sentence names the prompt-cache cost, and no row carries a rank. */
export const RoundRobinNamesThePromptCacheCost = meta.story({
  args: { model: pooled(rotating), router: rotating },
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByText(/prompt cache/)).toBeVisible();
    await expect(canvasElement.querySelectorAll('[data-rank]')).toHaveLength(0);
  },
});

/** A router holding no child says so and names the gesture that fills it. */
export const AnEmptyRouterInvitesItsFirstChild = meta.story({
  args: {
    model: {
      ...pooled(failover),
      routing: { entry: 'r1', nodes: { r1: { ...failover, children: [] } } },
    },
    router: { ...failover, children: [] },
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/no child yet/)).toBeVisible();
  },
});
