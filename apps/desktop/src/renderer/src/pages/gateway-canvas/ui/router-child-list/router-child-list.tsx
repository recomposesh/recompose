import type { ReactElement, RefObject } from 'react';

import { useRef, useState } from 'react';

import type { RouterMode } from '../../lib/routing-edits';
import type { LadderActs, OpenChild, RouterChild } from './router-child';

import { ChildFace } from '../child-face/child-face';
import { ChildRow } from '../child-row/child-row';
import { rowShell } from './router-child';
import { spokenRank, spokenSubject } from './spoken-rank';

export type { RouterChild };

type RouterChildListProps = {
  /** How the router spreads its requests, which is what decides whether the order means anything. */
  mode: RouterMode;
  /** The children in declared order, which under failover is the order requests try them. */
  rows: readonly RouterChild[];
  /** Receives the rank a row moved from and the rank it moved to. */
  onMove: (from: number, to: number) => void;
  /** Receives the child a person opened, which selects its card and turns the drawer to it. */
  onOpen: OpenChild;
};

function unorderedList(rows: readonly RouterChild[], onOpen: OpenChild): ReactElement {
  return (
    <ul aria-label="Children" className="field-box p-px">
      {rows.map((child) => (
        <li className={rowShell} key={child.routeNodeId}>
          <ChildFace child={child} onOpen={onOpen} />
        </li>
      ))}
    </ul>
  );
}

function ladderActs(
  index: number,
  grabbed: RefObject<number | undefined>,
  carried: (from: number, to: number) => void,
): LadderActs {
  return {
    onMove: (toward) => {
      carried(index, toward === 'up' ? index - 1 : index + 1);
    },
    onDragStart: () => {
      grabbed.current = index;
    },
    onDrop: () => {
      const from = grabbed.current;

      grabbed.current = undefined;

      if (from !== undefined && from !== index) {
        carried(from, index);
      }
    },
  };
}

/**
 * The children a router holds, as a ladder under failover and as a plain list under round-robin.
 *
 * @summary Reach for it in the router inspector, which is the one place this canvas hosts the
 * reorder gesture: no reference reorders inline on a canvas, and a card edge has nowhere to put a
 * rank. Under failover every row prints its rank, so the result of a move reads without counting
 * rows, and the handle, the two move buttons, and the row's own context menu are three ways to the
 * same act, which is what keeps the drag gesture's single-pointer and keyboard twins honest. Rows
 * key by their route node id, so a move carries each row's own controls with it and the control a
 * person pressed keeps the focus it had. Under round-robin no end of the list wins, so it carries
 * no rank and no way to order it, because an affordance for an order nothing reads would be a lie.
 */
export function RouterChildList({ mode, rows, onMove, onOpen }: RouterChildListProps) {
  const grabbed = useRef<number | undefined>(undefined);
  const [said, setSaid] = useState<string | undefined>(undefined);

  const carried = (from: number, to: number): void => {
    const held = rows[from];

    if (held === undefined || to < 0 || to >= rows.length) {
      return;
    }

    onMove(from, to);
    setSaid(`${spokenSubject(held)} is now ${spokenRank(to + 1, rows.length)}.`);
  };

  if (rows.length === 0) {
    return (
      <p className="field-box px-3 py-2.5 text-detail text-ink-secondary">
        This router holds no child yet. Drag a cable from its port to bind one.
      </p>
    );
  }

  if (mode === 'round-robin') {
    return unorderedList(rows, onOpen);
  }

  return (
    <>
      <ol aria-label="Children" className="field-box p-px">
        {rows.map((child, index) => (
          <ChildRow
            key={child.routeNodeId}
            onOpen={onOpen}
            row={{
              child,
              rank: index + 1,
              total: rows.length,
              ...ladderActs(index, grabbed, carried),
            }}
          />
        ))}
      </ol>
      <p className="sr-only" role="status">
        {said}
      </p>
    </>
  );
}
