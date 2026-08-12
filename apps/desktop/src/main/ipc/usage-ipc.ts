import type { LogRow, UsageBucket } from '@recompose/contracts';

import type { BalancesDesk } from '../usage/balances';
import type { StandingPrices } from '../usage/price-map';
import type { UsageStore } from '../usage/usage-store';
import type { IpcHandlers } from './dispatch';

import { dayCostsOf } from '../usage/pricing';
import { quotaWindowsOf } from '../usage/quota-windows';
import { dayFolded } from '../usage/usage-buckets';

type UsageIpcHandlers = Pick<
  IpcHandlers,
  'usage:report' | 'usage:quota-windows' | 'usage:balances' | 'system:usage-table'
>;

export type UsageIpcDeps = {
  store: Pick<UsageStore, 'report' | 'heldBuckets'>;
  standingPrices: () => StandingPrices;
  retainedRows: () => readonly LogRow[];
  balances: Pick<BalancesDesk, 'read'>;
  noteUsageTable: (open: boolean) => void;
};

function coveringDays(
  buckets: readonly UsageBucket[],
  width: 'hour' | 'day',
  dayOffsetMinutes: number | undefined,
): readonly UsageBucket[] {
  return width === 'day' ? buckets : dayFolded(buckets, dayOffsetMinutes);
}

/**
 * The usage channels, answering from the ledger, the price map, and the balances desk.
 *
 * @summary A report carries its closed buckets whole and prices the covering days at answer time,
 * so a corrected price recomputes every historical day on the next ask and no cost ever persists.
 * The quota read folds the held buckets beside the rows still in flight, and the table twin note
 * lands where the menu reads its checkbox from.
 */
export function createUsageIpcHandlers(deps: UsageIpcDeps): UsageIpcHandlers {
  return {
    'usage:report': async (ask) => {
      const answer = await deps.store.report(ask);
      const { prices, provenance } = deps.standingPrices();
      const { dayCosts, priceMisses } = dayCostsOf(
        coveringDays(answer.buckets, answer.bucketWidth, ask.dayOffsetMinutes),
        prices,
      );

      return { ok: true, value: { ...answer, dayCosts, priceMisses, pricing: provenance } };
    },
    'usage:quota-windows': async () =>
      Promise.resolve({
        ok: true,
        value: quotaWindowsOf(deps.store.heldBuckets(), deps.retainedRows(), Date.now()),
      }),
    'usage:balances': async ({ refresh }) => ({
      ok: true,
      value: await deps.balances.read(refresh),
    }),
    'system:usage-table': async ({ open }) => {
      deps.noteUsageTable(open);

      return Promise.resolve({ ok: true, value: undefined });
    },
  };
}
