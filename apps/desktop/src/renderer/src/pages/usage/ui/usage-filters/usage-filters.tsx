import type { Account } from '@recompose/contracts';

import { useQuery } from '@tanstack/react-query';

import type { UsageSearch } from '../../lib/usage-search';
import type { FilterMember } from '../filter-menu/filter-menu';

import { accountMark, accountName, accountProductName } from '../../../../entities/account';
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

/**
 * One account as the filter lists it: what a person named it, under the product serving it.
 *
 * @summary A person may file every account under one address, so a list of names alone is a list
 * of one name repeated. The product and its mark are what tell those rows apart, which is why an
 * account the registry no longer holds falls back on the raw id rather than on a blank row.
 */
function accountMember(
  member: { key: string; requests: number },
  held: Account | undefined,
): FilterMember {
  if (held === undefined) {
    return { ...member, name: member.key, lead: { mark: undefined } };
  }

  return {
    ...member,
    name: accountName(held),
    detail: accountProductName(held),
    lead: { mark: accountMark(held) },
  };
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
  const accountFor = (accountId: string) =>
    accounts.data?.accounts.find((account) => account.id === accountId);

  return (
    <div className="flex min-w-0 items-center gap-2">
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
        members={memberNames(
          filteredBuckets(buckets, withoutFilter(search, 'providers')),
          'account',
        ).map((member) => accountMember(member, accountFor(member.key)))}
        onSelectedChange={(next) => {
          onSearchChange(withFilter(search, 'providers', next));
        }}
        searchLabel="Search providers"
        selected={filteredMembers(search, 'providers')}
      />
    </div>
  );
}
