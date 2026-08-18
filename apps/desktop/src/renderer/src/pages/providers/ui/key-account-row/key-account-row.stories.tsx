import type { CredentialedAccount } from '@recompose/contracts';

import { ACCOUNTS_VERSION } from '@recompose/contracts';
import { expect, screen, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';

import { KeyAccountRow } from './key-account-row';

const stored: CredentialedAccount = {
  id: 'a1',
  provider: 'anthropic',
  kind: 'api-key',
  label: 'build',
  credentialRef: 'c1',
  keyTail: '7f2c',
};

const storedBeforeTheMask: CredentialedAccount = {
  id: 'a2',
  provider: 'openai',
  kind: 'api-key',
  label: 'release',
  credentialRef: 'c2',
};

const storedUnderAnUnknownProvider: CredentialedAccount = {
  id: 'a3',
  provider: 'a-plugin-vendor',
  kind: 'api-key',
  label: 'scratch',
  credentialRef: 'c3',
  keyTail: '19be',
};

const addressedByHand: CredentialedAccount = {
  id: 'a4',
  provider: 'models-example',
  kind: 'aggregator',
  label: 'house pool',
  credentialRef: 'c4',
  keyTail: '4d1a',
  endpoint: { origin: 'https://models.example.com', dialect: 'chat-completions' },
};

/**
 * Reads the overflow of a row no probe can check, which offers removal and nothing beside it.
 *
 * @summary Two rows reach this state for different reasons, an unknown vendor and an address a
 * person chose, and both prove it the same way, so the reading lives once rather than per story.
 */
async function offersRemovalAlone(overflow: HTMLElement): Promise<void> {
  await userEvent.click(overflow);

  const actions = await screen.findAllByRole('menuitem');

  await expect(actions.map((action) => action.textContent)).toEqual(['Remove']);
}

const meta = preview.meta({
  component: KeyAccountRow,
  args: { account: stored },
  parameters: { bridge: { accounts: { schemaVersion: ACCOUNTS_VERSION, accounts: [stored] } } },
  decorators: [
    (Story) => (
      <ul className="mx-auto w-full max-w-column py-4">
        <Story />
      </ul>
    ),
  ],
});

/**
 * A stored key, reading as the product it reaches over the name and the mask.
 *
 * @summary The mask publishes four characters and no vendor prefix, because the first line already
 * names the vendor and a prefix would advertise the key class for nothing. The reading asks for
 * the product title, the name, and the mask, and nothing that resembles the secret.
 */
export const Connected = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Anthropic API')).toBeVisible();
    await expect(await canvas.findByText('build')).toBeVisible();
    await expect(await canvas.findByText('••••7f2c')).toBeVisible();
  },
});

/**
 * The answer a check leaves behind, worded as of the moment it ran.
 *
 * @summary Nothing stores this sentence, so the row never carries a claim the provider can revoke
 * without telling anyone. The reading asks for the wording rather than the verdict token, because
 * the wording is the whole promise: it speaks of one check, never of a standing.
 */
export const Checked = meta.story({
  parameters: {
    bridge: {
      accounts: { schemaVersion: ACCOUNTS_VERSION, accounts: [stored] },
      keyCheck: 'authenticates' as const,
    },
  },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Actions for build' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Verify' }));

    await expect(await canvas.findByRole('status')).toHaveTextContent('at the last check');
  },
});

/**
 * A key stored before the mask existed, whose second line reads the name beside the bare bullets.
 *
 * @summary No migration can mint a tail from a secret it never reads, so the row says less rather
 * than guessing. The bullets still stand, because a card must always say a key stands there, and
 * the line stays tailless until the person reconnects the key.
 */
export const StoredBeforeTheMask = meta.story({
  args: { account: storedBeforeTheMask },
  parameters: {
    bridge: { accounts: { schemaVersion: ACCOUNTS_VERSION, accounts: [storedBeforeTheMask] } },
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('release')).toBeVisible();
    await expect(await canvas.findByText('••••')).toBeVisible();
  },
});

/**
 * A key whose provider the catalog never offered, standing with no mark and no check.
 *
 * @summary The row falls back to the provider it was stored under, because a stored row outlives
 * the catalog that made it. No probe speaks this vendor's dialect, so the row offers removal alone
 * rather than a check that could only fail.
 */
export const UnknownProvider = meta.story({
  args: { account: storedUnderAnUnknownProvider },
  parameters: {
    bridge: {
      accounts: { schemaVersion: ACCOUNTS_VERSION, accounts: [storedUnderAnUnknownProvider] },
    },
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('a-plugin-vendor')).toBeVisible();
    await offersRemovalAlone(await canvas.findByRole('button', { name: 'Actions for scratch' }));
  },
});

/**
 * A Custom aggregator, whose second line names the address the person entered.
 *
 * @summary Reach for this story when changing the second line, because it is the only row that
 * carries three readings there. Naming the address claims nothing about what the key reaches, since
 * the person chose it, which is why the row shows one and still offers removal alone.
 */
export const AddressedByHand = meta.story({
  args: { account: addressedByHand },
  parameters: {
    bridge: { accounts: { schemaVersion: ACCOUNTS_VERSION, accounts: [addressedByHand] } },
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('https://models.example.com')).toBeVisible();
    await expect(await canvas.findByText('••••4d1a')).toBeVisible();
    await offersRemovalAlone(await canvas.findByRole('button', { name: 'Actions for house pool' }));
  },
});

/** The same key row in the dark scheme, where the mask has to hold against the raised card. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });

/** A served day summarizes on the row and links into the pre-filtered explorer. */
export const WithAServedDay = meta.story({
  parameters: {
    bridge: {
      accounts: { schemaVersion: ACCOUNTS_VERSION, accounts: [stored] },
      usageReport: {
        range: '24h',
        bucketWidth: 'hour',
        buckets: [
          {
            start: Date.now() - (Date.now() % 3_600_000) - 3_600_000,
            tuple: { gateway: 'relay', provider: 'anthropic', accountId: 'a1' },
            measures: {
              requests: 17,
              failed: 0,
              answered: 17,
              durationMsSum: 8_500,
              tokens: {
                input: 0,
                output: 0,
                cacheRead: 0,
                cacheWrite: 0,
                reasoning: 0,
                total: 400,
              },
            },
          },
        ],
        dayCosts: [],
        priceMisses: [],
        pricing: { source: 'bundled' },
      },
    },
  },
  play: async ({ canvas }) => {
    const summary = await canvas.findByRole('link', { name: /17 requests/ });

    await expect(summary).toHaveAttribute(
      'href',
      expect.stringContaining('providers=%5B%22a1%22%5D'),
    );
  },
});
