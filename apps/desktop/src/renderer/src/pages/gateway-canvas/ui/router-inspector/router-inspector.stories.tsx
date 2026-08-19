import type { GatewayConfig, RouteNode, VirtualModel } from '@recompose/contracts';

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

const judgeNode: RouteNode = {
  kind: 'target',
  accountId: 'k1',
  providerModel: 'claude-haiku-4-5',
};

/**
 * The virtual model every reading stands on, holding the judge only where a policy names one.
 *
 * @summary A judge node under a router that never reads its requests would be a node no reference
 * reaches, which is a table the stored shape refuses, so it arrives only with the mode that names it.
 */
function pooled(router: StoredRouter, judged = false): VirtualModel {
  return {
    id: 'pooled',
    displayName: 'Pooled',
    routing: {
      entry: 'r1',
      nodes: {
        r1: router,
        t1: { kind: 'target', accountId: 'k1', providerModel: 'claude-haiku-4-5' },
        t2: { kind: 'target', accountId: 'g1', providerModel: 'openai/gpt-5' },
        ...(judged ? { j1: judgeNode } : {}),
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
    onSelectNode: () => {},
    routeNodeId: 'r1',
    router: failover,
  },
  decorators: [framedAsDrawerBox],
  parameters: { bridge: servingBridgeWorld },
});

/** The whole of what a person decides about a router: the mode, and the ladder under it. */
export const Basic = meta.story({});

const SELECTION_BORDER = 2;

const STRIP_INSET = 8;

/**
 * The three segments split the row evenly and fill it, so no mode looks like the bigger choice.
 *
 * The checked segment measures wider by exactly the one-pixel selection border the shipped chip
 * language draws on each of its sides, and the strip keeps only its own two-pixel padding and the
 * two-pixel gaps between the three. Nothing else stands between them and the full row. The third
 * mode is what makes this worth measuring again: a strip that fit two can still crowd three.
 */
export const TheThreeSegmentsSplitTheRowEvenly = meta.story({
  play: async ({ canvas }) => {
    const strip = paintedBox(await canvas.findByRole('radiogroup', { name: 'Routing mode' }));
    const failing = paintedBox(await canvas.findByRole('radio', { name: 'Failover' }));
    const rotate = paintedBox(await canvas.findByRole('radio', { name: 'Round-robin' }));
    const judged = paintedBox(await canvas.findByRole('radio', { name: 'Conditional' }));

    await expect(Math.round(failing.width - rotate.width)).toBe(SELECTION_BORDER);
    await expect(Math.round(rotate.width - judged.width)).toBe(0);
    await expect(Math.round(strip.width - (failing.width + rotate.width + judged.width))).toBe(
      STRIP_INSET,
    );
  },
});

/** Every mode reads whole in the narrowest inspector, so no third segment crowds its label out. */
export const NoModeLabelOverflowsItsSegment = meta.story({
  play: async ({ canvas }) => {
    for (const name of ['Failover', 'Round-robin', 'Conditional']) {
      const segment = await canvas.findByRole('radio', { name });

      await expect(segment.scrollWidth).toBeLessThanOrEqual(segment.clientWidth);
    }
  },
});

/** Under failover the sentence says which end wins, above a ladder of printed ranks. */
export const FailoverSaysWhichEndWins = meta.story({
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByText(/topmost healthy provider/)).toBeVisible();
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

const judging: StoredRouter = {
  kind: 'router',
  policy: {
    mode: 'conditional',
    judge: 'j1',
    branches: [{ label: 'code', rule: 'questions about source code', child: 't1' }],
    elseChild: 't2',
    judgeBoundMs: 3000,
    rejudgeEveryRequest: false,
  },
  children: ['t1', 't2'],
};

const rejudging: StoredRouter = {
  ...judging,
  policy:
    judging.policy.mode === 'conditional'
      ? { ...judging.policy, rejudgeEveryRequest: true }
      : judging.policy,
};

/** A conditional router names the judge it reads through and says what shape of model suits it. */
export const ConditionalNamesItsJudge = meta.story({
  args: { model: pooled(judging, true), router: judging },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Judge')).toBeVisible();
    await expect(await canvas.findByText(/Fast, cheap models judge best/)).toBeVisible();
  },
});

/** Sticking is the resting rhythm, and the sentence says the prompt cache is what it keeps. */
export const ConditionalKeepsTheBranchItEarned = meta.story({
  args: { model: pooled(judging, true), router: judging },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('switch', { name: 'Re-judge every request' }),
    ).not.toBeChecked();
    await expect(await canvas.findByText(/keeps the branch it first earned/)).toBeVisible();
  },
});

/** Re-judging names the prompt cache hit it costs and the turn that holds its branch anyway. */
export const ConditionalRejudgingNamesItsCost = meta.story({
  args: { model: pooled(rejudging, true), router: rejudging },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/each change costs a prompt cache hit/)).toBeVisible();
    await expect(await canvas.findByText(/server-held state/)).toBeVisible();
  },
});

/**
 * A router that spreads some other way cannot be switched to conditional, and the strip says why.
 *
 * @summary The mode needs a judge and an else child that no mode strip can supply, so the segment
 * stays reachable and unmovable rather than going missing without a word.
 */
export const ConditionalSaysWhatASwitchWouldNeed = meta.story({
  play: async ({ canvas }) => {
    const segment = await canvas.findByRole('radio', { name: 'Conditional' });

    await expect(segment).toHaveAttribute('aria-disabled', 'true');
    await expect(segment).toHaveAccessibleDescription(/judge/);
  },
});

/** The conditional inspector in the dark scheme, where the judge box sits on the drawer panel. */
export const ConditionalDarkScheme = meta.story({
  args: { model: pooled(judging, true), router: judging },
  globals: { theme: 'dark' },
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
