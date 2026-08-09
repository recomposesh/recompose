import { Position } from '@xyflow/react';
import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { paintedStyle } from '../../../../shared/testing';
import { CableConnectionLine } from './cable-connection-line';

const releases: readonly ('invalid' | 'valid' | null)[] = [null, 'valid', 'invalid'];

function CablesInFlight() {
  return (
    <svg
      aria-label="Cables in flight"
      className="h-40 w-160 bg-surface-content dot-grid"
      role="img"
    >
      {releases.map((status, place) => (
        <CableConnectionLine
          connectionStatus={status}
          fromPosition={Position.Right}
          fromX={40}
          fromY={30 + place * 40}
          key={String(status)}
          toPosition={Position.Left}
          toX={560}
          toY={50 + place * 40}
        />
      ))}
    </svg>
  );
}

const meta = preview.meta({
  component: CableConnectionLine,
  args: {
    connectionStatus: null,
    fromPosition: Position.Right,
    fromX: 40,
    fromY: 30,
    toPosition: Position.Left,
    toX: 560,
    toY: 50,
  },
  render: () => <CablesInFlight />,
});

function forScheme(light: string, dark: string): string {
  return document.documentElement.classList.contains('scheme-dark') ? dark : light;
}

/** The cable in hand, over open canvas, over a port that would take it, and over one that refuses. */
export const Basic = meta.story({});

/** The cable a person is still holding answers what letting go of it right there would do. */
export const TheCableInFlightAnswersTheRelease = meta.story({
  play: async ({ canvasElement }) => {
    const [awaiting, taking, refusing] = [
      ...canvasElement.querySelectorAll<SVGPathElement>('svg > path'),
    ];

    await expect(paintedStyle(awaiting).stroke).toBe(
      forScheme('rgb(255, 149, 0)', 'rgb(255, 159, 10)'),
    );
    await expect(paintedStyle(taking).stroke).toBe(
      forScheme('rgb(40, 205, 65)', 'rgb(50, 215, 75)'),
    );
    await expect(paintedStyle(refusing).stroke).toBe(
      forScheme('rgb(215, 0, 21)', 'rgb(255, 69, 58)'),
    );
  },
});

/** The cable in flight takes the same stroke as a stored one, so nothing reads as a second kind. */
export const TheCableInFlightTakesTheCanvasStroke = meta.story({
  play: async ({ canvasElement }) => {
    const [awaiting] = [...canvasElement.querySelectorAll<SVGPathElement>('svg > path')];

    await expect(paintedStyle(awaiting).strokeWidth).toBe('1.8px');
    await expect(paintedStyle(awaiting).fill).toBe('none');
  },
});
