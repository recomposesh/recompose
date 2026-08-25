import { useState } from 'react';

import type { FoundSource } from './found-source';

import { useAdoptSubscription, useConnectLocalRuntime } from '../../../shared/api';
import { togglePicked } from './picked-count';

type MarkingSources = {
  /** Whether this source stands marked. */
  isMarked: (source: FoundSource) => boolean;
  /** Marks a source or clears the mark, recording the account the first time it is marked. */
  onMarkSource: (source: FoundSource) => void;
};

function productOf(source: FoundSource): string {
  return `${source.provider}:${source.kind}`;
}

/**
 * The sources a person marked, and the recording that marking one causes.
 *
 * @summary Marking a source the machine turned up is the act that records it, so the step that
 * builds finds the accounts already there rather than opening a second sign-in a person already
 * answered.
 *
 * A recorded source arrives back under a stored account id, which is not the id the machine row
 * carried, so the mark is remembered against the product rather than the row. Without that a
 * person would watch their own mark clear the moment the record landed. A second account for the
 * same product still marks by row, because two plans from one provider are two sources and only
 * the person can say which they meant.
 */
export function useMarkingSources(): MarkingSources {
  const [markedRows, setMarkedRows] = useState<ReadonlySet<string>>(new Set());
  const [recorded, setRecorded] = useState<ReadonlySet<string>>(new Set());
  const adopt = useAdoptSubscription();
  const connectLocal = useConnectLocalRuntime();

  const isMarked = (source: FoundSource): boolean =>
    markedRows.has(source.id) || recorded.has(productOf(source));

  const clearMark = (source: FoundSource): void => {
    const product = productOf(source);

    setMarkedRows(new Set([...markedRows].filter((row) => row !== source.id)));
    setRecorded(new Set([...recorded].filter((held) => held !== product)));
  };

  const recordAccount = (source: FoundSource): void => {
    setRecorded(togglePicked(recorded, productOf(source)));

    if (source.kind === 'subscription' && source.provider === 'anthropic') {
      adopt.mutate({ provider: 'anthropic' });
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

      setMarkedRows(togglePicked(markedRows, source.id));

      if (source.adoptable) {
        recordAccount(source);
      }
    },
  };
}
