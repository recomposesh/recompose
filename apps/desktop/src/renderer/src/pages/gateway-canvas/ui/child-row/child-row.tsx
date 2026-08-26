import type { ReactElement } from 'react';

import { ContextMenu } from '@base-ui/react/context-menu';

import type { LadderRow, OpenChild, RouterChild, Toward } from '../router-child-list/router-child';

import { Icon, Tooltip } from '../../../../shared/ui';
import { ChildFace } from '../child-face/child-face';
import { moveButtonFace, rowShell } from '../router-child-list/router-child';

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
    <Tooltip label={`Move ${row.child.name} ${toward}`} side="top">
      <button
        aria-disabled={held || undefined}
        className={moveButtonFace}
        onClick={() => {
          row.onMove(toward);
        }}
        type="button"
      >
        <Icon className={`size-3.5 ${toward === 'up' ? 'rotate-180' : ''}`} name="chevron" />
      </button>
    </Tooltip>
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
          {branchActs(row)}
        </ContextMenu.Popup>
      </ContextMenu.Positioner>
    </ContextMenu.Portal>
  );
}

/**
 * What a person can do to a branch beyond moving it, which is edit its rule or take it away.
 *
 * @summary They live in the row's own menu rather than in the rule sheet, because a surface that
 * can both save and destroy makes a person read two buttons carefully every time they meant to fix
 * a typo. A child holding no branch offers neither, since there is no rule to edit and dropping it
 * is the plain node removal every other row already answers to.
 */
function branchActs(row: LadderRow): ReactElement | null {
  const { child, onEditRule, onDelete } = row;

  if (child.label === undefined || onEditRule === undefined || onDelete === undefined) {
    return null;
  }

  return (
    <>
      <ContextMenu.Item className="menu-action" onClick={onEditRule}>
        Edit prompt
      </ContextMenu.Item>
      <ContextMenu.Item className="menu-action text-danger-ink" onClick={onDelete}>
        Delete branch
      </ContextMenu.Item>
    </>
  );
}

/**
 * The rank a row answers to, which only a row standing for no branch prints.
 *
 * @summary A branch answers to the word its judge names rather than to a place in a queue, and that
 * word already leads the face, so a rank beside it would offer an order nothing reads.
 */
function rowLead(child: RouterChild, rank: number): ReactElement | null {
  if (child.label !== undefined) {
    return null;
  }

  return (
    <span
      className="w-4 shrink-0 text-center text-control font-medium text-ink-secondary"
      data-rank=""
    >
      {rank}
    </span>
  );
}

/**
 * A row that stays where it is, keeping the reason in the open rather than the controls.
 *
 * @summary The else branch cannot move or leave, and a row that simply lost its handle would say
 * nothing about why. It keeps its face, so opening the child it names still works, and the reason
 * reads in the line every other row explains itself on, where a person meets it before they go
 * looking for the missing control.
 */
function heldRow(child: RouterChild, onOpen: OpenChild): ReactElement {
  return (
    <li className={rowShell} data-held="" key={child.routeNodeId}>
      <ChildFace child={child} onOpen={onOpen} />
    </li>
  );
}

export function ChildRow({ row, onOpen }: { row: LadderRow; onOpen: OpenChild }): ReactElement {
  const { child, rank, onDrop, onDragStart, onEditRule } = row;

  if (child.inertReason !== undefined) {
    return heldRow(child, onOpen);
  }

  return (
    <ContextMenu.Root key={child.routeNodeId}>
      <ContextMenu.Trigger
        className={rowShell}
        onDragOver={(event) => {
          event.preventDefault();
        }}
        onDrop={onDrop}
        render={<li />}
      >
        {rowLead(child, rank)}
        <ChildFace child={child} onEditRule={onEditRule} onOpen={onOpen} />
        {moveButton(row, 'up')}
        {moveButton(row, 'down')}
        <span
          aria-hidden
          className="flex size-hit-target shrink-0 cursor-grab items-center justify-center text-ink-tertiary group-hover:text-ink-secondary"
          data-drag-handle=""
          draggable
          onDragStart={onDragStart}
        >
          <Icon className="size-4" name="grip" />
        </span>
      </ContextMenu.Trigger>
      {rowMenu(row)}
    </ContextMenu.Root>
  );
}
