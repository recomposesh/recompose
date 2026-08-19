import type { RowLeadFace } from '../row-lead/row-lead';

/** One child of a router, read as the row a person orders it by. */
export type RouterChild = RowLeadFace & {
  /** The id the stored table holds this child under, which is what a move names. */
  routeNodeId: string;
  /** The card this child stands as on the canvas, which is what opening the row reaches. */
  cardId: string;
  /** What the child answers to, which is the account behind it or the router it is. */
  name: string;
  /** A quieter fact under the name, which is the real model a target serves. */
  detail?: string | undefined;
  /** The word the judge answers with for this child, where a branch names one. */
  label?: string | undefined;
  /** The branch's rule in one line, which the sheet holds whole. */
  rule?: string | undefined;
  /** How many conversations this branch currently holds, where it holds any. */
  pins?: number | undefined;
  /** Why this row cannot move or leave, which keeps it reachable rather than missing. */
  inertReason?: string | undefined;
};

/** Which way a move carries a row. */
export type Toward = 'up' | 'down';

/** What one row can be asked to do, which the list hands each row it draws. */
export type LadderActs = {
  onMove: (toward: Toward) => void;
  onDragStart: () => void;
  onDrop: () => void;
};

/** One row of the ladder, which is the child, where it stands, and what it can be asked. */
export type LadderRow = { child: RouterChild; rank: number; total: number } & LadderActs;

/** Receives the child a person opened, which selects its card and turns the drawer to it. */
export type OpenChild = (child: RouterChild) => void;

export const rowShell =
  'group flex items-center gap-2.5 border-t border-line-faint px-3 py-1.5 first:border-t-0 row-hover';

export const moveButtonFace =
  'flex size-hit-target shrink-0 items-center justify-center rounded-control opacity-0 focus-ring text-ink-secondary group-hover:opacity-100 focus-visible:opacity-100 aria-disabled:text-ink-tertiary';
