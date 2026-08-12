import type { UsageBucket } from '@recompose/contracts';

import type { PanelRow } from '../ui/breakdown-panel/breakdown-panel';
import type { GroupDimension } from './usage-groups';

import { compactCount, exactCount } from '../../../shared/lib';
import { groupedBy } from './usage-groups';

const ABSENCE_WORDING: Readonly<Record<GroupDimension, string>> = {
  gateway: 'No gateway',
  virtualModel: 'Direct traffic',
  provider: 'No provider reached',
  account: 'No account reached',
  target: 'No target reached',
};

/**
 * One panel's printed rows, folded from the buckets every other reading folds from.
 *
 * @summary A row's share is of the panel's own total, so three panels of one window each read as
 * a whole. Traffic that never reached the dimension keeps its measures under a named absence
 * rather than vanishing into the others.
 */
export function panelRowsOf(
  buckets: readonly UsageBucket[],
  dimension: GroupDimension,
  nameOf: (key: string) => string,
): readonly PanelRow[] {
  return groupedBy(buckets, dimension).map((row) => ({
    key: row.key,
    name: row.key === undefined ? ABSENCE_WORDING[dimension] : nameOf(row.key),
    requests: exactCount(row.measures.requests),
    tokens: compactCount(row.measures.tokens.total),
    share: row.share,
  }));
}
