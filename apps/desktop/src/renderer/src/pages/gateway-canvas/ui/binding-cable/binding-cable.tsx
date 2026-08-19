import type { EdgeProps } from '@xyflow/react';
import type { ReactElement, ReactNode } from 'react';

import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react';

import type { CableFailure } from '../../lib/node-graph';
import type { BranchSeat } from '../../lib/route-graph';

import { wordingIn } from '../../lib/cable-standing';
import {
  branchIn,
  CABLE_GRAB_SPAN,
  drawnAsATie,
  failureIn,
  pointAlongCable,
  pulseForStanding,
  BRANCH_PILL_ANCHOR,
  strokeForStanding,
  TIE_DASH,
  tintForStanding,
} from '../../lib/cable-standing';
import { wordBranch } from '../../lib/use-branch-wording';
import { CableBranchPill } from '../cable-branch-pill/cable-branch-pill';
import { CableFailureChip } from '../cable-failure-chip/cable-failure-chip';

function grabEnd(x: number, y: number, tint: string): ReactElement {
  return (
    <foreignObject
      height={CABLE_GRAB_SPAN}
      width={CABLE_GRAB_SPAN}
      x={x - CABLE_GRAB_SPAN / 2}
      y={y - CABLE_GRAB_SPAN / 2}
    >
      <span
        aria-hidden
        className="pointer-events-auto flex size-hit-target cursor-grab items-center justify-center"
      >
        <span className={`port-dot ${tint}`} data-bound />
      </span>
    </foreignObject>
  );
}

function grabEnds(cable: EdgeProps, tint: string): ReactNode {
  return (
    <>
      {grabEnd(cable.sourceX, cable.sourceY, tint)}
      {grabEnd(cable.targetX, cable.targetY, tint)}
    </>
  );
}

function cableClasses(carried: unknown, chosen: boolean, edgeId: string): string {
  const width = chosen ? 'binding-cable-selected' : 'binding-cable';
  const stroke = drawnAsATie(edgeId) ? 'stroke-router' : strokeForStanding(carried);

  return `${width} ${stroke}`;
}

function tieDashing(edgeId: string): { strokeDasharray: string } | undefined {
  return drawnAsATie(edgeId) ? { strokeDasharray: TIE_DASH } : undefined;
}

function halo(drawn: string, stroke: string): ReactNode {
  return (
    <>
      <path className={`cable-halo-bloom ${stroke}`} d={drawn} />
      <path className={`cable-halo-ring ${stroke}`} d={drawn} />
    </>
  );
}

function pulse(drawn: string, stroke: string, traveling: string): ReactNode {
  return traveling === '' ? null : (
    <path className={`${traveling} ${stroke}`} d={drawn} pathLength={1} />
  );
}

/**
 * One piece of furniture standing at a point on the cable, in the flow's own coordinates.
 *
 * @summary Everything a cable carries rides the same way, so the anchoring, the pointer claim, and
 * the lift a reading takes when it opens are written once rather than once per chip.
 */
function riding(at: { x: number; y: number }, furniture: ReactNode): ReactNode {
  return (
    <EdgeLabelRenderer>
      <div
        className="pointer-events-auto absolute has-aria-expanded:z-cable-reading"
        onClick={(event) => {
          event.stopPropagation();
        }}
        role="presentation"
        style={{
          transform: `translate(-50%, -50%) translate(${String(at.x)}px, ${String(at.y)}px)`,
        }}
      >
        {furniture}
      </div>
    </EdgeLabelRenderer>
  );
}

function lastError(failure: CableFailure | undefined, at: { x: number; y: number }): ReactNode {
  if (failure === undefined) {
    return null;
  }

  return riding(at, <CableFailureChip detail={failure.detail} status={failure.status} />);
}

function branchDrawn(
  held: Readonly<Record<string, unknown>>,
  drawn: string,
  midpoint: { x: number; y: number },
): ReactNode {
  const seat = branchIn(held['branch']);
  const wording = wordingIn(held['wording']);

  if (seat === undefined) {
    return null;
  }

  const rides = pointAlongCable(drawn, BRANCH_PILL_ANCHOR) ?? midpoint;
  const word = (): void => {
    if (wording !== undefined) {
      wordBranch({ ...wording, ...wordsAlready(seat) });
    }
  };

  return riding(rides, <CableBranchPill onWord={word} seat={seat} />);
}

function wordsAlready(seat: BranchSeat): { label: string; rule: string } {
  return seat.kind === 'rule' ? { label: seat.label, rule: seat.rule } : { label: '', rule: '' };
}

/**
 * A binding drawn between two cards, painting the standing it carries.
 *
 * @summary Register it as the canvas edge type, so every binding reads at a glance: at rest, live,
 * served, failed, broken where its account left, or one of the two the overlay draws. A live
 * binding sends a pulse down its line, and a failed one stands its last error on the path, for the
 * person who wants the reason rather than the color. A cable a judge decides carries its branch
 * earlier along the same path, so the rule and the error each keep a place of their own rather than
 * stacking on the midpoint. Every line carrying a request stays whole either way, because a
 * break in the drawing would claim a break in the wire, so the pulse is the only thing that moves.
 * The one line that does break is the tie to a judge, which carries no request at all and says so.
 * A selected cable widens and takes the halo the selected node card wears, a crisp ring inside a
 * soft bloom, so selection reads the same whichever a person pressed, and the halo never pulses,
 * because a bloom in motion says nothing the cable inside it has not said already. Both ends then
 * offer a handle in the cable's own tint, wide enough to take the drag that rebinds it.
 */
export function BindingCable(cable: EdgeProps): ReactElement {
  const held = cable.data ?? {};
  const [drawn, labelX, labelY] = getBezierPath({
    sourceX: cable.sourceX,
    sourceY: cable.sourceY,
    sourcePosition: cable.sourcePosition,
    targetX: cable.targetX,
    targetY: cable.targetY,
    targetPosition: cable.targetPosition,
  });
  const carried = held['standing'];
  const chosen = cable.selected === true;
  const midpoint = { x: labelX, y: labelY };

  return (
    <>
      {chosen ? halo(drawn, strokeForStanding(carried)) : null}
      <BaseEdge
        className={cableClasses(carried, chosen, cable.id)}
        interactionWidth={cable.interactionWidth ?? CABLE_GRAB_SPAN}
        path={drawn}
        style={tieDashing(cable.id)}
      />
      {pulse(drawn, strokeForStanding(carried), pulseForStanding(carried))}
      {chosen ? grabEnds(cable, tintForStanding(carried)) : null}
      {branchDrawn(held, drawn, midpoint)}
      {lastError(failureIn(held['failure']), midpoint)}
    </>
  );
}
