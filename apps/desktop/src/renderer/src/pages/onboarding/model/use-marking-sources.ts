import { subscriptionProviderIdSchema } from '@recompose/contracts';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import type { FoundSource } from './found-source';

import {
  accountsQueryOptions,
  useAdoptSubscription,
  useConnectLocalRuntime,
} from '../../../shared/api';
import { productOf, productsArrivedSince } from './arrived-accounts';
import { togglePicked } from './picked-count';

type MarkingSources = {
  /** Whether this source stands marked. */
  isMarked: (source: FoundSource) => boolean;
  /** Marks a source or clears the mark, recording the account the first time it is marked. */
  onMarkSource: (source: FoundSource) => void;
};

/**
 * Every product a person connected since setup opened.
 *
 * @summary The first reading is the baseline rather than an arrival, so a machine that already
 * held accounts opens with none of them decided. Ids are what an arrival is spotted by, because a
 * second plan from the same provider carries the same product as the first.
 */
function useArrivedProducts(): ReadonlySet<string> {
  const { data: registry } = useQuery(accountsQueryOptions);
  const [arrived, setArrived] = useState<ReadonlySet<string>>(new Set());
  const known = useRef<ReadonlySet<string> | undefined>(undefined);
  const accounts = registry?.accounts;

  useEffect(() => {
    if (accounts === undefined) {
      return;
    }

    const standing = new Set(accounts.map((account) => account.id));
    const since = known.current;

    known.current = standing;

    if (since === undefined) {
      return;
    }

    const landed = productsArrivedSince(since, accounts);

    if (landed.length > 0) {
      setArrived((held) => new Set([...held, ...landed]));
    }
  }, [accounts]);

  return arrived;
}

/**
 * The sources a person marked, and the recording that marking one causes.
 *
 * @summary Marking a source the machine turned up is the act that records it, so the step that
 * builds finds the accounts already there rather than opening a second sign-in a person already
 * answered.
 *
 * A mark is remembered against the product rather than the row, because a recorded source arrives
 * back under a stored account id, which is not the id the machine row carried. Without that a
 * person would watch their own mark clear the moment the record landed.
 *
 * Nothing is marked before its account lands. A mark stands for a target the build can route to,
 * so marking one the recording never produced would send the build an account that does not
 * exist, and the run would refuse on something the person could not see.
 */
export function useMarkingSources(): MarkingSources {
  const [markedRows, setMarkedRows] = useState<ReadonlySet<string>>(new Set());
  const [cleared, setCleared] = useState<ReadonlySet<string>>(new Set());
  const arrived = useArrivedProducts();
  const adopt = useAdoptSubscription();
  const connectLocal = useConnectLocalRuntime();

  const isMarked = (source: FoundSource): boolean =>
    markedRows.has(source.id) ||
    (arrived.has(productOf(source)) && !cleared.has(productOf(source)));

  const clearMark = (source: FoundSource): void => {
    setMarkedRows(new Set([...markedRows].filter((row) => row !== source.id)));
    setCleared(new Set([...cleared, productOf(source)]));
  };

  const recordAccount = (source: FoundSource): void => {
    setCleared(new Set([...cleared].filter((held) => held !== productOf(source))));

    const signedIn = subscriptionProviderIdSchema.safeParse(source.provider);

    if (source.kind === 'subscription' && signedIn.success) {
      adopt.mutate({ provider: signedIn.data });
    }

    if (source.kind === 'local' && source.provider === 'ollama') {
      connectLocal.mutate({ runtime: 'ollama' });
    }
  };

  return {
    isMarked,
    onMarkSource: (source) => {
      if (isMarked(source)) {
        clearMark(source);

        return;
      }

      if (source.adoptable) {
        recordAccount(source);

        return;
      }

      setMarkedRows(togglePicked(markedRows, source.id));
    },
  };
}
