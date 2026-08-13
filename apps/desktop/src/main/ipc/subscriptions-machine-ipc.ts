import type {
  AccountsDocument,
  SubscriptionAccount,
  SubscriptionProviderId,
} from '@recompose/contracts';

import { randomUUID } from 'node:crypto';

import type { OneAtATime } from '../storage/one-at-a-time';
import type { IpcHandlers } from './dispatch';
import type { Answered, SubscriptionsIpcContext, Workshop } from './subscriptions-workshop';

import { custodyOver } from '../subscriptions/credential-custody';
import {
  machineCredentialMaterial,
  readMachineCredential,
} from '../subscriptions/machine-credential';
import { machineStoreFor } from '../subscriptions/machine-store';
import { subscriptionHomes } from '../subscriptions/subscription-homes';
import { heldUnderTheAddress, isSubscription } from '../subscriptions/subscription-views';
import { storagePathsFor } from './storage-context';
import { ipcFailure } from './storage-envelope';
import { readAccounts, recordTheAccount, refusalFailure, viewsOf } from './subscriptions-workshop';

export type SubscriptionsMachineIpcHandlers = Pick<
  IpcHandlers,
  'subscriptions:detect' | 'subscriptions:adopt'
>;

/**
 * @summary Adoption makes no config home, so the identity records a sign-in leaves behind are not
 * there to match on. The stored label carries the address instead, which is what keeps one address
 * standing as one account however it arrived.
 */
function standingUnderTheAddress(
  accounts: AccountsDocument,
  provider: SubscriptionProviderId,
  address: string | undefined,
): string | null {
  if (address === undefined) {
    return null;
  }

  const held = accounts.accounts.find(
    (row) => isSubscription(row) && row.provider === provider && row.label === address,
  );

  return held?.id ?? null;
}

function storeOn(shop: Workshop, provider: SubscriptionProviderId) {
  return machineStoreFor({
    provider,
    homeFolder: shop.ctx.homeFolder,
    platform: shop.ctx.platform,
    custody: custodyOver(shop.ctx.custody, provider),
  });
}

/**
 * @summary Adoption records the account and writes the credential into a home of its own, so the
 * app reads its own item from here on and the item the person's install reads stays untouched.
 */
async function accountAdopting(
  shop: Workshop,
  provider: SubscriptionProviderId,
  address: string | undefined,
): Promise<string> {
  const accounts = await readAccounts(shop);
  const held =
    standingUnderTheAddress(accounts, provider, address) ??
    (await heldUnderTheAddress(shop.homes, accounts, provider, address));

  return held ?? `acc-${randomUUID()}`;
}

/**
 * @summary Adoption records the account and writes the credential into a home of its own, so the
 * app reads its own item from here on and the item the person's install reads stays untouched.
 */
async function adopt(shop: Workshop, provider: SubscriptionProviderId): Promise<Answered> {
  const material = await machineCredentialMaterial(provider, storeOn(shop, provider));

  if (material === null) {
    return ipcFailure(
      'nothing-to-adopt',
      `nothing on this machine holds an account for ${provider} any longer.`,
    );
  }

  const id = await accountAdopting(shop, provider, material.signedInAs);
  const row: SubscriptionAccount = {
    id,
    provider,
    kind: 'subscription',
    label: material.signedInAs ?? provider,
    provenance: 'machine',
  };

  return { ok: true, value: await viewsOf(shop, await recordTheAccount(shop, row)) };
}

export function createSubscriptionsMachineIpcHandlers(
  ctx: SubscriptionsIpcContext,
  inTurn: OneAtATime,
): SubscriptionsMachineIpcHandlers {
  const shop: Workshop = {
    ctx,
    homes: subscriptionHomes(ctx.userDataPath, ctx.platform),
    accountsFile: storagePathsFor(ctx.userDataPath).accountsFile,
  };

  return {
    'subscriptions:detect': async ({ provider }) => ({
      ok: true,
      value: await readMachineCredential(provider, storeOn(shop, provider)),
    }),

    'subscriptions:adopt': async ({ provider }) =>
      inTurn(async () =>
        adopt(shop, provider).catch((cause: unknown) =>
          refusalFailure({
            ok: false,
            code: 'storage-failed',
            message: `adopting the ${provider} account on this machine failed: ${
              cause instanceof Error ? cause.message : String(cause)
            }`,
          }),
        ),
      ),
  };
}
