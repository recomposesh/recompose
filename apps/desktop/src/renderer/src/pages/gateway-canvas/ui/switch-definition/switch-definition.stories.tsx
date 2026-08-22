import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import type { RouterChild } from '../router-child-list/router-child';

import { gatewaySeed } from '../../../../shared/testing';
import { switchBindingJudge, switchOpenedOn, switchRuling } from '../../lib/conditional-draft';
import { storedAccounts } from '../../testing/gateway-canvas.testkit';
import { framedAsDrawerBox } from '../../testing/subject-shell.testkit';
import { SwitchDefinition } from './switch-definition';

const ladder: readonly RouterChild[] = [
  { routeNodeId: 'c1', cardId: 'target:fast@c1', name: 'work', detail: 'claude-sonnet-5' },
  { routeNodeId: 'c2', cardId: 'target:fast@c2', name: 'spare', detail: 'claude-opus-5' },
  { routeNodeId: 'c3', cardId: 'target:fast@c3', name: 'Ollama', detail: 'qwen3' },
];

const opened = switchOpenedOn(['c1', 'c2', 'c3']);

const worded = switchBindingJudge(
  switchRuling(
    switchRuling(opened, 'c1', { label: 'code', rule: 'questions about source code' }),
    'c2',
    { label: 'chat', rule: 'everything conversational' },
  ),
  { accountId: 'k1', providerModel: 'claude-haiku-4-5' },
);

const meta = preview.meta({
  component: SwitchDefinition,
  args: {
    accounts: storedAccounts.accounts,
    gateway: gatewaySeed({ slug: 'my-gateway', displayName: 'My Gateway', port: 8397 }),
    held: opened,
    modelId: 'pooled',
    offered: { offered: [], refusal: undefined },
    onDropChild: () => {},
    onHeld: () => {},
    onOpen: () => {},
    onPicking: () => {},
    onRewrite: () => {},
    picking: undefined,
    routeNodeId: 'r1',
    rows: ladder,
  },
  decorators: [framedAsDrawerBox],
});

/**
 * The definition a person lands in on choosing conditional, with every branch still owing words.
 *
 * @summary Nothing is stored until the whole policy stands, so the panel says what is owed rather
 * than offering a press the stored shape would refuse.
 */
export const NothingWordedYet = meta.story({
  play: async ({ canvas }) => {
    const switching = await canvas.findByRole('button', { name: 'Switch to conditional' });

    await expect(switching).toBeDisabled();
    await expect(await canvas.findByText(/Nothing is stored until/)).toBeVisible();
  },
});

/**
 * A branch waiting for its words says so in amber, on the row that owes them.
 *
 * @summary The blank is the whole reason a switch cannot be saved, so the row standing in the way
 * is the row that names it rather than an empty column a person has to interpret.
 */
export const AnUnwordedBranchSaysWhatItOwes = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findAllByText('Needs a rule')).toHaveLength(2);
  },
});

/** The last row stands as the else and keeps its place, saying why rather than losing controls. */
export const TheLastRowStandsAsTheElse = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Else')).toBeVisible();
    await expect(
      await canvas.findByText(/catches a request the judge read but could not place/),
    ).toBeVisible();
  },
});

/** Worded branches read back the labels a person wrote, so the ladder says what it routes by. */
export const EveryBranchWorded = meta.story({
  args: { held: worded },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('chat')).toBeVisible();
    await expect(canvas.queryByText('Needs a rule')).toBeNull();
  },
});

/** A whole definition offers the press that stores it, and stops saying what is owed. */
export const AWholeDefinitionCanLand = meta.story({
  args: { held: worded },
  play: async ({ canvas }) => {
    const switching = await canvas.findByRole('button', { name: 'Switch to conditional' });

    await expect(switching).toBeEnabled();
    await expect(canvas.queryByText(/Nothing is stored until/)).toBeNull();
  },
});

/** The definition in the dark scheme, where the amber a branch owes must hold against the panel. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
