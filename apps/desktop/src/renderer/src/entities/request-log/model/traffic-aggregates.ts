import type { LogRow } from '@recompose/contracts';

import { requestFailed } from './request-standing';

const WINDOW_MS = 60_000;
const NINETY_FIFTH = 0.95;

/** What the footer reads off the minute of requests behind it. */
export type TrafficAggregates = {
  /** Requests the window holds, which is a rate already because the window is a minute wide. */
  requestsPerMinute: number;
  /** Tokens those requests spent, counting a request that reported none as nothing. */
  tokensPerMinute: number;
  /** Distinct client apps seen in the last minute, counted by the key the gateway hashed. */
  clientApps: number;
  /** Requests the window holds that failed, which is the number a red cable must agree with. */
  errors: number;
  /** The exact ninety-fifth sample of the durations in the window, and zero where none stands. */
  p95Ms: number;
};

/**
 * Whether a request stands inside the trailing minute.
 *
 * @summary A request stamped a moment ahead of the reading clock counts, because the stamp and the
 * reading come off the same wall clock and an adjustment between them must never take a request off
 * a screen a person is watching.
 */
function withinWindow(row: LogRow, now: number): boolean {
  return now - row.at < WINDOW_MS;
}

function exactP95(durations: readonly number[]): number {
  const sorted = durations.toSorted((earlier, later) => earlier - later);
  const rank = Math.ceil(sorted.length * NINETY_FIFTH);
  const [selected = 0] = sorted.slice(Math.max(rank - 1, 0), rank);

  return selected;
}

/**
 * What the footer reads: the requests, tokens, client apps, errors, and p95 of the last minute.
 *
 * @summary A pure reading of the rows against an instant, so the display tick owns the clock and
 * this owns the arithmetic. The window is the same minute for every cell, so the numbers always
 * describe one span of time. A quiet minute reads zeros rather than the last busy reading, and the
 * p95 is an exact selection over the durations the window holds, never a sketch. A request that
 * failed reports no duration and so leaves the p95 to the requests that were answered.
 */
export function trafficAggregates(rows: readonly LogRow[], now: number): TrafficAggregates {
  const held = rows.filter((row) => withinWindow(row, now));
  const durations = held.flatMap((row) => (row.durationMs === undefined ? [] : [row.durationMs]));

  return {
    requestsPerMinute: held.length,
    tokensPerMinute: held.reduce((spent, row) => spent + (row.tokens ?? 0), 0),
    clientApps: new Set(held.map((row) => row.clientKey)).size,
    errors: held.filter(requestFailed).length,
    p95Ms: exactP95(durations),
  };
}
