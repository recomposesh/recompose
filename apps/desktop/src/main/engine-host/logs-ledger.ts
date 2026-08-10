import { engineLogReportSchema, type LogBatch, type LogRow } from '@recompose/contracts';

import { TRAFFIC_PUSH_MS } from './traffic-ledger';

/**
 * How many finished requests the desk keeps for a subscriber that has yet to ask.
 *
 * @summary It mirrors the engine ring buffer, so the history a late drawer reads is the same length
 * the engine itself remembers, and neither side promises more than the other can hold.
 */
export const LOGS_RETAINED_MAX = 10_000;

/**
 * How many rows ride one backfill message.
 *
 * @summary A full history in one message would be a single megabyte-scale structured clone across
 * the process boundary, which stalls the frame it lands on. Five hundred rows is small enough that
 * one message stays in the tens of kilobytes, and large enough that a full history crosses in
 * twenty messages rather than hundreds.
 */
export const LOGS_BACKFILL_CHUNK = 500;

export type LogsDesk = {
  hears: (message: unknown) => boolean;
  backfill: () => void;
};

type Desk = {
  retained: LogRow[];
  waiting: LogRow[];
  pending: ReturnType<typeof setTimeout> | null;
};

function retain(desk: Desk, row: LogRow): void {
  desk.retained.push(row);
  desk.retained.splice(0, desk.retained.length - LOGS_RETAINED_MAX);
}

function stopWaiting(desk: Desk): void {
  clearTimeout(desk.pending ?? undefined);
  desk.pending = null;
  desk.waiting = [];
}

function tellTheWindowsSoon(desk: Desk, push: (batch: LogBatch) => void): void {
  if (desk.pending !== null) {
    return;
  }

  desk.pending = setTimeout(() => {
    const crossing = desk.waiting;

    desk.pending = null;
    desk.waiting = [];
    push({ kind: 'append', rows: crossing });
  }, TRAFFIC_PUSH_MS);
}

function handOverTheHistory(desk: Desk, push: (batch: LogBatch) => void): void {
  stopWaiting(desk);

  for (let from = 0; from < desk.retained.length; from += LOGS_BACKFILL_CHUNK) {
    push({ kind: 'backfill', rows: desk.retained.slice(from, from + LOGS_BACKFILL_CHUNK) });
  }
}

/**
 * Gathers the requests the child logs and tells the windows about them in runs.
 *
 * @summary The child speaks once per finished request, so a gateway answering hundreds a second
 * would otherwise cost the windows a message each. Gathering here borrows the traffic desk's
 * cadence for the same reason: the windows hear at most once a painted frame. What crosses is a run
 * of rows rather than a snapshot, because a drawer that lists history needs every row rather than
 * the latest word, and a run merges by row id with nothing to reconcile.
 *
 * The desk also keeps the history itself, so a drawer opening long after a gateway started reads
 * what it missed. That history crosses as bounded backfill runs ahead of the stream, never as one
 * message, and the rows still waiting to append ride it rather than crossing a second time behind.
 */
export function openLogsDesk(push: (batch: LogBatch) => void): LogsDesk {
  const desk: Desk = { retained: [], waiting: [], pending: null };

  return {
    hears: (message) => {
      const report = engineLogReportSchema.safeParse(message);

      if (!report.success) {
        return false;
      }

      retain(desk, report.data.row);
      desk.waiting.push(report.data.row);
      tellTheWindowsSoon(desk, push);

      return true;
    },
    backfill: () => {
      handOverTheHistory(desk, push);
    },
  };
}
