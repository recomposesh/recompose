import type { ConditionalSwitch } from '../../lib/conditional-draft';
import type { RouterMode, SpreadingMode } from '../../lib/routing-edits';

import { switchOpenedOn } from '../../lib/conditional-draft';

/** Everything a mode press needs to know, and every way it can answer. */
export type ModePicking = {
  /** The children the router holds, which a conditional definition opens over. */
  children: readonly string[];
  /** Whether the router this pick lands on is one a judge already decides the branches of. */
  branching: boolean;
  /** Receives the conditional definition a person is now walking, or nothing where they left it. */
  onHeld: (held: ConditionalSwitch | undefined) => void;
  /** Receives a spreading mode that costs nothing to take, which stores straight away. */
  onSpread: (mode: SpreadingMode) => void;
  /** Receives a spreading mode that would cost the wording, which asks before it takes anything. */
  onAsk: (mode: SpreadingMode) => void;
};

/**
 * What pressing one mode row does, which is never the same thing twice.
 *
 * @summary Conditional opens the definition the switch is walked through rather than storing
 * anything, because the mode's policy names a judge and an else child nobody has chosen yet. A
 * spreading mode stores straight away, unless the router it leaves is one a judge decides: that
 * switch takes the wording and the judge with it, so it asks before it takes anything.
 */
export function modePicking(stand: ModePicking): (next: RouterMode) => void {
  return (next) => {
    stand.onHeld(next === 'conditional' ? switchOpenedOn(stand.children) : undefined);

    if (next === 'conditional') {
      return;
    }

    if (stand.branching) {
      stand.onAsk(next);

      return;
    }

    stand.onSpread(next);
  };
}
