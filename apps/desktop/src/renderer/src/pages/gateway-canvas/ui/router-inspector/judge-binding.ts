import type { VirtualModel } from '@recompose/contracts';

import type { JudgeBinding } from '../../lib/conditional-draft';
import type { ConditionalPolicy } from '../../lib/conditional-policy';

const NO_JUDGE: JudgeBinding = { accountId: '', providerModel: '' };

/**
 * What a stored policy's judge is bound to, or nothing bound where the table holds no target.
 *
 * @summary A policy naming a node the table lost reads as no judge rather than as a crash, because
 * the panel a person opens to repair a broken router is the one place that must still draw.
 */
export function judgeBoundIn(model: VirtualModel, policy: ConditionalPolicy): JudgeBinding {
  const node = model.routing.nodes[policy.judge];

  return node?.kind === 'target' ? node : NO_JUDGE;
}
