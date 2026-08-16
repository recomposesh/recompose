import type { ReactNode } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { CatalogEntry } from '../../model/provider-catalog';

import { refusalSentence } from '../../../../shared/api';
import { PickedIdentity } from '../picked-identity/picked-identity';

type AppSignInStepProps = {
  /** The entry a person picked, which heads the step. */
  entry: CatalogEntry;
  /** The one line under the name, saying what this step asks of a person. */
  asks: string;
  /** Whatever the step stands between its heading and its refusal. */
  children: ReactNode;
  /** What went wrong, where anything did, spoken as a sentence rather than a code. */
  refusal: unknown;
};

/**
 * The shell every sign-in recompose runs itself stands in.
 *
 * @summary The plans with no tool of their own differ only in what they put in the middle: a code
 * to type, or a page to open. Heading, width, and the way a refusal reaches the screen are one
 * answer for all of them, so a second such plan inherits them rather than copying them.
 */
export function AppSignInStep({ entry, asks, children, refusal }: AppSignInStepProps) {
  return (
    <div className="mx-auto flex w-80 flex-col items-center gap-2.5 py-4 text-center">
      <PickedIdentity lead={entry.lead} title={entry.name}>
        <p className="text-detail text-ink-secondary">{asks}</p>
      </PickedIdentity>
      {children}
      {refusal === null || refusal === undefined ? null : (
        <p className="text-caption text-danger-ink" role="alert">
          {refusalSentence(refusal)}
        </p>
      )}
    </div>
  );
}

/**
 * The wait a person presses into, which steps aside only once the account is stored.
 *
 * @summary Every such sign-in ends the same way: the far end answers, the account list is asked
 * again, and the catalog closes. Only the ask itself differs, so only the ask is passed in.
 */
export function useSignInLanding(land: () => Promise<unknown>, onConnected: () => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: land,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      onConnected();
    },
  });
}
