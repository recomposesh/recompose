import type { LogRow as LoggedRequest } from '@recompose/contracts';

import { useLayoutEffect, useRef, useState } from 'react';

import { LOG_ROW_HEIGHT } from '../log-row/logged-request';

/**
 * How many requests arrived above the row that stood at the top.
 *
 * @summary Counting by the row a person was reading rather than by how many rows the list holds is
 * what makes the answer survive the cache's own cap: a run that appended three and dropped three off
 * the bottom still moved the reading down by three. A scope that held nothing counts every row it
 * now holds, because all of them arrived while nobody was reading any of them.
 */
function arrivedAbove(rows: readonly LoggedRequest[], wasFirst: string | undefined): number {
  if (wasFirst === undefined) {
    return rows.length;
  }

  const seat = rows.findIndex((row) => row.id === wasFirst);

  return seat < 0 ? 0 : seat;
}

/**
 * What a reader hears once a batch lands: how many requests arrived while they were reading.
 *
 * @summary The count runs on rather than restarting per batch, because two batches of the same size
 * would otherwise write the same sentence twice and a live region says nothing when its text has not
 * changed. A gateway serving one request per tick would then have announced itself exactly once. The
 * count starts over whenever the scope does, so it always answers one question: how much has arrived
 * since this list began saying what it says now.
 */
export function announced(arrived: number): string {
  if (arrived === 0) {
    return '';
  }

  return arrived === 1 ? '1 new request.' : `${String(arrived)} new requests.`;
}

function heldInPlace(scrolling: HTMLDivElement | null, landed: number): void {
  if (scrolling !== null && scrolling.scrollTop > 0) {
    scrolling.scrollTop += landed * LOG_ROW_HEIGHT;
  }
}

type Watching = { scope: string; firstId: string | undefined; started: boolean };

type ArrivalWatch = {
  /** The requests standing right now, newest first. */
  rows: readonly LoggedRequest[];
  /** What narrowed the rows to these, so a scope change never reads as a run of arrivals. */
  scope: string;
  /** The box the rows scroll inside, or nothing while no rows stand to scroll. */
  scrolling: HTMLDivElement | null;
};

/**
 * Keeps a person's place as requests land above it, and counts how many did.
 *
 * @summary The viewport travels by exactly what arrived, so history stays still under a gateway
 * working as hard as it likes. Resting at the top means following instead, since that is what a
 * person parked there asked for. A scope changing is not an arrival, however far it moves the row
 * that stood at the top, so the watch starts over rather than counting: otherwise turning a
 * narrowing off would announce requests nobody served and shove a reader's place down the run. The
 * very first commit starts the watch rather than counting what was already there, because nothing
 * arrived while nobody was watching yet.
 */
export function useArrivals({ rows, scope, scrolling }: ArrivalWatch): number {
  const [arrived, setArrived] = useState(0);
  const stood = useRef<Watching>({ scope, firstId: undefined, started: false });

  useLayoutEffect(() => {
    const before = stood.current;

    stood.current = { scope, firstId: rows[0]?.id, started: true };

    if (before.scope !== scope) {
      setArrived(0);

      return;
    }

    const landed = before.started ? arrivedAbove(rows, before.firstId) : 0;

    if (landed > 0) {
      heldInPlace(scrolling, landed);
      setArrived((held) => held + landed);
    }
  }, [rows, scope, scrolling]);

  return arrived;
}
