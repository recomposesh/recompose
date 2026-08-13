import { subscriptionPlanNames } from '@recompose/contracts';
import { randomUUID } from 'node:crypto';

import type { Answered, Workshop } from './subscriptions-workshop';

import { awaitCopilotSignIn, startCopilotSignIn } from '../subscriptions/copilot-sign-in';
import { ipcFailure, storageFailure } from './storage-envelope';
import { keepTheAccount, viewsOf } from './subscriptions-workshop';

/**
 * Finishes the Copilot sign-in a person started, and keeps what GitHub issued.
 *
 * @summary The vault holds the long-lived credential, because that is what buys the short-lived
 * one a turn carries. The row reads as whoever signed in, so a person with two GitHub accounts
 * can tell their rows apart.
 */
async function signInToCopilot(shop: Workshop): Promise<Answered> {
  const settled = await awaitCopilotSignIn(shop.ctx.copilot);

  if (settled.verdict === 'refused') {
    return ipcFailure('sign-in-timed-out', settled.reason);
  }

  const id = `acc-${randomUUID()}`;

  await shop.ctx.writeSubscriptionCredential('copilot', id, settled.credential);

  const kept = await keepTheAccount(shop, {
    id,
    provider: 'copilot',
    kind: 'subscription',
    label: settled.signedInAs ?? subscriptionPlanNames.copilot,
    provenance: 'sign-in',
  });

  return { ok: true, value: await viewsOf(shop, kept) };
}

async function copilotCode(shop: Workshop) {
  const shown = await startCopilotSignIn(shop.ctx.copilot);

  return shown.verdict === 'refused'
    ? ipcFailure('sign-in-timed-out', shown.reason)
    : {
        ok: true as const,
        value: { userCode: shown.userCode, verificationUri: shown.verificationUri },
      };
}

type InTurn = <Answer>(work: () => Promise<Answer>) => Promise<Answer>;

type Guarded = (work: () => Promise<Answered>) => () => Promise<Answered>;

export function copilotHandlers(shop: Workshop, inTurn: InTurn, guarded: Guarded) {
  return {
    'subscriptions:copilot-code': async () => {
      try {
        return await copilotCode(shop);
      } catch (error) {
        return storageFailure(error, shop.ctx.homeFolder);
      }
    },
    'subscriptions:copilot-await': async () => inTurn(guarded(async () => signInToCopilot(shop))),
  };
}
