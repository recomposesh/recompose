import type { RefObject } from 'react';
import type { ReactElement } from 'react';

import { ContextMenu } from '@base-ui/react/context-menu';
import { useRef, useState } from 'react';

import type { RouterMode } from '../../lib/routing-edits';

import { Icon } from '../../../../shared/ui';
import { spokenRank } from './spoken-rank';

/** One child of a router, read as the row a person orders it by. */
export type RouterChild = {
  /** The id the stored table holds this child under, which is what a move names. */
  routeNodeId: string;
  /** What the child answers to, which is the account behind it or the router it is. */
  name: string;
  /** A quieter fact under the name, which is the real model a target serves. */
  detail?: string | undefined;
};

/** Which way a move carries a row. */
type Toward = 'up' | 'down';

type RouterChildListProps = {
  /** How the router spreads its requests, which is what decides whether the order means anything. */
  mode: RouterMode;
  /** The children in declared order, which under failover is the order requests try them. */
  rows: readonly RouterChild[];
  /** Receives the rank a row moved from and the rank it moved to. */
  onMove: (from: number, to: number) => void;
};

type LadderActs = {
  onMove: (toward: Toward) => void;
  onDragStart: () => void;
  onDrop: () => void;
};

type LadderRow = { child: RouterChild; rank: number; total: number } & LadderActs;

const rowShell = 'group flex items-center gap-1.5 border-t border-line-faint first:border-t-0';

const ladderRowFrame = `${rowShell} px-1 row-hover`;

const plainRowFrame = `${rowShell} px-3 row-hover`;

const moveButtonFace =
  'flex size-hit-target shrink-0 items-center justify-center rounded-control opacity-0 focus-ring text-ink-secondary group-hover:opacity-100 focus-visible:opacity-100 aria-disabled:text-ink-tertiary';

function childFace(child: RouterChild): ReactElement {
  return (
    <>
      <span className="min-w-0 truncate text-control text-ink" data-child-name="">
        {child.name}
      </span>
      {child.detail === undefined ? null : (
        <span className="min-w-0 flex-1 truncate font-mono text-mono-caption text-ink-secondary">
          {child.detail}
        </span>
      )}
    </>
  );
}

/**
 * One move control, which stays reachable at the end of the ladder rather than dropping out.
 *
 * @summary A button at the top or the bottom says `aria-disabled` rather than `disabled`, because
 * a browser blurs a control the moment it disables one: a row moved to rank one would throw focus
 * to the page and leave a person hunting for where their child went.
 */
function moveButton(row: LadderRow, toward: Toward): ReactElement {
  const held = toward === 'up' ? row.rank === 1 : row.rank === row.total;

  return (
    <button
      aria-disabled={held || undefined}
      aria-label={`Move ${row.child.name} ${toward}`}
      className={moveButtonFace}
      onClick={() => {
        row.onMove(toward);
      }}
      type="button"
    >
      <Icon className={`size-3.5 ${toward === 'up' ? 'rotate-180' : ''}`} name="chevron" />
    </button>
  );
}

function rowMenu(row: LadderRow): ReactElement {
  return (
    <ContextMenu.Portal>
      <ContextMenu.Positioner>
        <ContextMenu.Popup className="menu-surface">
          <ContextMenu.Item
            className="menu-action"
            onClick={() => {
              row.onMove('up');
            }}
          >
            Move up
          </ContextMenu.Item>
          <ContextMenu.Item
            className="menu-action"
            onClick={() => {
              row.onMove('down');
            }}
          >
            Move down
          </ContextMenu.Item>
        </ContextMenu.Popup>
      </ContextMenu.Positioner>
    </ContextMenu.Portal>
  );
}

function ladderRow(row: LadderRow): ReactElement {
  const { child, rank, onDrop, onDragStart } = row;

  return (
    <ContextMenu.Root key={child.routeNodeId}>
      <ContextMenu.Trigger
        className={ladderRowFrame}
        onDragOver={(event) => {
          event.preventDefault();
        }}
        onDrop={onDrop}
        render={<li />}
      >
        <span
          className="w-4 shrink-0 text-end font-mono text-mono-caption text-ink-secondary"
          data-rank=""
        >
          {rank}
        </span>
        <span
          aria-hidden
          className="flex size-hit-target shrink-0 cursor-grab items-center justify-center text-ink-tertiary"
          data-drag-handle=""
          draggable
          onDragStart={onDragStart}
        >
          <Icon className="size-3.5" name="grip" />
        </span>
        {childFace(child)}
        {moveButton(row, 'up')}
        {moveButton(row, 'down')}
      </ContextMenu.Trigger>
      {rowMenu(row)}
    </ContextMenu.Root>
  );
}

function unorderedList(rows: readonly RouterChild[]): ReactElement {
  return (
    <ul aria-label="Children" className="field-box py-0.5">
      {rows.map((child) => (
        <li className={plainRowFrame} key={child.routeNodeId}>
          {childFace(child)}
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
export function RouterChildList({ mode, rows, onMove }: RouterChildListProps) {
  const grabbed = useRef<number | undefined>(undefined);
  const [said, setSaid] = useState<string | undefined>(undefined);

  const carried = (from: number, to: number): void => {
    const held = rows[from];

    if (held === undefined || to < 0 || to >= rows.length) {
      return;
    }

    onMove(from, to);
    setSaid(`${held.name} is now ${spokenRank(to + 1, rows.length)}.`);
  };

  if (rows.length === 0) {
    return (
      <p className="field-box px-3 py-2.5 text-detail text-ink-secondary">
        This router holds no child yet. Drag a cable from its port to bind one.
      </p>
    );
  }

  if (mode === 'round-robin') {
    return unorderedList(rows);
  }

  return (
    <>
      <ol aria-label="Children" className="field-box py-0.5">
        {rows.map((child, index) =>
          ladderRow({
            child,
            rank: index + 1,
            total: rows.length,
            ...ladderActs(index, grabbed, carried),
          }),
        )}
      </ol>
      <p className="sr-only" role="status">
        {said}
      </p>
    </>
  );
}
