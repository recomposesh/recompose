import type { SubscriptionProviderId, ToolBackedProviderId } from '@recompose/contracts';

import { randomUUID } from 'node:crypto';

import type { CredentialCustody, CustodyOutcome } from '../subscriptions/credential-custody';
import type { SubscriptionObservation } from '../subscriptions/subscription-standing';
import type { Answered, Workshop } from './subscriptions-workshop';

import { labelFor } from '../subscriptions/signed-in-label';
import { signInCommandFor } from '../subscriptions/subscription-commands';
import { awaitSignIn } from '../subscriptions/subscription-sign-in';
import { observeSubscription } from '../subscriptions/subscription-standing';
import { heldUnderTheAddress } from '../subscriptions/subscription-views';
import {
  keepTheAccount,
  readAccounts,
  refusalFailure,
  settleUnder,
  viewsOf,
} from './subscriptions-workshop';

type ToolRun = { landed: SubscriptionObservation | null; reclaimed: CustodyOutcome };

/**
 * @summary A launch that fails carries the one sentence worth reading, and on Linux it names every
 * terminal emulator that was tried. Anything else thrown here is still worth a line, because the
 * alternative is a wait with nothing behind it.
 */
function sentenceFor(cause: unknown): string {
  const said = cause instanceof Error ? cause.message.trim() : '';

  return said === '' ? 'recompose could not open a terminal for the sign-in.' : said;
}

/**
 * Runs the provider's tool against a home of its own and hands back what it left behind.
 *
 * @summary Nothing here touches the item the person's own install reads. A modern tool names its
 * keychain item after the home it was given, so a sign-in lands beside the person's login rather
 * than on top of it. An older tool writes the person's item instead, which is why the run snapshots
 * that item beforehand and, on a run that landed nothing, moves an unexpected write home and puts
 * the snapshot back.
 */
export async function runTheTool(
  shop: Workshop,
  provider: ToolBackedProviderId,
  custody: CredentialCustody | null,
): Promise<ToolRun> {
  const snapshot = custody === null ? null : await custody.readMachineItem();
  const home = await shop.homes.resetPending(provider);
  const observe = async (): Promise<SubscriptionObservation> =>
    observeSubscription({
      provider,
      home,
      outsideCredential: custody === null ? null : async () => custody.readForHome(home),
    });

  await shop.ctx
    .launch(signInCommandFor({ provider, home, platform: shop.ctx.platform }))
    .catch((cause: unknown) => {
      shop.ctx.noteLaunchRefused(provider, sentenceFor(cause));
    });

  const landed = await awaitSignIn({
    observe,
    clock: shop.ctx.clock(),
    boundMs: shop.ctx.signInBoundMs,
    everyMs: shop.ctx.signInEveryMs,
  });

  return landed !== null || custody === null
    ? { landed, reclaimed: { ok: true } }
    : reclaimAnOldToolsWrite({ custody, home, snapshot, observe });
}

type Reclaim = {
  custody: CredentialCustody;
  home: string;
  snapshot: string | null;
  observe: () => Promise<SubscriptionObservation>;
};

/**
 * @summary An older tool writes the item the person's own install reads rather than one named
 * after the home it was given. Nothing landed where the poll watched, so an item that changed
 * under the run is that tool's work: it belongs to the home, and the person's login belongs back.
 */
async function reclaimAnOldToolsWrite(what: Reclaim): Promise<ToolRun> {
  if ((await what.custody.readMachineItem()) === what.snapshot) {
    return { landed: null, reclaimed: { ok: true } };
  }

  const reclaimed = await what.custody.reclaimMachineWrite(what.home, what.snapshot);

  if (!reclaimed.ok) {
    return { landed: null, reclaimed };
  }

  const observed = await what.observe();

  return { landed: observed.standing === 'connected' ? observed : null, reclaimed };
}

export async function afterTheToolAnswers(
  shop: Workshop,
  provider: SubscriptionProviderId,
  existingId: string | null,
  custody: CredentialCustody | null,
  observed: SubscriptionObservation,
): Promise<Answered> {
  const held =
    existingId ??
    (await heldUnderTheAddress(
      shop.homes,
      await readAccounts(shop),
      provider,
      observed.signedInAs,
    ));
  const id = held ?? `acc-${randomUUID()}`;
  const pending = shop.homes.pendingHomeFor(provider);

  await shop.homes.promotePending(provider, id);

  const settled = await settleUnder(custody, pending, shop.homes.homeFor(provider, id));

  if (!settled.ok) {
    return refusalFailure(settled);
  }

  const label = await labelFor(shop, provider, observed, shop.homes.homeFor(provider, id));
  const kept = await keepTheAccount(shop, {
    id,
    provider,
    kind: 'subscription',
    label,
    provenance: 'sign-in',
  });

  return { ok: true, value: await viewsOf(shop, kept) };
}
