import type { ConnectionLineComponentProps } from '@xyflow/react';
import type { ReactElement } from 'react';

import { getBezierPath } from '@xyflow/react';

import { strokeForRelease } from '../../lib/cable-standing';

type CableConnectionLineProps = Pick<
  ConnectionLineComponentProps,
  'connectionStatus' | 'fromPosition' | 'fromX' | 'fromY' | 'toPosition' | 'toX' | 'toY'
>;

/**
 * The cable a person is still holding, drawn from the port it left toward the pointer.
 *
 * @summary Hand it to the canvas as its connection line, so a drag in flight reads in the same
 * language as every stored binding rather than as the library's own default line. It answers what
 * the release would do: the live tint over a port that would take it, the broken tint over one that
 * would refuse it, and the pending tint over open canvas, where the release opens the picker.
 */
export function CableConnectionLine({
  connectionStatus,
  fromPosition,
  fromX,
  fromY,
  toPosition,
  toX,
  toY,
}: CableConnectionLineProps): ReactElement {
  const [drawn] = getBezierPath({
    sourceX: fromX,
    sourceY: fromY,
    sourcePosition: fromPosition,
    targetX: toX,
    targetY: toY,
    targetPosition: toPosition,
  });

  return <path className={`binding-cable ${strokeForRelease(connectionStatus)}`} d={drawn} />;
}
