import type { GatewayConfig, RouteNode, VirtualModel } from '@recompose/contracts';

import { expect, screen } from 'storybook/test';

import preview from '#.storybook/preview';

import type { StoredRouter } from './router-inspector';

import { gatewaySeed } from '../../../../shared/testing';
import { pushingPins } from '../../testing/branch-pins.testkit';
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

/**
 * The rhythm section is titled by the act its toggle carries out, never by a category.
 *
 * @summary A person reading the panel meets the decision they are about to make rather than a
 * heading they have to translate into one.
 */
export const TheRhythmSectionNamesItsAct = meta.story({
  args: { model: pooled(judging, true), router: judging },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('heading', { name: 'Re-judge every request' }),
    ).toBeVisible();
  },
});

/** Resting, the sentence says a conversation stays on the branch it first earned. */
export const ConditionalKeepsTheBranchItEarned = meta.story({
  args: { model: pooled(judging, true), router: judging },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('switch', { name: 'Re-judge every request' }),
    ).not.toBeChecked();
    await expect(await canvas.findByText(/stays on the branch it first earned/)).toBeVisible();
  },
});

/** Switched on, the sentence says the judge reads every request and names the one exception. */
export const ConditionalRejudgingSaysWhatItDoes = meta.story({
  args: { model: pooled(rejudging, true), router: rejudging },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/picks a branch for every request/)).toBeVisible();
    await expect(await canvas.findByText(/server-held state/)).toBeVisible();
  },
});

const childless = { ...failover, children: [] };

const emptyRouter = {
  model: {
    ...pooled(failover),
    routing: { entry: 'r1', nodes: { r1: childless } },
  },
  router: childless,
};

/**
 * A router holding no child cannot be switched to conditional, and the row says why.
 *
 * @summary The mode names an else child among the children, so a switch on an empty ladder would
 * have to invent a binding nobody made. The row stays reachable and unmovable rather than going
 * missing without a word.
 */
export const ConditionalSaysWhatASwitchWouldNeed = meta.story({
  args: emptyRouter,
  play: async ({ canvas }) => {
    const row = await canvas.findByRole('radio', { name: 'Conditional' });

    await expect(row).toHaveAttribute('aria-disabled', 'true');
    await expect(row).toHaveAccessibleDescription(/judge/);
  },
});

/**
 * Choosing conditional on a childful router opens the definition over the children it holds.
 *
 * @summary Nothing is stored by the choice itself, because the stored shape refuses a conditional
 * router missing a judge or a worded branch. The bindings a person already made arrive as draft
 * branches instead, each saying what it owes, and the last standing as the else.
 */
export const ChoosingConditionalOpensTheDefinition = meta.story({
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('radio', { name: 'Conditional' }));

    await expect(await canvas.findByText('Needs a rule')).toBeVisible();
    await expect(await canvas.findByText('Else')).toBeVisible();
    await expect(await canvas.findByRole('button', { name: 'Switch to conditional' })) //
      .toBeDisabled();
  },
});

/**
 * Wording a branch writes into the definition, and the switch stays shut on what is still owed.
 *
 * @summary The words land in the held definition rather than in storage, so a person can word one
 * branch, walk away, and find the router spreading exactly as it did.
 */
export const WordingOneBranchLeavesTheRestOwing = meta.story({
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('radio', { name: 'Conditional' }));
    await pickedFromTheRowMenu(await canvas.findByText('Needs a rule'), 'Edit rule');
    await userEvent.type(await screen.findByLabelText('Label'), 'code');
    await userEvent.type(await screen.findByLabelText('Rule'), 'questions about source code');
    await userEvent.click(await screen.findByRole('button', { name: 'Save branch' }));

    await expect(await canvas.findByText('code')).toBeVisible();
    await expect(await canvas.findByRole('button', { name: 'Switch to conditional' })) //
      .toBeDisabled();
  },
});

/** Leaving the definition stores nothing, so trying this mode costs a person nothing. */
export const CancellingTheSwitchStoresNothing = meta.story({
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('radio', { name: 'Conditional' }));
    await userEvent.click(await canvas.findByRole('button', { name: 'Cancel' }));

    await expect(await canvas.findByRole('radio', { name: 'Failover' })).toBeChecked();
    await expect(await canvas.findByRole('radio', { name: 'Conditional' })).not.toBeChecked();
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

/**
 * A branch says how many conversations it is holding, the moment the engine says it changed.
 *
 * @summary The count arrives by push rather than by asking, so a conversation pinned while the
 * inspector stands open moves the number under a person's eyes with nothing on screen polling.
 */
export const BranchRowsCountTheirPinnedConversations = meta.story({
  args: { model: pooled(judging, true), router: judging },
  decorators: [pushingPins({ 'my-gateway': { pooled: { r1: { t1: 3 } } } })],
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('3 pinned')).toBeVisible();
  },
});

/** The conditional inspector in the dark scheme, where the judge box sits on the drawer panel. */
export const ConditionalDarkScheme = meta.story({
  args: { model: pooled(judging, true), router: judging },
  globals: { theme: 'dark' },
});

/** A router holding no child says so and names the gesture that fills it. */
export const AnEmptyRouterInvitesItsFirstChild = meta.story({
  args: emptyRouter,
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/no child yet/)).toBeVisible();
  },
});
