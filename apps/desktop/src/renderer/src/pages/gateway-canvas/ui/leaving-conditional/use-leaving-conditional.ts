import { useState } from 'react';

import type { SpreadingMode } from '../../lib/routing-edits';

/** A switch out of conditional waiting on an answer, and the two answers it takes. */
export type LeavingConditionalStanding = {
  /** The mode the router would spread by, or nothing while nothing waits on an answer. */
  leavingFor: SpreadingMode | undefined;
  /** Holds a pressed spreading mode until the person has read what it costs. */
  askToLeave: (mode: SpreadingMode) => void;
  /** Puts the question away, leaving the router reading its requests. */
  onCancel: () => void;
  /** Writes the switch the person accepted, then puts the question away. */
  onConfirm: () => void;
};

/**
 * Holds a switch out of conditional until the person answers for it.
 *
 * @summary The press writes nothing on its own, because the wording a person composed branch by
 * branch has no second copy anywhere and the judge leaves with it: an undo they have to retype is
 * not an undo. Reach for it beside `LeavingConditional`, which is the question it stands.
 */
export function useLeavingConditional(
  spread: (mode: SpreadingMode) => void,
): LeavingConditionalStanding {
  const [leavingFor, setLeavingFor] = useState<SpreadingMode | undefined>(undefined);

  return {
    leavingFor,
    askToLeave: setLeavingFor,
    onCancel: () => {
      setLeavingFor(undefined);
    },
    onConfirm: () => {
      if (leavingFor !== undefined) {
        spread(leavingFor);
      }

      setLeavingFor(undefined);
    },
  };
}
