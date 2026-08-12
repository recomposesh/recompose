import type { LogRow, UsageBucket, UsageTuple } from '@recompose/contracts';

import { accruedMeasures, emptyUsageMeasures, rowUsageTuple } from '@recompose/contracts';

import { requestInFlight } from '../../../entities/request-log';

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;

function tupleKey(tuple: UsageTuple): string {
  return [tuple.gateway, tuple.virtualModel, tuple.provider, tuple.providerModel, tuple.accountId]
    .map((level) => level ?? '')
    .join(' ');
}

/**
 * The trailing hour folded into minute buckets from the rows the renderer already holds.
 *
 * @summary This is the live plane the `1h` range draws alone: every longer range answers from the
 * ledger's closed hours, so the seam between the two is a bucket boundary and nothing counts
 * twice. A provider response still in flight stays out until it settles, mirroring when the
 * ledger's observer would count it.
 */
export function liveWindowFold(rows: readonly LogRow[], now: number): readonly UsageBucket[] {
  const folded = new Map<string, UsageBucket>();

  for (const row of rows) {
    if (row.at < now - HOUR_MS || requestInFlight(row)) {
      continue;
    }

    const start = row.at - (row.at % MINUTE_MS);
    const tuple = rowUsageTuple(row);
    const key = `${String(start)} ${tupleKey(tuple)}`;
    const held = folded.get(key) ?? { start, tuple, measures: emptyUsageMeasures() };

    folded.set(key, { ...held, measures: accruedMeasures(held.measures, row) });
  }

  return [...folded.values()].toSorted((earlier, later) => earlier.start - later.start);
}
