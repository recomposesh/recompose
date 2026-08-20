import type { GatewayConfig } from '@recompose/contracts';

import type { BranchWording as Wording } from '../../lib/conditional-policy';

import { useDefineVirtualModel } from '../../../../shared/api';
import { gatewayWritingBranch } from '../../lib/routing-edits-conditional';
import { leaveWording, useBranchWorded } from '../../lib/use-branch-wording';
import { BranchRuleSheet } from '../branch-rule-sheet/branch-rule-sheet';

type BranchWordingProps = {
  /** The stored gateway holding the routing, which a branch write rewrites as a whole. */
  gateway: GatewayConfig;
};

/**
 * The one editor a branch is worded in, opened from the cable that draws it or from its birth.
 *
 * @summary It stands on the canvas rather than inside the inspector, because a person who just
 * dropped a cable is looking at the cable: sending them to a panel to name what they made would put
 * the naming somewhere other than the gesture that asked for it. There is exactly one of it for the
 * same reason a label reaches storage trimmed: the label is the judge's vocabulary, so a second
 * surface that wrote labels would be a second place for that vocabulary to drift.
 */
export function BranchWording({ gateway }: BranchWordingProps) {
  const rewrite = useDefineVirtualModel();
  const worded = useBranchWorded();

  if (worded === undefined) {
    return null;
  }

  const save = (wording: Wording): void => {
    rewrite.mutate(
      gatewayWritingBranch(gateway, worded.modelId, worded.routerId, worded.child, wording),
    );
    leaveWording();
  };

  return (
    <BranchRuleSheet
      branch={{ label: worded.label, rule: worded.rule }}
      onOpenChange={leaveWording}
      onSave={save}
      open
      routesTo={worded.routesTo}
    />
  );
}
