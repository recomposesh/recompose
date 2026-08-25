import type { Account } from '@recompose/contracts';

import { useQuery, useSuspenseQuery } from '@tanstack/react-query';

import type { FoundSource, StoredSource } from './found-source';

import {
  accountsQueryOptions,
  machineReadingQueryOptions,
  runtimeDetectionQueryOptions,
} from '../../../shared/api';
import { foundSources } from './found-source';

function asSource(account: Account): StoredSource {
  return {
    id: account.id,
    provider: account.provider,
    kind: account.kind,
    label: account.label ?? account.provider,
    keyTail: 'keyTail' in account ? account.keyTail : undefined,
    address: 'address' in account ? account.address : undefined,
  };
}

/**
 * Every source the sources step offers, folded from the look and the store.
 *
 * @summary The two looks run as ordinary queries rather than blocking the step, so a machine with
 * no Claude tool and no runtime answering draws its catalog straight away instead of waiting on
 * two timeouts. A look still in flight reads as having found nothing, which is honest: the step
 * says what it has so far and gains a row when an answer lands.
 */
export function useFoundSources(): readonly FoundSource[] {
  const { data: registry } = useSuspenseQuery(accountsQueryOptions);
  const { data: claude } = useQuery(machineReadingQueryOptions('anthropic'));
  const { data: ollama } = useQuery(runtimeDetectionQueryOptions('ollama'));

  return foundSources({
    claudeReading: claude ?? { holds: 'nothing' },
    ollamaAnswering: ollama?.verdict === 'answers',
    accounts: registry.accounts.map(asSource),
  });
}
