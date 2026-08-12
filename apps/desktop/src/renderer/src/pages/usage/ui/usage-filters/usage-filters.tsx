import { useQuery } from '@tanstack/react-query';

import type { UsageSearch } from '../../lib/usage-search';
import type { FilterMember } from '../filter-menu/filter-menu';

import { accountsQueryOptions } from '../../../../shared/api';
import { filteredBuckets, memberNames } from '../../lib/usage-groups';
import { filteredMembers, withoutFilter } from '../../lib/usage-search';
import { useWindowBuckets } from '../../model/use-window-buckets';
import { FilterMenu } from '../filter-menu/filter-menu';

type UsageFiltersProps = {
  /** The typed view the address carries. */
  search: UsageSearch;
  /** Receives the whole next view whenever a filter moves. */
  onSearchChange: (next: UsageSearch) => void;
};

function named(
  members: readonly { key: string; requests: number }[],
  naming: (key: string) => string,
): readonly FilterMember[] {
  return members.map((member) => ({ ...member, name: naming(member.key) }));
}

function withFilter(
  search: UsageSearch,
  level: 'gateways' | 'providers',
  members: readonly string[],
): UsageSearch {
  return members.length === 0 ? withoutFilter(search, level) : { ...search, [level]: members };
}

/**
 * The two filters the toolbar stands at its leading edge.
 *
 * @summary Each menu lists what the standing window served under the other filter, so narrowing
 * one never hides the members a person could still reach for. A provider is a connected account,
 * which is what the sidebar calls one.
 */
export function UsageFilters({ search, onSearchChange }: UsageFiltersProps) {
  const { buckets } = useWindowBuckets(search);
  const accounts = useQuery(accountsQueryOptions);
  const nameOfAccount = (accountId: string) => {
    const held = accounts.data?.accounts.find((account) => account.id === accountId);

    return held !== undefined && 'label' in held && typeof held.label === 'string'
      ? held.label
      : accountId;
  };

  return (
    <div className="flex items-center gap-2">
      <FilterMenu
        label="Gateways"
        members={named(
          memberNames(filteredBuckets(buckets, withoutFilter(search, 'gateways')), 'gateway'),
          (key) => key,
        )}
        onSelectedChange={(next) => {
          onSearchChange(withFilter(search, 'gateways', next));
        }}
        searchLabel="Search gateways"
        selected={filteredMembers(search, 'gateways')}
      />
      <FilterMenu
        label="Providers"
        members={named(
          memberNames(filteredBuckets(buckets, withoutFilter(search, 'providers')), 'account'),
          nameOfAccount,
        )}
        onSelectedChange={(next) => {
          onSearchChange(withFilter(search, 'providers', next));
        }}
        searchLabel="Search providers"
        selected={filteredMembers(search, 'providers')}
      />
    </div>
  );
}
