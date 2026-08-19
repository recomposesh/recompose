import type { GatewayConfig, RouteNode, VirtualModel } from '@recompose/contracts';

import { expect, screen } from 'storybook/test';

import preview from '#.storybook/preview';

import type { StoredRouter } from './router-inspector';

import { gatewaySeed, paintedBox } from '../../../../shared/testing';
import { servingBridgeWorld, storedAccounts } from '../../testing/gateway-canvas.testkit';
import { pickedFromTheRowMenu } from '../../testing/router-child.testkit';
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

/**
 * Every mode owns a whole row of the panel, stacked, so no name competes with another for width.
 *
 * The strip these rows replace split one row between three names and wrapped the longest onto two
 * lines at this width. Each row now spans the column and starts at the same edge, which is what
 * lets a sentence ride beside the name and what leaves room for a fourth mode.
 */
export const EveryModeOwnsAWholeRow = meta.story({
  play: async ({ canvas }) => {
    const stack = paintedBox(await canvas.findByRole('radiogroup', { name: 'Routing mode' }));
    const rows = ['Failover', 'Round-robin', 'Conditional'];
    const boxes = await Promise.all(
      rows.map(async (name) => paintedBox(await canvas.findByRole('radio', { name }))),
    );

    for (const box of boxes) {
      await expect(Math.round(stack.width - box.width)).toBe(0);
      await expect(Math.round(stack.left - box.left)).toBe(0);
    }
  },
});

/** Every mode reads whole in the narrowest inspector, name and sentence alike. */
export const NoModeRowOverflowsThePanel = meta.story({
  play: async ({ canvas }) => {
    for (const name of ['Failover', 'Round-robin', 'Conditional']) {
      const row = await canvas.findByRole('radio', { name });

      await expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth);
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
 * A router that spreads some other way cannot be switched to conditional, and the row says why.
 *
 * @summary The mode needs a judge and an else child that no mode control can supply, so the row
 * stays reachable and unmovable rather than going missing without a word.
 */
export const ConditionalSaysWhatASwitchWouldNeed = meta.story({
  play: async ({ canvas }) => {
    const segment = await canvas.findByRole('radio', { name: 'Conditional' });

    await expect(segment).toHaveAttribute('aria-disabled', 'true');
    await expect(segment).toHaveAccessibleDescription(/judge/);
  },
});

/**
 * Deleting a branch names the real cost first, which is where its traffic goes next.
 *
 * @summary The act lives in the row's own context menu rather than in the rule sheet, so a person
 * fixing a typo never reads two buttons to find the safe one.
 */
export const DeletingABranchNamesItsCost = meta.story({
  args: { model: pooled(judging, true), router: judging },
  play: async ({ canvas }) => {
    await pickedFromTheRowMenu(await canvas.findByText('code'), 'Delete branch');

    await expect(await screen.findByRole('heading', { name: 'Delete the code branch?' })) //
      .toBeVisible();
    await expect(await screen.findByText(/fall to else/)).toBeVisible();
  },
});

/** Editing a rule opens the sheet on the branch a person asked about, holding its own words. */
export const EditingARuleOpensTheSheet = meta.story({
  args: { model: pooled(judging, true), router: judging },
  play: async ({ canvas }) => {
    await pickedFromTheRowMenu(await canvas.findByText('code'), 'Edit rule');

    await expect(await screen.findByLabelText('Label')).toHaveValue('code');
    await expect(await screen.findByLabelText('Rule')).toHaveValue('questions about source code');
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
