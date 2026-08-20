import type { ConditionalSwitch } from '../../lib/conditional-draft';
import type { RouterChild } from '../router-child-list/router-child';

import { ELSE, WHY_ELSE_STAYS } from '../router-inspector/router-child-rows';

/**
 * The ladder of a router being switched, read as the branches it is about to become.
 *
 * @summary Every child a person already bound arrives as a draft branch rather than as a plain
 * rung, because switching is not rebuilding: the bindings stand, and what the switch collects is
 * the words each one answers to. A branch nobody has worded yet carries blanks rather than a label
 * guessed from the account behind it, and the row paints that blankness rather than printing a word
 * the judge would then route real requests by. The last row stands as the else and says why, which
 * is the same sentence a stored conditional ladder shows on the same row.
 *
 * The rows read in the definition's own order rather than the stored one, because reordering is
 * how the else gets chosen: rows that snapped back to the stored order after a move would tell a
 * person their choice had not landed.
 */
export function switchDefinitionRows(
  base: readonly RouterChild[],
  held: ConditionalSwitch,
): readonly RouterChild[] {
  const bound = new Map(base.map((row) => [row.routeNodeId, row]));
  const last = held.branches.length - 1;
  const rows: RouterChild[] = [];

  for (const [rank, branch] of held.branches.entries()) {
    const row = bound.get(branch.routeNodeId);

    if (row !== undefined) {
      rows.push(
        rank === last
          ? { ...row, label: ELSE, inertReason: WHY_ELSE_STAYS }
          : { ...row, label: branch.label, rule: branch.rule },
      );
    }
  }

  return rows;
}
