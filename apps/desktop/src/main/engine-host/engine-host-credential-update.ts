import {
  engineSubscriptionCredentialUpdateSchema,
  type EngineSubscriptionCredentialUpdate,
} from '@recompose/contracts';

import type { EngineChild, EngineHostDeps } from './engine-host-types';

type StoreCredential = NonNullable<EngineHostDeps['storeSubscriptionCredential']>;

type Verdict = 'stored' | 'failed';

function tellTheChild(
  child: EngineChild,
  update: EngineSubscriptionCredentialUpdate,
  verdict: Verdict,
): void {
  child.postMessage({
    kind: 'subscription-credential-updated',
    answers: update.id,
    verdict,
  });
}

/**
 * Stores a credential the child refreshed mid-flight, and tells the child how that went.
 *
 * @summary A subscription credential can rotate while a gateway is serving, and only main can
 * write it, so the child hands it over and waits. The answer matters either way: a child told
 * `stored` trusts what it holds, and a child told `failed` knows the next process will read the
 * credential it started from rather than the one it refreshed. Answering `false` leaves the message
 * on the lane for the next reader, the way the desks do.
 */
export function persistRefreshedCredential(
  child: EngineChild,
  store: StoreCredential,
  message: unknown,
): boolean {
  const update = engineSubscriptionCredentialUpdateSchema.safeParse(message);

  if (!update.success) {
    return false;
  }

  void store(update.data.provider, update.data.accountId, update.data.credential).then(
    () => {
      tellTheChild(child, update.data, 'stored');
    },
    (error: unknown) => {
      console.error('recompose could not persist a refreshed subscription credential.', error);
      tellTheChild(child, update.data, 'failed');
    },
  );

  return true;
}
