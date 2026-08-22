import { screen, userEvent } from 'storybook/test';

import type { LadderRow, RouterChild } from '../ui/router-child-list/router-child';

/**
 * The rows every reading of a router's ladder stands on, written once for all three surfaces.
 *
 * @summary The face, the row, and the whole list each need the same children, and three story
 * files spelling them separately would drift the moment the row shape gained a fact.
 */
export const boundRow: RouterChild = {
  routeNodeId: 'n1',
  cardId: 'target:fast@n1',
  name: 'Work key',
  detail: 'claude-sonnet-5',
  mark: 'anthropic',
};

/** A branch holding both halves of what the judge reads, and the conversations it has earned. */
export const branchRow: RouterChild = {
  ...boundRow,
  label: 'code',
  rule: 'questions about source code, diffs, and build failures',
  pins: 3,
};

/** A second branch, so a reading about a ladder has more than one row to order. */
export const chatRow: RouterChild = {
  routeNodeId: 'n2',
  cardId: 'target:fast@n2',
  name: 'Claude Max',
  detail: 'claude-opus-5',
  label: 'chat',
  rule: 'everyday conversation',
};

const WHY_ELSE_STAYS =
  'Every conditional router keeps an else branch. It catches a request the judge read but could not place.';

/** The branch no rule places, which every conditional router carries and no edit removes. */
export const elseRow: RouterChild = {
  routeNodeId: 'n3',
  cardId: 'target:fast@n3',
  name: 'Ollama',
  detail: 'qwen3',
  label: 'Else',
  inertReason: WHY_ELSE_STAYS,
};

/** The same three children under a router that reads no requests, so no row carries a branch. */
export const plainRows: readonly RouterChild[] = [
  boundRow,
  { routeNodeId: 'n2', cardId: 'target:fast@n2', name: 'Claude Max', detail: 'claude-opus-5' },
  { routeNodeId: 'n3', cardId: 'target:fast@n3', name: 'Ollama', detail: 'qwen3' },
];

/** A child bound by cable that holds no rule yet, so the judge is never offered it. */
export const unruledRow: RouterChild = {
  routeNodeId: 'n1',
  cardId: 'target:fast@n1',
  name: 'Work key',
  label: 'draft',
};

/** A branch nobody has worded, which is the one row standing between a person and a save. */
export const unwordedRow: RouterChild = { ...boundRow, label: '', rule: '' };

/** One row of the ladder with the acts a story never needs to answer. */
export function ladderRowOf(child: RouterChild, rank: number, total = 3): LadderRow {
  return { child, rank, total, onMove: () => {}, onDragStart: () => {}, onDrop: () => {} };
}

/**
 * Opens one row's own context menu and takes the act named on it.
 *
 * @summary The menu is the only way to reach a branch's rule or its removal, so every reading of
 * either one walks the same two steps and spelling them per story would drift the moment the menu
 * gained an item.
 */
export async function pickedFromTheRowMenu(row: HTMLElement, act: string): Promise<void> {
  await userEvent.pointer({ keys: '[MouseRight]', target: row });
  await userEvent.click(await screen.findByRole('menuitem', { name: act }));
}
