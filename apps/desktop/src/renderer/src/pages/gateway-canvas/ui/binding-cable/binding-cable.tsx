import type { EdgeProps } from '@xyflow/react';
import type { ReactElement, ReactNode } from 'react';

import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react';

import type { CableFailure } from '../../lib/node-graph';

import {
  CABLE_GRAB_SPAN,
  failureIn,
  pulseForStanding,
  strokeForStanding,
  tintForStanding,
} from '../../lib/cable-standing';
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

function cableClasses(carried: unknown, chosen: boolean): string {
  const width = chosen ? 'binding-cable-selected' : 'binding-cable';

  return `${width} ${strokeForStanding(carried)}`;
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

function lastError(failure: CableFailure | undefined, x: number, y: number): ReactNode {
  if (failure === undefined) {
    return null;
  }

  return (
    <EdgeLabelRenderer>
      <div
        className="pointer-events-auto absolute has-aria-expanded:z-cable-reading"
        onClick={(event) => {
          event.stopPropagation();
        }}
        role="presentation"
        style={{ transform: `translate(-50%, -50%) translate(${String(x)}px, ${String(y)}px)` }}
      >
        <CableFailureChip detail={failure.detail} status={failure.status} />
      </div>
    </EdgeLabelRenderer>
  );
}

/**
 * A binding drawn between two cards, painting the standing it carries.
 *
 * @summary Register it as the canvas edge type, so every binding reads at a glance: at rest, live,
 * served, failed, broken where its account left, or one of the two the overlay draws. A live
 * binding sends a pulse down its line, and a failed one stands its last error on the path, for the
 * person who wants the reason rather than the color. Every line stays whole either way, because a
 * break in the drawing would claim a break in the wire, so the pulse is the only thing that moves.
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

  return (
    <>
      {chosen ? halo(drawn, strokeForStanding(carried)) : null}
      <BaseEdge
        className={cableClasses(carried, chosen)}
        interactionWidth={cable.interactionWidth ?? CABLE_GRAB_SPAN}
        path={drawn}
      />
      {pulse(drawn, strokeForStanding(carried), pulseForStanding(carried))}
      {chosen ? grabEnds(cable, tintForStanding(carried)) : null}
      {lastError(failureIn(held['failure']), labelX, labelY)}
    </>
  );
}
