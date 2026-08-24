import type { SubscriptionAccount, SubscriptionProviderId } from '@recompose/contracts';

import { randomUUID } from 'node:crypto';

import type { OneAtATime } from '../storage/one-at-a-time';
import type { IpcHandlers } from './dispatch';
import type { Answered, SubscriptionsIpcContext, Workshop } from './subscriptions-workshop';

import {
  machineCredentialMaterial,
  readMachineCredential,
} from '../subscriptions/machine-credential';
import { machineStoreFor } from '../subscriptions/machine-store';
import { subscriptionHomes } from '../subscriptions/subscription-homes';
import { heldUnderTheAddress } from '../subscriptions/subscription-views';
import { storagePathsFor } from './storage-context';
import { ipcFailure } from './storage-envelope';
import {
  readAccounts,
  recordTheAccount,
  refusalFailure,
  standingUnderTheAddress,
  viewsOf,
} from './subscriptions-workshop';

export type SubscriptionsMachineIpcHandlers = Pick<
  IpcHandlers,
  'subscriptions:detect' | 'subscriptions:adopt'
>;

function storeOn(shop: Workshop, provider: SubscriptionProviderId) {
  return machineStoreFor(provider, shop.ctx.machine);
}

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
 * @summary Adoption records the account and copies no credential, so the store the provider's own
 * tool writes stays the one place it lives and that tool alone ever rotates it.
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
