import type { LogRow } from '@recompose/contracts';

import { join } from 'node:path';

import type { UsageIpcDeps } from '../ipc/usage-ipc';
import type { SecretCodec } from '../storage/safe-storage-codec';
import type { CreditsReading } from './balances';
import type { UsageStore } from './usage-store';

import { openVault } from '../ipc/open-vault';
import { storagePathsFor } from '../ipc/storage-context';
import { loadAccountsFile } from '../storage/accounts-store';
import { getSecret } from '../storage/vault';
import { creditsFromAnswer, openBalancesDesk, openRouterAccountsIn } from './balances';
import { openPriceMap } from './price-map';

type UsageWiringReach = {
  userDataPath: string;
  homeFolder: string;
  getCodec: () => SecretCodec;
  onCorrupt: (quarantinedPath: string) => void;
};

async function aggregatorSecretOf(reach: UsageWiringReach, accountId: string): Promise<string> {
  const paths = storagePathsFor(reach.userDataPath);
  const accounts = await loadAccountsFile(paths.accountsFile, reach.onCorrupt);
  const row = accounts.accounts.find((held) => held.id === accountId);

  if (row?.kind !== 'aggregator') {
    throw new Error(`no aggregator account is held under ${accountId}.`);
  }

  const opened = await openVault(paths.vaultFile, reach.onCorrupt, reach.homeFolder);

  if (!opened.ok) {
    throw new Error(opened.error.message);
  }

  const secret = getSecret(opened.vault, reach.getCodec(), row.credentialRef);

  if (secret === undefined) {
    throw new Error('The vault holds no secret for this account.');
  }

  return secret;
}

async function openRouterCreditsWith(secret: string): Promise<CreditsReading> {
  const answer = await fetch('https://openrouter.ai/api/v1/credits', {
    headers: { Authorization: `Bearer ${secret}` },
  });

  if (!answer.ok) {
    throw new Error(`The credits endpoint answered ${String(answer.status)}.`);
  }

  const credits = creditsFromAnswer(await answer.json());

  if (credits === undefined) {
    throw new Error('The credits answer held no readable totals.');
  }

  return credits;
}

export type UsageWiring = {
  reach: () => UsageWiringReach;
  store: UsageStore;
  retainedRows: () => readonly LogRow[];
  bundledPricesFile: string;
  noteUsageTable?: (open: boolean) => void;
};

/**
 * The dependencies the usage channels answer from, composed at the app's edge.
 *
 * @summary The report reads the boot's store and the price map this opens beside it, the quota
 * fold borrows the host's retained rows, and the balance cards reach OpenRouter with the vaulted
 * key of each aggregator account. The menu note stands quiet until the Usage menu lands to read
 * it.
 */
export async function openUsageIpcDeps(wiring: UsageWiring): Promise<UsageIpcDeps> {
  const priceMap = await openPriceMap({
    cacheFile: join(wiring.reach().userDataPath, 'prices.json'),
    bundledFile: wiring.bundledPricesFile,
    onCorrupt: wiring.reach().onCorrupt,
  });

  return {
    store: wiring.store,
    standingPrices: priceMap.standing,
    retainedRows: wiring.retainedRows,
    balances: openBalancesDesk({
      aggregatorAccounts: async () => {
        const reach = wiring.reach();

        return openRouterAccountsIn(
          await loadAccountsFile(storagePathsFor(reach.userDataPath).accountsFile, reach.onCorrupt),
        );
      },
      creditsOf: async (accountId) =>
        openRouterCreditsWith(await aggregatorSecretOf(wiring.reach(), accountId)),
    }),
    noteUsageTable: wiring.noteUsageTable ?? (() => undefined),
  };
}
