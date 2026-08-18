import type { AccountBalance, AccountsDocument } from '@recompose/contracts';

import { ACCOUNTS_VERSION } from '@recompose/contracts';
import { expect, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';

import { BalanceStrip } from './balance-strip';

const A_MINUTE = 60_000;
const NOW = Date.now();

const connected: AccountsDocument = {
  schemaVersion: ACCOUNTS_VERSION,
  accounts: [
    {
      id: 'build',
      kind: 'aggregator',
      provider: 'openrouter',
      label: 'build key',
      credentialRef: 'ref',
    },
  ],
};

const held: AccountBalance = {
  accountId: 'build',
  reading: { totalCredits: 100, totalUsage: 62.29, readAt: NOW - 3 * A_MINUTE },
};

function answeringRefreshWith(onRefresh: readonly AccountBalance[]) {
  return {
    accounts: connected,
    overrides: {
      'usage:balances': async ({ refresh }: { refresh: boolean }) =>
        Promise.resolve({ ok: true as const, value: refresh ? onRefresh : [held] }),
    },
  };
}

const meta = preview.meta({
  component: BalanceStrip,
  parameters: { bridge: { accounts: connected, balances: [held] } },
  decorators: [
    (Story) => (
      <div className="w-column bg-surface-content p-4">
        <Story />
      </div>
    ),
  ],
});

/** Credits as a reading at a moment: what is left, what it came from, and when it was taken. */
export const AStampedReading = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('region', { name: 'Credits' })).toBeVisible();
    await expect(await canvas.findByText('$37.71')).toBeVisible();
    await expect(await canvas.findByText('Read 3m ago')).toBeVisible();
  },
});

/** A refresh that could not reach the vendor keeps the last figure and names the failure. */
export const AFailedRefreshKeepsTheReading = meta.story({
  parameters: {
    bridge: answeringRefreshWith([{ ...held, failure: 'OpenRouter could not be reached.' }]),
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('$37.71')).toBeVisible();

    await userEvent.click(await canvas.findByRole('button', { name: 'Refresh credits' }));

    await expect(await canvas.findByText('OpenRouter could not be reached.')).toBeVisible();
    await expect(await canvas.findByText('$37.71')).toBeVisible();
  },
});

/** A first read that never landed prints no figure rather than a zero it cannot vouch for. */
export const NothingReadYet = meta.story({
  parameters: {
    bridge: {
      accounts: connected,
      balances: [{ accountId: 'build', failure: 'OpenRouter could not be reached.' }],
    },
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('—')).toBeVisible();
    await expect(await canvas.findByText('OpenRouter could not be reached.')).toBeVisible();
  },
});

/** The same card in the dark scheme, where the headline figure has to stay the brightest ink. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
