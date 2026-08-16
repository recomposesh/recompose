import { KindEmptyState } from '../kind-empty-state/kind-empty-state';

const emptyExplanation: Record<'api-key' | 'aggregator', string> = {
  'api-key':
    'An API key is a secret one provider gives you. A gateway spends it request by request.',
  aggregator:
    'An aggregator key is one secret that reaches many providers. A gateway can route across all of them.',
};

type CredentialedEmptyStateProps = {
  /** Which kind of credential the empty screen would list. */
  kind: 'api-key' | 'aggregator';
};

/** What stands where the rows would be when no key or aggregator account is connected yet. */
export function CredentialedEmptyState({ kind }: CredentialedEmptyStateProps) {
  return <KindEmptyState explanation={emptyExplanation[kind]} title="Nothing connected yet" />;
}
