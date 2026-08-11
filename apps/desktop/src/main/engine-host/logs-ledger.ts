import { engineLogReportSchema, type LogBatch, type LogRow } from '@recompose/contracts';

import { TRAFFIC_PUSH_MS } from './traffic-ledger';

/**
 * How many finished requests the desk keeps for a subscriber that has yet to ask.
 *
 * @summary Three separate caps have to agree on this number, and no type can tie them together: the
 * engine ring buffer's `maxRecords` default in `provider-observability.ts`, this desk, and
 * `HELD_ROWS` in the renderer's `shared/api/engine-logs.ts`. A desk holding more than the ring would
 * promise history the engine never had; a renderer holding less would drop rows a backfill just
 * delivered. Change one and all three move together.
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
  resume: (slug: string) => void;
  interrupt: (slug: string) => void;
  forget: (slug: string) => void;
};

type Desk = {
  retained: Map<string, LogRow>;
  waiting: Map<string, LogRow>;
  pending: ReturnType<typeof setTimeout> | null;
  inactive: Set<string>;
};

const INTERRUPTED_STATUS = 503;
const INTERRUPTED_FAILURE = 'The gateway stopped before the request finished.';

function forgetTheOldest(retained: Map<string, LogRow>): void {
  for (const id of retained.keys()) {
    retained.delete(id);
    break;
  }
}

function retain(desk: Desk, row: LogRow): void {
  desk.retained.set(row.id, row);

  if (desk.retained.size > LOGS_RETAINED_MAX) {
    forgetTheOldest(desk.retained);
  }
}

function stopWaiting(desk: Desk): void {
  clearTimeout(desk.pending ?? undefined);
  desk.pending = null;
  desk.waiting = new Map();
}

function tellTheWindowsSoon(desk: Desk, push: (batch: LogBatch) => void): void {
  if (desk.pending !== null) {
    return;
  }

  desk.pending = setTimeout(() => {
    const crossing = [...desk.waiting.values()];

    desk.pending = null;
    desk.waiting = new Map();
    push({ kind: 'append', rows: crossing });
  }, TRAFFIC_PUSH_MS);
}

function failTheUnfinishedRows(desk: Desk, slug: string): void {
  for (const [id, row] of desk.retained) {
    if (row.gateway !== slug || row.origin !== 'provider' || row.durationMs !== undefined) {
      continue;
    }

    const interrupted = {
      ...row,
      status: INTERRUPTED_STATUS,
      durationMs: Math.max(0, Date.now() - row.at),
      failure: INTERRUPTED_FAILURE,
    };

    desk.retained.set(id, interrupted);
    desk.waiting.set(id, interrupted);
  }
}

function handOverTheHistory(desk: Desk, push: (batch: LogBatch) => void): void {
  stopWaiting(desk);

  const history = [...desk.retained.values()];

  for (let from = 0; from < history.length; from += LOGS_BACKFILL_CHUNK) {
    push({ kind: 'backfill', rows: history.slice(from, from + LOGS_BACKFILL_CHUNK) });
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
 *
 * One request can be reported more than once, because the engine commits a row when the status is
 * known and again once the body has been measured. Both stores therefore key by row id and keep the
 * latest version in the place the request first arrived: the cap counts requests rather than
 * reports, so a two-phase commit cannot halve the history, and one flush carries one row per
 * request rather than one per report.
 */
export function openLogsDesk(push: (batch: LogBatch) => void): LogsDesk {
  const desk: Desk = {
    retained: new Map(),
    waiting: new Map(),
    pending: null,
    inactive: new Set(),
  };

  return {
    hears: (message) => {
      const report = engineLogReportSchema.safeParse(message);

      if (!report.success) {
        return false;
      }

      if (desk.inactive.has(report.data.row.gateway)) {
        return true;
      }

      retain(desk, report.data.row);
      desk.waiting.set(report.data.row.id, report.data.row);
      tellTheWindowsSoon(desk, push);

      return true;
    },
    backfill: () => {
      handOverTheHistory(desk, push);
    },
    resume: (slug) => {
      desk.inactive.delete(slug);
    },
    interrupt: (slug) => {
      desk.inactive.add(slug);
      failTheUnfinishedRows(desk, slug);

      if (desk.waiting.size > 0) {
        tellTheWindowsSoon(desk, push);
      }
    },
    forget: (slug) => {
      desk.inactive.delete(slug);

      for (const [id, row] of desk.retained) {
        if (row.gateway === slug) {
          desk.retained.delete(id);
        }
      }

      for (const [id, row] of desk.waiting) {
        if (row.gateway === slug) {
          desk.waiting.delete(id);
        }
      }
    },
  };
}
