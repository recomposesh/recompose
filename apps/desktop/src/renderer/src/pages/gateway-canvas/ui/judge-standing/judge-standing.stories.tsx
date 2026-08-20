import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import type { NodePlace } from '../../lib/judge-cooldown';

import { pushingCooldowns } from '../../testing/engine-pushes.testkit';
import { servingBridgeWorld, storedAccounts, workKey } from '../../testing/gateway-canvas.testkit';
import { framedAsDrawerPanel } from '../../testing/subject-shell.testkit';
import { JudgeStanding } from './judge-standing';

const PLACE: NodePlace = { slug: 'my-gateway', virtualModel: 'pooled', routeNode: 'j1' };

const BACK_AT = new Date(2026, 7, 20, 12, 5, 0).getTime();

const NOON = new Date(2026, 7, 20, 12, 0, 0).getTime();

function JudgeStandingUnderProof(props: { account: typeof workKey | undefined; now: number }) {
  return framedAsDrawerPanel(
    <div className="field-box">
      <JudgeStanding account={props.account} now={props.now} place={PLACE} />
    </div>,
  );
}

const meta = preview.meta({
  component: JudgeStandingUnderProof,
  args: { account: workKey, now: NOON },
  parameters: { bridge: { ...servingBridgeWorld, accounts: storedAccounts } },
});

/** A judge nothing refused reads as bound, and owes no window a person has to wait out. */
export const Basic = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Bound')).toBeVisible();
    await expect(canvas.queryByText('Back by')).toBeNull();
  },
});

/**
 * A cooling judge prints the clock it is back by, standing still rather than counting down.
 *
 * @summary The window belongs here rather than on the canvas: a number ticking beside the
 * composition pulls the eye every second, while a clock time read once in the inspector stays true
 * however long the drawer stands open.
 */
export const ACoolingJudgePrintsWhenItIsBack = meta.story({
  decorators: [pushingCooldowns({ 'my-gateway': { pooled: { j1: BACK_AT } } })],
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Cooling')).toBeVisible();
    await expect(await canvas.findByText('Back by')).toBeVisible();
    await expect(await canvas.findByText('12:05')).toBeVisible();
  },
});

/** A window already behind the clock says nothing, because the judge is answering again. */
export const AWindowAlreadyPassedSaysNothing = meta.story({
  args: { now: BACK_AT },
  decorators: [pushingCooldowns({ 'my-gateway': { pooled: { j1: BACK_AT } } })],
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Bound')).toBeVisible();
    await expect(canvas.queryByText('12:05')).toBeNull();
  },
});

/** An account that left the registry outranks a window, because no waiting will fix it. */
export const AJudgeWhoseAccountLeftSaysThatFirst = meta.story({
  args: { account: undefined },
  decorators: [pushingCooldowns({ 'my-gateway': { pooled: { j1: BACK_AT } } })],
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Account left the registry')).toBeVisible();
    await expect(canvas.queryByText('Cooling')).toBeNull();
  },
});

/** The standing in the dark scheme, where its chip has to read against the drawer. */
export const DarkScheme = meta.story({
  globals: { theme: 'dark' },
  decorators: [pushingCooldowns({ 'my-gateway': { pooled: { j1: BACK_AT } } })],
});
