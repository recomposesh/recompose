import type { ReactElement } from 'react';

import { ContextMenu } from '@base-ui/react/context-menu';

import type { LadderRow, OpenChild, RouterChild, Toward } from './router-child';

import { Icon } from '../../../../shared/ui';
import { RowLead } from '../row-lead/row-lead';
import { moveButtonFace, rowShell } from './router-child';

/**
 * What one child answers to, with the binding it stands for under it.
 *
 * @summary The two read as two lines rather than one, because the account and the real model it
 * serves are both long and side by side each one truncates the other away. Stacked, the name a
 * person scans down the ladder starts in one column and the binding they check reads whole.
 */
export function childFace(child: RouterChild, onOpen: (child: RouterChild) => void): ReactElement {
  return (
    <button
      className="flex min-h-hit-target min-w-0 flex-1 items-center gap-2.5 rounded-control focus-ring text-start"
      onClick={() => {
        onOpen(child);
      }}
      type="button"
    >
      <RowLead glyph={child.glyph} glyphTint={child.glyphTint} mark={child.mark} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-control font-medium text-ink" data-child-name="">
          {child.name}
        </span>{' '}
        {child.detail === undefined ? null : (
          <span className="truncate font-mono text-mono-value text-ink-secondary">
            {child.detail}
          </span>
        )}
        {ruleLine(child)}
      </span>
    </button>
  );
}

const NO_RULE_YET = 'No rule yet, so the judge is never offered this branch.';

/**
 * The rule this branch routes by, in one line, with the whole of it a press away in the sheet.
 *
 * @summary A branch holding no rule says so rather than showing an empty line, because a child
 * bound by cable and left unruled receives nothing and a blank row would read as a working branch.
 * The else row shows neither: it catches what no rule placed, so a rule is the one thing it cannot
 * have.
 */
function ruleLine(child: RouterChild): ReactElement | null {
  if (child.inertReason !== undefined) {
    return (
      <span className="text-detail text-ink-secondary" data-else-reason="">
        {child.inertReason}
      </span>
    );
  }

  if (child.label === undefined && child.rule === undefined) {
    return null;
  }

  return (
    <span className="truncate text-detail text-ink-secondary" data-rule-preview="">
      {child.rule ?? NO_RULE_YET}
    </span>
  );
}

/**
 * The word the judge answers with for this row, and how many conversations it currently holds.
 *
 * @summary The count stands in the row rather than tinting the cable, because a pin is a fact
 * about conversations while green on this canvas is a claim about now. It says the word rather
 * than wearing a glyph: at caption size a mark this small reads as a speck, and the whole point of
 * the count is that a person can tell three sticky conversations from thirty.
 */
function branchLead(child: RouterChild): ReactElement {
  return (
    <span className="flex w-16 shrink-0 flex-col" data-branch-label="">
      <span className="truncate text-control font-medium text-ink-secondary">{child.label}</span>
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
        </ContextMenu.Popup>
      </ContextMenu.Positioner>
    </ContextMenu.Portal>
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
      {childFace(child, onOpen)}
    </li>
  );
}

export function ladderRow(row: LadderRow, onOpen: OpenChild): ReactElement {
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
        {childFace(child, onOpen)}
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
