import type { ReactNode } from 'react';

import type { RouterMode } from '../../lib/routing-edits';
import type { LeavingConditionalStanding } from '../leaving-conditional/use-leaving-conditional';

import { LeavingConditional } from '../leaving-conditional/leaving-conditional';
import { ModeRows } from '../mode-rows/mode-rows';
import { sectionHeading } from '../subject-shell/subject-shell';

const A_SWITCH_WOULD_NEED =
  'Conditional needs a judge and an else branch. Compose one when you add the virtual model.';

export type ModeSectionProps = {
  /** How many children the router holds, which is what decides whether it can branch at all. */
  childCount: number;
  /** The mode the rows stand chosen on, which is the stored one until a switch opens. */
  mode: RouterMode;
  /** Receives the mode the person landed on. */
  onChangeValue: (mode: RouterMode) => void;
  /** The switch out of conditional waiting on an answer, which the question here stands. */
  leaving: LeavingConditionalStanding;
  /** What the router answers to, which the question asks about by name. */
  routerName: string;
};

/**
 * Why this router cannot be switched to conditional, or nothing where it can.
 *
 * @summary A router holding no child has nothing to branch on: the mode's stored policy names an
 * else child among the children, so a switch would have to invent a binding nobody made. A router
 * that already holds children can be switched, which is what the definition the row opens is for.
 */
function switchReasons(childCount: number): Partial<Record<RouterMode, string>> {
  return childCount === 0 ? { conditional: A_SWITCH_WOULD_NEED } : {};
}

/**
 * How a router spreads, offered as rows that each carry the cost of standing in that mode.
 *
 * @summary The sentence rides inside each row rather than under the control, so a person reads
 * what a mode costs before choosing it rather than after landing on the one they already picked.
 * Three modes also outgrow a strip in the narrowest panel, where the longest name wraps. The
 * question a switch out of conditional raises stands here too, beside the very rows that raise it,
 * because what that switch takes is the reason a person would keep the mode they have.
 */
export function ModeSection(props: ModeSectionProps): ReactNode {
  const { leavingFor, onCancel, onConfirm } = props.leaving;

  return (
    <>
      {sectionHeading('Mode')}
      <ModeRows
        inertReasons={switchReasons(props.childCount)}
        onChangeValue={props.onChangeValue}
        value={props.mode}
      />
      <LeavingConditional
        leavingFor={leavingFor}
        onCancel={onCancel}
        onConfirm={onConfirm}
        routerName={props.routerName}
      />
    </>
  );
}
