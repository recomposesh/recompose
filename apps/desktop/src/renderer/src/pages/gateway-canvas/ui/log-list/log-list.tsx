import type { Account, LogRow as LoggedRequest } from '@recompose/contracts';
import type { VirtualItem } from '@tanstack/react-virtual';
import type { Dispatch, KeyboardEvent, ReactNode, SetStateAction } from 'react';

import { useVirtualizer } from '@tanstack/react-virtual';
import { useId, useLayoutEffect, useRef, useState } from 'react';

import { LogRow } from '../log-row/log-row';
import { LOG_ROW_HEIGHT, copiedRow } from '../log-row/logged-request';

const ROWS_BEYOND_VIEW = 8;

/**
 * How many requests arrived above the row that stood at the top.
 *
 * @summary Counting by the row a person was reading rather than by how many rows the list holds is
 * what makes the answer survive the cache's own cap: a run that appended three and dropped three off
 * the bottom still moved the reading down by three.
 */
function arrivedAbove(rows: readonly LoggedRequest[], wasFirst: string | undefined): number {
  if (wasFirst === undefined) {
    return 0;
  }

  const seat = rows.findIndex((row) => row.id === wasFirst);

  return seat < 0 ? 0 : seat;
}

/**
 * The key one seat in the run is drawn under, which is the request's own id.
 *
 * @summary Keying by id rather than by seat is what lets requests land above a row without React
 * rebuilding every row beneath it, and what keeps the cursor on the request a person chose.
 */
function keyOf(rows: readonly LoggedRequest[], seat: number): string | number {
  return rows[seat]?.id ?? seat;
}

function announced(arrived: number): string {
  return arrived === 1 ? '1 new request.' : `${String(arrived)} new requests.`;
}

function movedCursor(key: string, seat: number | undefined, rows: number): number | undefined {
  if (key === 'ArrowDown') {
    return seat === undefined ? 0 : Math.min(seat + 1, rows - 1);
  }

  if (key === 'ArrowUp') {
    return seat === undefined ? 0 : Math.max(seat - 1, 0);
  }

  return undefined;
}

function askedToCopy(event: KeyboardEvent<HTMLDivElement>): boolean {
  return event.key.toLowerCase() === 'c' && (event.metaKey || event.ctrlKey);
}

type Walk = {
  rows: readonly LoggedRequest[];
  cursor: number | undefined;
  known: Map<string, Account>;
  onCursorMoved: (seat: number) => void;
};

function copiedByKey(event: KeyboardEvent<HTMLDivElement>, walk: Walk): void {
  const taken = walk.cursor === undefined ? undefined : walk.rows[walk.cursor];

  if (taken === undefined || !askedToCopy(event)) {
    return;
  }

  void navigator.clipboard.writeText(copiedRow(taken, walk.known.get(taken.accountId ?? '')));
}

function walkedByKey(event: KeyboardEvent<HTMLDivElement>, walk: Walk): void {
  const moved = movedCursor(event.key, walk.cursor, walk.rows.length);

  if (moved === undefined) {
    copiedByKey(event, walk);

    return;
  }

  event.preventDefault();
  walk.onCursorMoved(moved);
}

function drawnRows(
  drawn: readonly VirtualItem[],
  walk: Walk,
  rowId: (id: string) => string,
): ReactNode {
  return drawn.map((item) => {
    const logged = walk.rows[item.index];

    return logged === undefined ? null : (
      <LogRow
        account={walk.known.get(logged.accountId ?? '')}
        id={rowId(logged.id)}
        key={item.key}
        logged={logged}
        underCursor={item.index === walk.cursor}
      />
    );
  });
}

type RequestRun = {
  drawn: readonly VirtualItem[];
  wholeRun: number;
  walk: Walk;
  rowId: (id: string) => string;
  holdScrolling: (scrolling: HTMLDivElement | null) => void;
};

function cursorId(walk: Walk, rowId: (id: string) => string): string | undefined {
  const under = walk.cursor === undefined ? undefined : walk.rows[walk.cursor];

  return under === undefined ? undefined : rowId(under.id);
}

