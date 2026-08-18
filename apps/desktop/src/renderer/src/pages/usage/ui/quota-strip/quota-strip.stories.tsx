import type { AccountsDocument, QuotaWindow } from '@recompose/contracts';

import { ACCOUNTS_VERSION } from '@recompose/contracts';
import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { QuotaStrip } from './quota-strip';

const AN_HOUR = 3_600_000;
const A_MINUTE = 60_000;
const NOW = Date.now();
const AUGUST_THIRD = Date.UTC(2026, 7, 3, 9, 0);

const signedIn: AccountsDocument = {
  schemaVersion: ACCOUNTS_VERSION,
  accounts: [
    {
      id: 'work',
      kind: 'subscription',
      provider: 'anthropic',
      label: 'Claude Max',
      provenance: 'sign-in',
    },
  ],
};

const openWindows: readonly QuotaWindow[] = [
  {
    accountId: 'work',
    provider: 'anthropic',
    length: '5h',
    openedAt: NOW - AN_HOUR,
    closesAt: NOW + 2 * AN_HOUR + 14 * A_MINUTE,
    burnTokens: 1_200_000,
    record: { burnTokens: 2_000_000, openedAt: AUGUST_THIRD },
  },
  {
    accountId: 'work',
    provider: 'anthropic',
    length: 'week',
    burnTokens: 8_400_000,
    record: { burnTokens: 12_000_000, openedAt: AUGUST_THIRD },
  },
];

const meta = preview.meta({
  component: QuotaStrip,
  parameters: { bridge: { accounts: signedIn, quotaWindows: openWindows } },
  decorators: [
    (Story) => (
      <div className="w-column bg-surface-content p-4">
        <Story />
      </div>
    ),
  ],
});

/** A five-hour burn part way toward the account's own record, with the week beneath it. */
export const BurningTowardTheRecord = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('region', { name: 'Quota windows' })).toBeVisible();

    const gauge = await canvas.findByRole('meter', { name: 'Claude Max 5-hour window burn' });

    await expect(gauge).toHaveAttribute('aria-valuenow', '0.48');
    await expect(await canvas.findByText('Record 2.0M on Aug 3')).toBeVisible();
  },
});

/** The caption that keeps every figure honest: local logs, and no official quota anywhere. */
export const NamingItsDerivation = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/Not an official quota/)).toBeVisible();
  },
});

/** The five-hour countdown, approximate because the anchor was inferred from a quiet stretch. */
export const CountingDownToTheClose = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/Closes in ≈2h 1[34]m/)).toBeVisible();
  },
});

/** A window that outburned every earlier one says so, and its bar still stops short of the end. */
export const TheBusiestOnRecord = meta.story({
  parameters: {
    bridge: {
      accounts: signedIn,
      quotaWindows: [
        {
          accountId: 'work',
          provider: 'anthropic',
          length: '5h',
          openedAt: NOW - AN_HOUR,
          closesAt: NOW + AN_HOUR,
          burnTokens: 2_000_000,
          record: { burnTokens: 2_000_000, openedAt: NOW - AN_HOUR },
        },
      ],
    },
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Busiest window on record')).toBeVisible();

    const gauge = await canvas.findByRole('meter', { name: 'Claude Max 5-hour window burn' });

    await expect(Number(gauge.getAttribute('aria-valuenow'))).toBeLessThan(1);
  },
});

/** An account with nothing on record yet carries its burn without a gauge to measure it. */
export const NothingOnRecordYet = meta.story({
  parameters: {
    bridge: {
      accounts: signedIn,
      quotaWindows: [
        {
          accountId: 'work',
          provider: 'anthropic',
          length: '5h',
          burnTokens: 0,
        },
      ],
    },
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('No window on record yet')).toBeVisible();
  },
});

/** The same strip in the dark scheme, where the track has to stay legible under the fill. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
