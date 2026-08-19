import type { ReactElement } from 'react';

import { ContextMenu } from '@base-ui/react/context-menu';

import type { LadderRow, OpenChild, RouterChild, Toward } from '../router-child-list/router-child';

import { Icon } from '../../../../shared/ui';
import { ChildFace } from '../child-face/child-face';
import { moveButtonFace, rowShell } from '../router-child-list/router-child';

const AWAITING_ITS_WORDS = 'Needs a rule';

/**
 * The word the judge answers with for this row, and how many conversations it currently holds.
 *
 * @summary The count stands in the row rather than tinting the cable, because a pin is a fact
 * about conversations while green on this canvas is a claim about now. It says the word rather
 * than wearing a glyph: at caption size a mark this small reads as a speck, and the whole point of
 * the count is that a person can tell three sticky conversations from thirty.
 *
 * A branch still waiting for its words says so in amber rather than printing an empty column: it
 * is the one row standing between a person and a switch they cannot save, so the row that owes
 * something has to be the row that says it.
 */
function branchLead(child: RouterChild): ReactElement {
  const awaited = child.label === '';

  return (
    <span className="flex w-16 shrink-0 flex-col" data-branch-label="">
      <span
        className={`truncate text-control font-medium ${awaited ? 'text-attention-ink' : 'text-ink-secondary'}`}
      >
        {awaited ? AWAITING_ITS_WORDS : child.label}
      </span>
      {child.pins === undefined ? null : (
        <span className="truncate text-caption text-ink-secondary" data-pin-tally="">
          {`${String(child.pins)} pinned`}
        </span>
      )}
    </span>
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
        Edit rule
      </ContextMenu.Item>
      <ContextMenu.Item className="menu-action text-danger-ink" onClick={onDelete}>
        Delete branch
      </ContextMenu.Item>
    </>
  );
}

function rowLead(child: RouterChild, rank: number): ReactElement {
  if (child.label !== undefined) {
    return branchLead(child);
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
 * reads under the name where a person meets it before they go looking for the missing control.
 */
function heldRow(child: RouterChild, onOpen: OpenChild): ReactElement {
  return (
    <li className={rowShell} data-held="" key={child.routeNodeId}>
      {branchLead(child)}
      <ChildFace child={child} onOpen={onOpen} />
    </li>
  );
}

export function ChildRow({ row, onOpen }: { row: LadderRow; onOpen: OpenChild }): ReactElement {
  const { child, rank, onDrop, onDragStart } = row;

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
        <ChildFace child={child} onOpen={onOpen} />
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
