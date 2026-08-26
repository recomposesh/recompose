import type { LogRow, RecomposeIpcEvents } from '@recompose/contracts';
import type { QueryClient } from '@tanstack/react-query';

import { queryOptions, skipToken } from '@tanstack/react-query';

import { askMainToResend, type ResendAsk } from './engine';

const NOTHING_HAS_BEEN_SERVED: readonly LogRow[] = [];

const HELD_ROWS = 10_000;

/**
 * The requests one gateway has answered, newest first.
 *
 * @summary Rows reach the renderer only by push, so the query starts on no rows and a gateway
 * nothing has served yet reads as empty rather than as loading. Each gateway is held under its own
 * key, so a busy gateway's stream never rewrites what another one is showing.
 */
export function engineLogsQueryOptions(slug: string) {
  return queryOptions({
    queryKey: ['engine-logs', slug],
    queryFn: skipToken,
    initialData: NOTHING_HAS_BEEN_SERVED,
  });
}

/**
 * Which of two rows stands closer to the top of the drawer.
 *
 * @summary The wall-clock stamp orders the rows, because it is the one reading that survives both
 * process boundaries and a gateway restart. Two rows landing in the same millisecond fall back to
 * their ids, so the order a person is reading holds still through every later merge.
 */
function newestFirst(one: LogRow, other: LogRow): number {
  if (one.at !== other.at) {
    return other.at - one.at;
  }

  if (one.id === other.id) {
    return 0;
  }

  return one.id < other.id ? 1 : -1;
}

/**
 * The rows held after a run arrives, which is the held rows and the run taken together.
 *
 * @summary Merging by id rather than replacing is what makes the cache the durable copy: the engine
 * buffer drains behind the drawer's back, so a backfill that replaced would take rows a person is
 * reading. Past the cap the oldest leave, mirroring the ring buffer the rows came from.
 */
function merged(held: readonly LogRow[], arriving: readonly LogRow[]): readonly LogRow[] {
  const byId = new Map(held.map((row) => [row.id, row]));

  for (const row of arriving) {
    byId.set(row.id, row);
  }

  return [...byId.values()].sort(newestFirst).slice(0, HELD_ROWS);
}

function runsByGateway(rows: readonly LogRow[]): Map<string, LogRow[]> {
  const runs = new Map<string, LogRow[]>();

  for (const row of rows) {
    const run = runs.get(row.gateway);

    if (run === undefined) {
      runs.set(row.gateway, [row]);
    } else {
      run.push(row);
    }
  }

  return runs;
}

const HISTORY_UNANSWERED = 'recompose could not ask for the requests a gateway has already served.';

/**
 * Points the log push at the query cache and hands back the way to stop listening.
 *
 * @summary Every batch merges into what each gateway already holds, backfill and append alike, so
 * reopening the drawer and restarting the gateway both leave the rows a person saw standing.
 *
 * Binding also asks main to send the history again, because a reload and a second window each start
 * on an empty cache while main still holds every row. The answer carries no rows: they arrive as
 * backfill runs on the push, so the ask stays cheap however long the history is, and merging by row
 * id makes asking twice cost nothing.
 */
export function bindEngineLogsToCache(
  queryClient: QueryClient,
  subscribe: RecomposeIpcEvents['engine:logs'] = window.recomposeEvents['engine:logs'],
  ask: ResendAsk = window.recompose['engine:replay-logs'],
): () => void {
  const letGo = subscribe((batch) => {
    for (const [slug, arriving] of runsByGateway(batch.rows)) {
      queryClient.setQueryData(engineLogsQueryOptions(slug).queryKey, (held?: readonly LogRow[]) =>
        merged(held ?? NOTHING_HAS_BEEN_SERVED, arriving),
      );
    }
  });

  askMainToResend(ask, HISTORY_UNANSWERED);

  return letGo;
}
