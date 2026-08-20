import type { Node, NodeProps } from '@xyflow/react';
import type { ReactElement } from 'react';

import { Handle, Position, ReactFlow } from '@xyflow/react';
import { expect, waitFor } from 'storybook/test';

import type { CableFailure, CableStanding } from '../lib/node-graph';
import type { BranchSeat } from '../lib/route-graph';

import { BindingCable } from '../ui/binding-cable/binding-cable';

/** A failure a cable carries in a story, which every scenario reads the same sentence off. */
export const REFUSED: CableFailure = {
  status: 502,
  detail: 'The gateway could not reach the target.',
};

function Card({ data }: NodeProps) {
  return (
    <span className="flex size-full items-center justify-center rounded-canvas-card border border-line-subtle bg-surface-card text-card-title text-ink">
      <Handle position={Position.Left} type="target" />
      {String(data['name'])}
      <Handle position={Position.Right} type="source" />
    </span>
  );
}

const cards = { card: Card };
const cables = { binding: BindingCable };

const seats: Node[] = [
  {
    id: 'model:fast',
    type: 'card',
    position: { x: 30, y: 110 },
    data: { name: 'fast' },
    width: 180,
    height: 76,
  },
  {
    id: 'target:work',
    type: 'card',
    position: { x: 390, y: 190 },
    data: { name: 'work key' },
    width: 180,
    height: 76,
  },
];

/** The seat the meta places the cable ends at, which every story renders against. */
export const cableSeats = {
  id: 'cable:fast',
  source: 'model:fast',
  sourcePosition: Position.Right,
  sourceX: 210,
  sourceY: 148,
  target: 'target:work',
  targetPosition: Position.Left,
  targetX: 390,
  targetY: 228,
};

function cardsWiredBy(
  carried: Record<string, unknown> | undefined,
  id = 'cable:fast',
  chosenCard?: string,
  liftsChosenCables = false,
): ReactElement {
  return (
    <div className="h-96 w-160 bg-surface-content dot-grid">
      <ReactFlow
        defaultEdges={[
          {
            id,
            type: 'binding',
            source: 'model:fast',
            target: 'target:work',
            ...(carried === undefined ? {} : { data: carried }),
          },
        ]}
        defaultNodes={seats.map((seat) => ({ ...seat, selected: seat.id === chosenCard }))}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        edgeTypes={cables}
        elevateEdgesOnSelect={liftsChosenCables}
        nodeTypes={cards}
        nodesDraggable={false}
      />
    </div>
  );
}

/**
 * One cable drawn between two cards on a canvas, standing however a scenario says.
 *
 * @summary Reach for it in any story about how a binding reads, so every scenario draws the same
 * two cards and differs only in what the cable between them carries. The flow holds its own
 * selection, because the story is about how a cable paints rather than about who writes topology.
 */
export function cabledFlow(standing: CableStanding, failure?: CableFailure): ReactElement {
  return cardsWiredBy({ standing, failure });
}

/**
 * The same two cards with a cable a conditional router decides, carrying the branch it draws.
 *
 * @summary Reach for it in any story about the furniture a judged cable stands, so the rule pill
 * and the failure chip are measured against one another on the very path they both ride.
 */
export function judgedFlow(
  seat: BranchSeat,
  standing: CableStanding = 'resting',
  failure?: CableFailure,
): ReactElement {
  return cardsWiredBy({ standing, failure, branch: seat });
}

/**
 * The same judged cable while the card at its far end stands selected.
 *
 * @summary Reach for it to ask whether a cable's furniture still rides the line once a neighbor is
 * picked. Selection is the state that moves a card's own paint, so it is the state where furniture
 * anchored off anything but the drawn path drifts away from it.
 */
export function judgedFlowBesideAChosenCard(seat: BranchSeat): ReactElement {
  return cardsWiredBy({ standing: 'resting', branch: seat }, 'cable:fast', 'target:work');
}

/**
 * The same judged cable on a pane that lifts a chosen card's cables, the way the canvas does.
 *
 * @summary The page sets `elevateEdgesOnSelect`, which raises a chosen card's cables into a layer
 * above the one a cable's furniture rides in. That lift is the whole of what puts a stroke across
 * a pill, so a pane without it cannot be asked whether the label still reads.
 */
export function judgedFlowUnderALiftedCable(
  seat: BranchSeat,
  standing: CableStanding = 'resting',
  failure?: CableFailure,
): ReactElement {
  return cardsWiredBy({ standing, failure, branch: seat }, 'cable:fast', 'target:work', true);
}

/**
 * The same two cards joined by the dotted tie a router hangs its judge from.
 *
 * @summary Reach for it to ask how a tie draws beside a binding, since the whole claim the tie
 * makes is that it does not look like one.
 */
export function tiedFlow(): ReactElement {
  return cardsWiredBy({ standing: 'resting' }, 'tie:fast:advisor');
}

/** The same tie while the router it leaves is waiting on the judge at its other end. */
export function tiedFlowWhileJudging(): ReactElement {
  return cardsWiredBy({ standing: 'resting', judging: true }, 'tie:fast:advisor');
}

/**
 * The same two cards with a cable handed nothing to carry at all.
 *
 * @summary Reach for it to ask what a binding draws before anything has been said about it. A
 * canvas edge that leaned on data it was not given would take the whole pane down with it, and a
 * pane that fell over would lose the composition rather than one cable's tint.
 */
export function barelyCabledFlow(): ReactElement {
  return cardsWiredBy(undefined);
}

/** The color the running scheme paints, so one assertion covers light and dark alike. */
export function forScheme(light: string, dark: string): string {
  return document.documentElement.classList.contains('scheme-dark') ? dark : light;
}

/** Every path the canvas has drawn for its cables, in paint order. */
export function drawnCables(canvasElement: HTMLElement): SVGPathElement[] {
  return [...canvasElement.querySelectorAll<SVGPathElement>('.react-flow__edge > path')];
}

/** The pulse traveling over a live cable, which rides above the line rather than breaking it. */
export function pulseIn(canvasElement: HTMLElement): SVGPathElement {
  const traveling = canvasElement.querySelector<SVGPathElement>('.cable-pulse');

  if (traveling === null) {
    throw new Error('no pulse travels this cable');
  }

  return traveling;
}

/** The handles standing at a selected cable's ends. */
export function grabEnds(canvasElement: HTMLElement): Element[] {
  return [...canvasElement.querySelectorAll('.react-flow__edge foreignObject > *')];
}

/** Holds until the canvas has drawn its cables, then hands them over. */
export async function cablesDrawn(canvasElement: HTMLElement): Promise<SVGPathElement[]> {
  await waitFor(async () => expect(drawnCables(canvasElement).length).toBeGreaterThan(0));

  return drawnCables(canvasElement);
}