function requestRun({ drawn, wholeRun, walk, rowId, holdScrolling }: RequestRun): ReactNode {
  return (
    <div
      aria-activedescendant={cursorId(walk, rowId)}
      aria-label="Served requests"
      className="min-h-0 flex-1 overflow-y-auto focus-ring outline-none"
      onKeyDown={(event) => {
        walkedByKey(event, walk);
      }}
      ref={holdScrolling}
      role="listbox"
      tabIndex={0}
    >
      <div style={{ height: `${String(wholeRun)}px` }}>
        <div style={{ transform: `translateY(${String(drawn[0]?.start ?? 0)}px)` }}>
          {drawnRows(drawn, walk, rowId)}
        </div>
      </div>
    </div>
  );
}

type ArrivalWatch = {
  rows: readonly LoggedRequest[];
  scrolling: HTMLDivElement | null;
  setArrival: Dispatch<SetStateAction<string>>;
  setCursor: Dispatch<SetStateAction<number | undefined>>;
};

/**
 * Keeps a person's place as requests land above it, and says how many did.
 *
 * @summary The viewport travels by exactly what arrived, so history stays still under a gateway
 * working as hard as it likes, and the cursor rides along rather than sliding onto a row nobody put
 * it on. Resting at the top means following instead, since that is what a person parked there asked
 * for. The count reaches a reader once per batch, because a busy gateway announcing every row would
 * be unusable.
 */
function useArrivals({ rows, scrolling, setArrival, setCursor }: ArrivalWatch): void {
  const stoodFirst = useRef<string | undefined>(undefined);

  useLayoutEffect(() => {
    const wasFirst = stoodFirst.current;

    stoodFirst.current = rows[0]?.id;

    const arrived = arrivedAbove(rows, wasFirst);

    if (arrived === 0 || scrolling === null) {
      return;
    }

    if (scrolling.scrollTop > 0) {
      scrolling.scrollTop += arrived * LOG_ROW_HEIGHT;
    }

    setArrival(announced(arrived));
    setCursor((seat) => (seat === undefined ? undefined : seat + arrived));
  }, [rows, scrolling, setArrival, setCursor]);
}

type LogListProps = {
  /** The requests to list, newest first, in the order the cache holds them. */
  rows: readonly LoggedRequest[];
  /** The registry the rows read their accounts against, naming what served each request. */
  accounts: readonly Account[];
  /** The line standing where the scope on the drawer holds no requests at all. */
  nothingYet: string;
};

/**
 * The gateway's requests as a run of rows, newest at the top.
 *
 * @summary Reach for it inside the logs drawer. It draws only the rows in view, so a full history
 * costs one screen of work rather than ten thousand rows of it, and it never reorders what it was
 * handed, because the cache already decided what newest means. It follows the newest request only
 * while the viewport rests at the top: a person who scrolled back into history keeps reading the
 * same rows however hard the gateway works, since a list that yanked itself upward would make
 * history unreadable exactly when there is most of it. The whole run is one tab stop with a cursor
 * the arrows walk, and the row under the cursor is what a copy takes, so reading and copying a
 * request never needs a pointer. A scope holding nothing reads its own line, because a filtered-out
 * list and a broken one must never look alike.
 */
export function LogList({ rows, accounts, nothingYet }: LogListProps) {
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const [arrival, setArrival] = useState('');
  const [scrolling, setScrolling] = useState<HTMLDivElement | null>(null);
  const listId = useId();

  const virtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: () => LOG_ROW_HEIGHT,
    getItemKey: (seat) => keyOf(rows, seat),
    getScrollElement: () => scrolling,
    overscan: ROWS_BEYOND_VIEW,
  });

  useArrivals({ rows, scrolling, setArrival, setCursor });

  if (rows.length === 0) {
    return <p className="px-3 py-2 text-detail text-ink-secondary">{nothingYet}</p>;
  }

  return (
    <>
      {requestRun({
        drawn: virtualizer.getVirtualItems(),
        wholeRun: virtualizer.getTotalSize(),
        rowId: (id) => `${listId}-${id}`,
        holdScrolling: setScrolling,
        walk: {
          rows,
          cursor,
          known: new Map(accounts.map((account) => [account.id, account])),
          onCursorMoved: (seat) => {
            setCursor(seat);
            virtualizer.scrollToIndex(seat);
          },
        },
      })}
      <p className="sr-only" role="status">
        {arrival}
      </p>
    </>
  );
}
