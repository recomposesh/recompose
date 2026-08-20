import { nameOfRouterMode } from '@recompose/contracts';

import type { SpreadingMode } from '../../lib/routing-edits';

import { ConsequenceDialog } from '../../../../shared/ui';

/**
 * What a router gives up by spreading requests instead of reading them.
 *
 * @summary The wording and the judge are the whole of what a conditional policy holds beyond the
 * mode, and a switch takes both: the judge because nothing would reference it afterwards, the
 * labels and rules because there would be no judge left to read them. The children are the one
 * thing that survives, which is what a person weighing the switch most needs to hear.
 */
const WHAT_THE_SWITCH_COSTS =
  'The branch labels and rules go, and the judge goes with them. The children stay, in the order they stand now.';

type LeavingConditionalProps = {
  /** Which mode the router would spread by, or nothing while no switch waits on an answer. */
  leavingFor: SpreadingMode | undefined;
  /** What the router answers to, which is the name the question asks about. */
  routerName: string;
  /** Called when the person keeps the router reading its requests. */
  onCancel: () => void;
  /** Called once the person accepts what the switch takes. */
  onConfirm: () => void;
};

/**
 * The question standing between a conditional router and the mode a person just pressed.
 *
 * @summary Reach for it wherever the mode rows offer a spreading mode to a router a judge decides.
 * The press writes nothing on its own, because the wording a person composed branch by branch has
 * no second copy anywhere: an undo they have to retype is not an undo.
 */
export function LeavingConditional({
  leavingFor,
  routerName,
  onCancel,
  onConfirm,
}: LeavingConditionalProps) {
  if (leavingFor === undefined) {
    return null;
  }

  return (
    <ConsequenceDialog
      confirmLabel="Switch anyway"
      heading={`Switch the router "${routerName}" to ${nameOfRouterMode(leavingFor)}?`}
      onCancel={onCancel}
      onConfirm={onConfirm}
      open
    >
      {WHAT_THE_SWITCH_COSTS}
    </ConsequenceDialog>
  );
}
