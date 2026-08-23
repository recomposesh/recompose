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

function signedInWith(quotaWindows: readonly QuotaWindow[]) {
  return { bridge: { accounts: signedIn, quotaWindows } };
}

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
    await expect(await canvas.findByRole('region', { name: 'Plan usage limits' })).toBeVisible();
    await expect(await canvas.findByText('Record 2.0M on Aug 3')).toBeVisible();
    await expect(await canvas.findByText('1.2M sent')).toBeVisible();
  },
});

/** The caption that keeps the two derivations apart, so no figure can read as the other. */
export const NamingItsDerivation = meta.story({
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText(/The share each vendor reports for its own plan/),
    ).toBeVisible();
  },
});

/** The inferred reset, named by the hour it lands on and marked approximate. */
export const CountingDownToTheClose = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/^Resets .*~\d{1,2}:\d{2} [AP]M$/)).toBeVisible();
  },
});

/** A plan the vendor measured for itself, which is the only share here that means a quota. */
export const MeasuredByTheVendor = meta.story({
  parameters: signedInWith([
    {
      accountId: 'work',
      provider: 'anthropic',
      length: '5h',
      openedAt: NOW - AN_HOUR,
      closesAt: NOW + AN_HOUR,
      burnTokens: 1_200_000,
      reported: { spentShare: 0.23, readAt: NOW, resetsAt: NOW + 2 * AN_HOUR },
    },
    {
      accountId: 'work',
      provider: 'anthropic',
      length: 'week',
      burnTokens: 8_400_000,
      reported: { spentShare: 0.41, readAt: NOW, resetsAt: NOW + 3 * 24 * AN_HOUR },
    },
  ]),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('23% used')).toBeVisible();
    await expect(await canvas.findByText('41% used')).toBeVisible();
    await expect(await canvas.findByText('1.2M through this machine')).toBeVisible();
  },
});

/** A window that burned past every earlier one says so, and its bar still stops short of the end. */
export const TheBusiestOnRecord = meta.story({
  parameters: signedInWith([
    {
      accountId: 'work',
      provider: 'anthropic',
      length: '5h',
      openedAt: NOW - AN_HOUR,
      closesAt: NOW + AN_HOUR,
      burnTokens: 2_000_000,
      record: { burnTokens: 2_000_000, openedAt: NOW - AN_HOUR },
    },
  ]),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Busiest window on record')).toBeVisible();
    await expect(await canvas.findByText('2.0M sent')).toBeVisible();
  },
});

/** An account with nothing on record yet carries its burn and says nothing it cannot prove. */
export const NothingOnRecordYet = meta.story({
  parameters: signedInWith([
    { accountId: 'work', provider: 'anthropic', length: '5h', burnTokens: 0 },
  ]),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('0 sent')).toBeVisible();
  },
});

/** Two plans on one address, told apart by the plan product each card heads with. */
export const TwoPlansOneAddress = meta.story({
  parameters: {
    bridge: {
      accounts: {
        schemaVersion: ACCOUNTS_VERSION,
        accounts: [
          {
            id: 'work',
            kind: 'subscription',
            provider: 'anthropic',
            label: 'dev@example.com',
            provenance: 'sign-in',
          },
          {
            id: 'codex-work',
            kind: 'subscription',
            provider: 'openai',
            label: 'dev@example.com',
            provenance: 'sign-in',
          },
        ],
      } satisfies AccountsDocument,
      quotaWindows: [
        ...openWindows,
        {
          accountId: 'codex-work',
          provider: 'openai',
          length: '5h',
          openedAt: NOW - AN_HOUR,
          closesAt: NOW + AN_HOUR,
          burnTokens: 300_000,
          record: { burnTokens: 500_000, openedAt: AUGUST_THIRD },
        },
      ] satisfies readonly QuotaWindow[],
    },
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Claude', { exact: true })).toBeVisible();
    await expect(await canvas.findByText('Codex', { exact: true })).toBeVisible();
    await expect(await canvas.findAllByText('dev@example.com')).toHaveLength(2);
  },
});

/** A plan signed into but never sent through, drawn as the card it will become. */
export const AwaitingItsFirstRequest = meta.story({
  parameters: signedInWith([]),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('No traffic yet')).toBeVisible();
  },
});

/** The same strip in the dark scheme, where the track has to stay legible under the fill. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
