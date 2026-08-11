import type { Account, LogRow as LoggedRequest } from '@recompose/contracts';
import type { VirtualItem } from '@tanstack/react-virtual';
import type { KeyboardEvent, ReactNode } from 'react';

import { useVirtualizer } from '@tanstack/react-virtual';
import { useId, useState } from 'react';

import { LogRow } from '../log-row/log-row';
import { LOG_ROW_HEIGHT, copiedRow } from '../log-row/logged-request';
import { announced, useArrivals } from './arriving-requests';

const ROWS_BEYOND_VIEW = 8;

/**
 * The key one seat in the run is drawn under, which is the request's own id.
 *
 * @summary Keying by id rather than by seat is what lets requests land above a row without React
 * rebuilding every row beneath it.
 */
function keyOf(rows: readonly LoggedRequest[], seat: number): string | number {
  return rows[seat]?.id ?? seat;
}

/**
 * Where the request under the cursor sits now, or nothing where it is no longer listed.
 *
 * @summary The cursor holds the request rather than the seat, so requests landing above it and a
 * scope widening under it both leave it on the very request a person put it on. A narrowing that
 * takes that request away leaves no cursor at all, which is what stops a copy from quietly handing
 * over a different request's line.
 */
function seatOf(rows: readonly LoggedRequest[], cursor: string | undefined): number | undefined {
  if (cursor === undefined) {
    return undefined;
  }

  const seat = rows.findIndex((row) => row.id === cursor);

  return seat < 0 ? undefined : seat;
}

function arrivalRegion(arrived: number): ReactNode {
  return (
    <p className="sr-only" role="status">
      {announced(arrived)}
    </p>
  );
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
  seat: number | undefined;
  known: Map<string, Account>;
  onCursorMoved: (seat: number) => void;
};

function copiedByKey(event: KeyboardEvent<HTMLDivElement>, walk: Walk): void {
  const taken = walk.seat === undefined ? undefined : walk.rows[walk.seat];

  if (taken === undefined || !askedToCopy(event)) {
    return;
  }

  event.preventDefault();
  void navigator.clipboard.writeText(copiedRow(taken, walk.known.get(taken.accountId ?? '')));
}

function walkedByKey(event: KeyboardEvent<HTMLDivElement>, walk: Walk): void {
  const moved = movedCursor(event.key, walk.seat, walk.rows.length);

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
        place={item.index + 1}
        underCursor={item.index === walk.seat}
        wholeRun={walk.rows.length}
      />
    );
  });
}

/**
 * The row the cursor points a reader at, or nothing while that row is not drawn.
 *
 * @summary Only the rows in view exist in the page, so a reference to one that has scrolled away
 * would resolve to nothing at all. The cursor itself holds, and a copy still takes the right
 * request: it is only the reference a screen reader follows that has to let go.
 */
function cursorRef(
  drawn: readonly VirtualItem[],
  walk: Walk,
  rowId: (id: string) => string,
): string | undefined {
  const under = walk.seat === undefined ? undefined : walk.rows[walk.seat];

  if (under === undefined || !drawn.some((item) => item.index === walk.seat)) {
    return undefined;
  }

  return rowId(under.id);
}

type RequestRun = {
  drawn: readonly VirtualItem[];
  wholeRun: number;
  walk: Walk;
  rowId: (id: string) => string;
  holdScrolling: (scrolling: HTMLDivElement | null) => void;
};

function requestRun({ drawn, wholeRun, walk, rowId, holdScrolling }: RequestRun): ReactNode {
  return (
    <div
      aria-activedescendant={cursorRef(drawn, walk, rowId)}
      aria-label="Served requests"
      className="min-h-0 flex-1 overflow-y-auto focus-ring pt-1 outline-none"
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

type LogListProps = {
  /** The requests to list, newest first, in the order the cache holds them. */
  rows: readonly LoggedRequest[];
  /**
   * What narrowed the rows to these, which changes whenever the predicate above does.
   *
   * @summary The list is handed rows rather than a predicate, so a scope change and a run of
   * arrivals look identical from here. This tells them apart.
   */
  scope: string;
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
export function LogList({ rows, scope, accounts, nothingYet }: LogListProps) {
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [scrolling, setScrolling] = useState<HTMLDivElement | null>(null);
  const listId = useId();

  const virtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: () => LOG_ROW_HEIGHT,
    getItemKey: (seat) => keyOf(rows, seat),
    getScrollElement: () => scrolling,
    overscan: ROWS_BEYOND_VIEW,
  });

  const arrived = useArrivals({ rows, scope, scrolling });

  if (rows.length === 0) {
    return (
      <>
        <p className="px-3 py-2 text-detail text-ink-secondary">{nothingYet}</p>
        {arrivalRegion(arrived)}
      </>
    );
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
          seat: seatOf(rows, cursor),
          known: new Map(accounts.map((account) => [account.id, account])),
          onCursorMoved: (seat) => {
            setCursor(rows[seat]?.id);
            virtualizer.scrollToIndex(seat);
          },
        },
      })}
      {arrivalRegion(arrived)}
    </>
  );
}
