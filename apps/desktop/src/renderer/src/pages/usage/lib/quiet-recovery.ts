import type { UsageSearch, UsageSearchRange } from './usage-search';

import { filteredMembers, withoutFilter, withRange } from './usage-search';

/** What a quiet window offers to reach for, and the view that act lands on. */
export type QuietRecovery = {
  label: string;
  next: UsageSearch;
};

type Widening = { range: Exclude<UsageSearchRange, 'custom'>; label: string };

const WIDER_WINDOW: Readonly<Partial<Record<UsageSearchRange, Widening>>> = {
  '1h': { range: '24h', label: '24 hours' },
  '24h': { range: '7d', label: '7 days' },
  '7d': { range: '30d', label: '30 days' },
};

const QUIET_WINDOW: Readonly<Record<UsageSearchRange, string>> = {
  '1h': 'in the last hour',
  '24h': 'in the last 24 hours',
  '7d': 'in the last 7 days',
  '30d': 'in the last 30 days',
  'this-week': 'this week',
  'this-month': 'this month',
  custom: 'in the window you drew',
};

/**
 * The one line under the title of a window that served nothing.
 *
 * @summary A drawn window names itself as the window a person drew, because its edges are already
 * printed under the title and repeating them says nothing new. A window standing on the week or
 * the month says so, because it never reached back a width from now.
 */
export function quietSentence(search: UsageSearch): string {
  return `Nothing served ${QUIET_WINDOW[search.range]}.`;
}

function narrowed(search: UsageSearch): boolean {
  return (
    filteredMembers(search, 'gateways').length + filteredMembers(search, 'providers').length > 0
  );
}

function widened(search: UsageSearch): QuietRecovery | undefined {
  const wider = WIDER_WINDOW[search.range];

  if (wider === undefined) {
    return undefined;
  }

  return { label: `Widen to ${wider.label}`, next: withRange(search, wider.range) };
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
