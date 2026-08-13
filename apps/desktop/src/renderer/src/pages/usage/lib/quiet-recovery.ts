import type { UsageSearch, UsageSearchRange } from './usage-search';

import { filteredMembers, withoutFilter } from './usage-search';

/** What a quiet window offers to reach for, and the view that act lands on. */
export type QuietRecovery = {
  label: string;
  next: UsageSearch;
};

const WIDER_RANGE: Readonly<Partial<Record<UsageSearchRange, UsageSearchRange>>> = {
  '1h': '24h',
  '24h': '7d',
  '7d': '30d',
};

const RANGE_WORDS: Readonly<Record<UsageSearchRange, string>> = {
  '1h': 'hour',
  '24h': '24 hours',
  '7d': '7 days',
  '30d': '30 days',
  custom: 'window',
};

/**
 * The one line under the title of a window that served nothing.
 *
 * @summary A drawn window names itself as the window a person drew, because its edges are already
 * printed under the title and repeating them says nothing new.
 */
export function quietSentence(search: UsageSearch): string {
  return search.range === 'custom'
    ? 'Nothing served in the window you drew.'
    : `Nothing served in the last ${RANGE_WORDS[search.range]}.`;
}

function narrowed(search: UsageSearch): boolean {
  return (
    filteredMembers(search, 'gateways').length + filteredMembers(search, 'providers').length > 0
  );
}

function widened(search: UsageSearch): QuietRecovery | undefined {
  const wider = WIDER_RANGE[search.range];

  if (wider === undefined) {
    return undefined;
  }

  const { from: _from, to: _to, ...kept } = search;

  return { label: `Widen to ${RANGE_WORDS[wider]}`, next: { ...kept, range: wider } };
}

/**
 * The one act a window with no traffic offers, and the view it lands on.
 *
 * @summary A filter hides more than a short window does, so the filters come back first and the
 * window widens only where none stand. The widest range the ledger keeps offers nothing, because
 * no wider window exists to reach for.
 */
export function quietRecovery(search: UsageSearch): QuietRecovery | undefined {
  if (narrowed(search)) {
    return {
      label: 'Clear the filters',
      next: withoutFilter(withoutFilter(search, 'gateways'), 'providers'),
    };
  }

  return widened(search);
}
