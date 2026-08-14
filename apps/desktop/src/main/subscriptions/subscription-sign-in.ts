import { setTimeout as sleepFor } from 'node:timers/promises';

import type { SubscriptionObservation } from './subscription-standing';

export type Clock = {
  elapsed: () => number;
  sleep: (ms: number) => Promise<void>;
};

export type SignInWatch = {
  observe: () => Promise<SubscriptionObservation>;
  clock: Clock;
  boundMs: number;
  everyMs: number;
};

export function wallClock(): Clock {
  const started = Date.now();

  return {
    elapsed: () => Date.now() - started,
    sleep: async (ms) => {
      await sleepFor(ms);
    },
  };
}

/**
 * The sign-in, given one more look when the credential landed before the record naming its owner.
 *
 * @summary A vendor tool writes the credential and the identity file as two separate acts, and on
 * macOS the credential goes to the keychain, so the standing can read connected while the address
 * is still unflushed. An account promoted in that window carries no address, and the rule that
 * matches an address to an account then matches nothing, which stands the same person up twice.
 *
 * One look, not a wait: an address that has not arrived by then folds into the row on the next
 * observation anyway, and holding the sign-in open longer than that costs the person a stall.
 */
async function onceMoreForTheAddress(
  watch: SignInWatch,
  seen: SubscriptionObservation,
): Promise<SubscriptionObservation> {
  if (seen.signedInAs !== undefined) {
    return seen;
  }

  await watch.clock.sleep(watch.everyMs);

  const again = await watch.observe();

  return again.standing === 'connected' ? again : seen;
}

export async function awaitSignIn(watch: SignInWatch): Promise<SubscriptionObservation | null> {
  for (;;) {
    const seen = await watch.observe();

    if (seen.standing === 'connected') {
      return onceMoreForTheAddress(watch, seen);
    }

    if (watch.clock.elapsed() >= watch.boundMs) {
      return null;
    }

    await watch.clock.sleep(watch.everyMs);
  }
}
