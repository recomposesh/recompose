import type { Account, SubscriptionProviderId } from '@recompose/contracts';

import { useQueries, useQuery, useSuspenseQuery } from '@tanstack/react-query';

import type { FoundSource, StoredSource } from './found-source';

import {
  accountsQueryOptions,
  machineReadingQueryOptions,
  runtimeDetectionQueryOptions,
} from '../../../shared/api';
import { foundSources } from './found-source';

/**
 * The providers whose own tool keeps a credential somewhere this app can read.
 *
 * @summary Only these two have a machine store of their own, so asking about the rest would read
 * an Anthropic store under another provider's name and offer a plan nobody signed into.
 */
const LOOKED_AT: readonly SubscriptionProviderId[] = ['anthropic', 'openai'];

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
 * @summary Every look runs as an ordinary query rather than blocking the step, so a machine with
 * no provider tool and no runtime answering draws its catalog straight away instead of waiting on
 * a row of timeouts. A look still in flight reads as having found nothing, which is honest: the
 * step says what it has so far and gains a row when an answer lands.
 */
export function useFoundSources(): readonly FoundSource[] {
  const { data: registry } = useSuspenseQuery(accountsQueryOptions);
  const readings = useQueries({
    queries: LOOKED_AT.map((provider) => machineReadingQueryOptions(provider)),
  });
  const { data: ollama } = useQuery(runtimeDetectionQueryOptions('ollama'));

  return foundSources({
    machineReadings: LOOKED_AT.map((provider, index) => ({
      provider,
      reading: readings[index]?.data ?? { holds: 'nothing' },
    })),
    ollamaAnswering: ollama?.verdict === 'answers',
    accounts: registry.accounts.map(asSource),
  });
}
