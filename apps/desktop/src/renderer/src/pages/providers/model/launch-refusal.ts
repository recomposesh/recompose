import type { SubscriptionProviderId } from '@recompose/contracts';

import { useCallback, useEffect, useState } from 'react';

export type LaunchRefusal = {
  /** Why no terminal opened, once one has failed to. */
  note: string | undefined;
  /** Drops what was heard, which the act starting the next wait owes the one after it. */
  forget: () => void;
};

/**
 * Why no terminal opened, for a plan whose sign-in is waiting on one.
 *
 * @summary The app cannot see inside the tool's run, so a launch that failed leaves the wait
 * looking exactly like a launch that worked. The wait carries on either way, because the command
 * stays on screen for a person to run by hand, and this is the only hint that they now have to.
 *
 * Forgetting is the caller's, taken as the next sign-in starts rather than as the last one ends,
 * so no wait ever opens under the news the wait before it drew.
 */
export function useLaunchRefusal(provider: SubscriptionProviderId): LaunchRefusal {
  const [note, setNote] = useState<string | undefined>(undefined);

  useEffect(
    () =>
      window.recomposeEvents['subscriptions:launch-refused']((refused) => {
        if (refused.provider === provider) {
          setNote(refused.note);
        }
      }),
    [provider],
  );

  return {
    note,
    forget: useCallback(() => {
      setNote(undefined);
    }, []),
  };
}
