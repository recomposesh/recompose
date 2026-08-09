import type { EdgeProps } from '@xyflow/react';
import type { ReactElement } from 'react';

import { BaseEdge, getBezierPath } from '@xyflow/react';

import { CABLE_GRAB_SPAN, strokeForStanding, tintForStanding } from '../../lib/cable-standing';

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

/**
 * A binding drawn between two cards, painting the standing it carries.
 *
 * @summary Register it as the canvas edge type, so every binding reads at a glance: at rest, live,
 * broken where its account left, or one of the two the overlay draws. A selected cable widens and
 * takes the halo the selected node card wears, a crisp ring inside a soft bloom, so selection reads
 * the same whichever a person pressed. Both ends then offer a handle in the cable's own tint, wide
 * enough to take the drag that rebinds it.
 */
export function BindingCable({
  data,
  interactionWidth,
  selected,
  sourcePosition,
  sourceX,
  sourceY,
  targetPosition,
  targetX,
  targetY,
}: EdgeProps): ReactElement {
  const [drawn] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const carried = data?.['standing'];
  const standing = strokeForStanding(carried);
  const grabBand = interactionWidth ?? CABLE_GRAB_SPAN;

  if (selected !== true) {
    return (
      <BaseEdge className={`binding-cable ${standing}`} interactionWidth={grabBand} path={drawn} />
    );
  }

  const tint = tintForStanding(carried);

  return (
    <>
      <path className={`cable-halo-bloom ${standing}`} d={drawn} />
      <path className={`cable-halo-ring ${standing}`} d={drawn} />
      <BaseEdge
        className={`binding-cable-selected ${standing}`}
        interactionWidth={grabBand}
        path={drawn}
      />
      {grabEnd(sourceX, sourceY, tint)}
      {grabEnd(targetX, targetY, tint)}
    </>
  );
}
