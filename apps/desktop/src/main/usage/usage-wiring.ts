import type { Account, CredentialedAccount, LogRow, PlanUsageReadings } from '@recompose/contracts';

import { join } from 'node:path';

import type { UsageIpcDeps } from '../ipc/usage-ipc';
import type { SecretCodec } from '../storage/safe-storage-codec';
import type { CreditsReading } from './balances';
import type { UsageStore } from './usage-store';

import { openVault } from '../ipc/open-vault';
import { storagePathsFor } from '../ipc/storage-context';
import { loadAccountsFile } from '../storage/accounts-store';
import { getSecret } from '../storage/vault';
import { openBalanceStore } from './balance-store';
import {
  balanceFromAnswer,
  creditsRefusalForStatus,
  MANAGEMENT_KEY_WANTED,
  openBalancesDesk,
  balanceReadableAccountsIn,
} from './balances';
import { openPriceMap } from './price-map';

type UsageWiringReach = {
  userDataPath: string;
  homeFolder: string;
  getCodec: () => SecretCodec;
  onCorrupt: (quarantinedPath: string) => void;
};

/**
 * The read-only credential a balance card stands on, never the one the account spends.
 *
 * @summary The key serving requests is deliberately unreachable from here. OpenRouter refuses it
 * at the credits endpoint anyway, so sending it would buy a round trip and the same wall, and the
 * whole point of the second credential is that only this read may reach for it.
 */
type BalanceReach = { vendor: BalanceVendor; ref: string };

function refFor(row: CredentialedAccount, vendor: BalanceVendor): string {
  if (BALANCE_ENDPOINTS[vendor].reads === 'served') {
    return row.credentialRef;
  }

  if (row.readerCredentialRef === undefined) {
    throw new Error(MANAGEMENT_KEY_WANTED);
  }

  return row.readerCredentialRef;
}

function credentialedRow(row: Account | undefined): CredentialedAccount | undefined {
  return row === undefined || row.kind === 'subscription' || row.kind === 'local' ? undefined : row;
}

async function balanceReachOf(reach: UsageWiringReach, accountId: string): Promise<BalanceReach> {
  const paths = storagePathsFor(reach.userDataPath);
  const accounts = await loadAccountsFile(paths.accountsFile, reach.onCorrupt);
  const row = credentialedRow(accounts.accounts.find((held) => held.id === accountId));
  const vendor = row === undefined ? undefined : balanceVendorOf(row.provider);

  if (row === undefined || vendor === undefined) {
    throw new Error(`no account that reports a balance is held under ${accountId}.`);
  }

  return { vendor, ref: refFor(row, vendor) };
}

async function balanceReadFor(reach: UsageWiringReach, accountId: string): Promise<CreditsReading> {
  const { vendor, ref } = await balanceReachOf(reach, accountId);
  const paths = storagePathsFor(reach.userDataPath);
  const opened = await openVault(paths.vaultFile, reach.onCorrupt, reach.homeFolder);

  if (!opened.ok) {
    throw new Error(opened.error.message);
  }

  const secret = getSecret(opened.vault, reach.getCodec(), ref);

  if (secret === undefined) {
    throw new Error('The vault holds no secret for this account.');
  }

  return balanceWith(vendor, secret);
}

/**
 * Where each vendor publishes a balance, and which credential reaches it.
 *
 * @summary A vendor stands here only where its own documentation names the endpoint, so adding one
 * is a row rather than a branch. `reads` says which key the read presents: OpenRouter refuses the
 * key it serves with and takes the account's read-only one, while the rest answer the ordinary key.
 */
const BALANCE_ENDPOINTS = {
  openrouter: { url: 'https://openrouter.ai/api/v1/credits', reads: 'reader' },
  deepseek: { url: 'https://api.deepseek.com/user/balance', reads: 'served' },
  moonshot: { url: 'https://api.moonshot.ai/v1/users/me/balance', reads: 'served' },
} as const;

type BalanceVendor = keyof typeof BALANCE_ENDPOINTS;

const BALANCE_VENDORS = [
  'openrouter',
  'deepseek',
  'moonshot',
] as const satisfies readonly BalanceVendor[];

function balanceVendorOf(provider: string): BalanceVendor | undefined {
  return BALANCE_VENDORS.find((named) => named === provider);
}

async function balanceWith(vendor: BalanceVendor, secret: string): Promise<CreditsReading> {
  const answer = await fetch(BALANCE_ENDPOINTS[vendor].url, {
    headers: { Authorization: `Bearer ${secret}` },
  });

  if (!answer.ok) {
    throw new Error(creditsRefusalForStatus(answer.status));
  }

  const credits = balanceFromAnswer(vendor, await answer.json());

  if ('refusal' in credits) {
    throw new Error(credits.refusal);
  }

  return credits.read;
}

export type UsageWiring = {
  reach: () => UsageWiringReach;
  store: UsageStore;
  retainedRows: () => readonly LogRow[];
  planUsage: () => PlanUsageReadings;
  bundledPricesFile: string;
  bundledRegistryPricesFile: string;
  noteUsageTable?: (open: boolean) => void;
};

/**
 * The dependencies the usage channels answer from, composed at the app's edge.
 *
 * @summary The report reads the boot's store and the price map this opens beside it, the quota
 * fold borrows the host's retained rows and the plan readings this launch has heard, and the
 * balance cards reach OpenRouter with the vaulted key of each aggregator account. The menu note
 * stands quiet until the Usage menu lands to read it.
 */
export async function openUsageIpcDeps(wiring: UsageWiring): Promise<UsageIpcDeps> {
  const [priceMap, balanceStore] = await Promise.all([
    openPriceMap({
      cacheFile: join(wiring.reach().userDataPath, 'prices.json'),
      bundledFile: wiring.bundledPricesFile,
      bundledRegistryFile: wiring.bundledRegistryPricesFile,
      onCorrupt: wiring.reach().onCorrupt,
    }),
    openBalanceStore({
      file: storagePathsFor(wiring.reach().userDataPath).balancesFile,
      onCorrupt: wiring.reach().onCorrupt,
    }),
  ]);

  return {
    store: wiring.store,
    standingPrices: priceMap.standing,
    retainedRows: wiring.retainedRows,
    planUsage: wiring.planUsage,
    balances: openBalancesDesk({
      kept: balanceStore.restored(),
      onKept: balanceStore.keep,
      aggregatorAccounts: async () => {
        const reach = wiring.reach();

        return balanceReadableAccountsIn(
          await loadAccountsFile(storagePathsFor(reach.userDataPath).accountsFile, reach.onCorrupt),
        );
      },
      creditsOf: async (accountId) => balanceReadFor(wiring.reach(), accountId),
    }),
    noteUsageTable: wiring.noteUsageTable ?? (() => undefined),
  };
}
