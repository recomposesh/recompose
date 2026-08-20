import {
  engineSpendGrantSchema,
  engineSpendRequestSchema,
  engineSubscriptionCredentialUpdateSchema,
  engineSubscriptionCredentialUpdatedSchema,
  type SpendGrant,
} from '@recompose/contracts';

import type { SpendGrantFor } from './gateway-app';
import type { SubscriptionRuntime } from './gateway-proxy';
import type { ParentPort } from './parent-port';

/**
 * One lane of asks the child opens across the parent port and settles by the answers coming back.
 *
 * @summary Every ask carries an id the answer names, so a lane settles the one caller that is
 * waiting rather than the newest. `settle` answers whether the message belonged to this lane at all,
 * which is how the child sorts an answer from a directive without a second channel.
 */
type Lane<Ask> = Ask & { settle: (data: unknown) => boolean };

export type SpendLane = Lane<{ grantFor: SpendGrantFor }>;

export type CredentialUpdateLane = Lane<{ persist: SubscriptionRuntime['persist'] }>;

export function openSpendLane(parentPort: ParentPort): SpendLane {
  const pending = new Map<string, (grant: SpendGrant) => void>();

  return {
    grantFor: async (slug, virtualModel, routeNode) => {
      const ask = engineSpendRequestSchema.safeParse({
        kind: 'spend-request',
        id: crypto.randomUUID(),
        slug,
        virtualModel,
        routeNode,
      });

      if (!ask.success) {
        console.error(
          `The spend lane could not word its ask for ${slug}/${virtualModel} at ${routeNode}: ${ask.error.message}`,
        );

        return { verdict: 'missing-target' };
      }

      return new Promise((resolve) => {
        pending.set(ask.data.id, resolve);
        parentPort.postMessage(ask.data);
      });
    },
    settle: (data) => {
      const answer = engineSpendGrantSchema.safeParse(data);

      if (!answer.success) {
        return false;
      }

      const resolve = pending.get(answer.data.answers);

      if (resolve === undefined) {
        console.error('The engine child heard a spend grant answering no open request.');

        return true;
      }

      pending.delete(answer.data.answers);
      resolve(answer.data.grant);

      return true;
    },
  };
}

export function openCredentialUpdateLane(parentPort: ParentPort): CredentialUpdateLane {
  const pending = new Map<string, { stored: () => void; failed: () => void }>();

  return {
    persist: async (provider, accountId, credential) =>
      new Promise<void>((stored, failed) => {
        const id = crypto.randomUUID();

        pending.set(id, {
          stored,
          failed: () => {
            failed(new Error('credential update failed'));
          },
        });
        parentPort.postMessage(
          engineSubscriptionCredentialUpdateSchema.parse({
            kind: 'subscription-credential-update',
            id,
            provider,
            accountId,
            credential,
          }),
        );
      }),
    settle: (data) => {
      const answer = engineSubscriptionCredentialUpdatedSchema.safeParse(data);

      if (!answer.success) {
        return false;
      }

      const waiting = pending.get(answer.data.answers);

      if (waiting === undefined) {
        console.error('The engine child heard a credential update answering no open request.');

        return true;
      }

      pending.delete(answer.data.answers);
      waiting[answer.data.verdict]();

      return true;
    },
  };
}
