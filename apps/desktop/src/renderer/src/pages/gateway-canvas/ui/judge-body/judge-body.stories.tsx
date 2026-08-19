import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import type { JudgeBinding } from './judge-body';

import { storedAccounts, workKey } from '../../testing/gateway-canvas.testkit';
import { framedAsDrawerPanel } from '../../testing/subject-shell.testkit';
import { judgeBody } from './judge-body';

const bound: JudgeBinding = {
  account: workKey,
  accountId: workKey.id,
  providerModel: 'claude-haiku-4-5',
  advises: 'Conditional',
};

const orphaned: JudgeBinding = { ...bound, account: undefined, accountId: 'gone' };

function JudgeSubjectUnderProof({ judge }: { judge: JudgeBinding }) {
  return framedAsDrawerPanel(judgeBody(judge, []));
}

const meta = preview.meta({
  component: JudgeSubjectUnderProof,
  args: { judge: bound },
  parameters: { bridge: { accounts: storedAccounts } },
});

/** The judge subject's body: what it classifies with, and the router whose branches it decides. */
export const Basic = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('claude-haiku-4-5')).toBeVisible();
    await expect(await canvas.findByText('Conditional')).toBeVisible();
    await expect(await canvas.findByText('Bound')).toBeVisible();
  },
});

/** The body says where routing trouble lands, since that is what a judge failing actually costs. */
export const ItSaysWhereTroubleLands = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/else branch/u)).toBeVisible();
  },
});

/**
 * A judge whose account left the registry says so, because from then on every request goes to else.
 *
 * @summary It keeps its own body rather than falling back to the removed-provider one, since a
 * person repairing it is looking for the judge rather than for a target.
 */
export const AJudgeWhoseAccountLeft = meta.story({
  args: { judge: orphaned },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { name: 'gone' })).toBeVisible();
    await expect(await canvas.findByText('Account left the registry')).toBeVisible();
  },
});

/** The judge body in the dark scheme, where its standing has to read against the drawer. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
