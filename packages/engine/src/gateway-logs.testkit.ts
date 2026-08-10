import type { LogRow } from '@recompose/contracts';

import { logRowSchema } from '@recompose/contracts';

import { subscribeToLogRows } from './gateway-traffic';

/**
 * The rows a reader ends up holding, which is what a person sees rather than what crossed the wire.
 *
 * @summary An attempt is told once the moment its status is known and once more once its body has
 * been measured, always under the one id, so a row never waits on a caller draining an answer. The
 * renderer's cache merges by that id, so collapsing the tellings here reads the same rows the drawer
 * would list.
 */
export function rowsStanding(told: readonly LogRow[]): LogRow[] {
  const byId = new Map(told.map((row) => [row.id, row]));

  return [...byId.values()];
}

export type CollectedRows = { told: LogRow[]; standing: () => LogRow[]; forget: () => void };

export function collectingRows(): CollectedRows {
  const told: LogRow[] = [];

  return {
    told,
    standing: () => rowsStanding(told),
    forget: subscribeToLogRows((row) => {
      told.push(logRowSchema.parse(row));
    }),
  };
}
