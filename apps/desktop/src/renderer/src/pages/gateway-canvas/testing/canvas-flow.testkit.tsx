import type { Decorator } from '@storybook/react-vite';
import type { Node, NodeProps, NodeTypes, Viewport } from '@xyflow/react';
import type { ReactElement } from 'react';

import { ReactFlow } from '@xyflow/react';

import type { XY } from '../lib/canvas-positions';
import type { CanvasNodeKind } from '../lib/node-graph';

function Card({ data }: NodeProps) {
  return (
    <span className="flex size-full items-center justify-center rounded-canvas-card border border-line-subtle bg-surface-card text-card-title">
      {String(data['name'])}
    </span>
  );
}

const cards = {
  gateway: Card,
  'virtual-model': Card,
  target: Card,
  'draft-model': Card,
  'ghost-target': Card,
  'pending-target': Card,
} satisfies Record<CanvasNodeKind, typeof Card>;

const cardSize = { width: 158, height: 78 };

/**
 * One card standing at a fixed seat, sized as every canvas node declares itself.
 *
 * @summary Reach for it in a canvas story that needs something on the pane to measure, so the seats
 * stay pinned and no story depends on a layout pass it never asked for.
 */
export function seat(id: string, kind: CanvasNodeKind, name: string, at: XY): Node {
  return { id, type: kind, position: at, data: { name }, width: 180, height: 76 };
}

/**
 * Whichever of two painted values the scheme the page is wearing actually draws.
 *
 * @summary Reach for it in any canvas story asserting a color, because every token on this surface
 * answers `light-dark()` and a story that names one value passes in one scheme and lies in the other.
 */
export function inScheme(light: string, dark: string): string {
  return document.documentElement.classList.contains('scheme-dark') ? dark : light;
}

/**
 * Presses a port and pulls away from it, which is how a cable starts on a real canvas.
 *
 * @operation The library starts a connection only once a press has traveled past its own
 * threshold, so the press alone proves nothing. A stray press left over from an earlier story is
 * let go first, because the library holds one connection at a time and a held one refuses the next.
 */
export function draggedFromPort(port: Element | null): void {
  const box = port?.getBoundingClientRect() ?? new DOMRect();

  document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  port?.dispatchEvent(
    new MouseEvent('mousedown', { bubbles: true, clientX: box.x + 12, clientY: box.y + 12 }),
  );
  document.dispatchEvent(
    new MouseEvent('mousemove', { bubbles: true, clientX: box.x + 90, clientY: box.y + 60 }),
  );
}

const mounted = new Map<CanvasNodeKind, NodeTypes>();

function typesFor(kind: CanvasNodeKind, card: NodeTypes[string]): NodeTypes {
  const held = mounted.get(kind);

  if (held?.[kind] === card) {
    return held;
  }

  const minted = { [kind]: card };

  mounted.set(kind, minted);

  return minted;
}

/**
 * One card standing alone on a pinned pane, mounted as the node type it ships as.
 *
 * @summary Reach for it in a node component's story or browser test, because a card's ports read
 * the flow around them and a card rendered bare stands in no flow at all. The seat never moves and
 * the viewport never animates, so a measurement reads the same on every run, and the type map is
 * held rather than minted per render, which is the only shape the library accepts without complaint.
 */
export function cardOnCanvas(
  kind: CanvasNodeKind,
  card: NodeTypes[string],
  data: Record<string, unknown>,
  selected: boolean,
): ReactElement {
  return (
    <div className="h-96 w-160 bg-surface-content dot-grid">
      <ReactFlow
        defaultViewport={{ x: 60, y: 60, zoom: 1 }}
        nodeTypes={typesFor(kind, card)}
        nodes={[{ id: 'card', type: kind, position: { x: 0, y: 0 }, data, selected, ...cardSize }]}
        nodesDraggable={false}
        nodesFocusable={false}
      />
    </div>
  );
}

/**
 * A pane holding the canvas furniture, with pinned seats and a viewport that never animates.
 *
 * @summary Reach for it in any story of a component the flow provides context to. The cards stand
 * where the story put them, so a measurement reads the same on every run.
 */
export function inCanvasFlow(seats: readonly Node[], viewport: Viewport): Decorator {
  return function CanvasPane(Story) {
    return (
      <div className="h-96 w-160 bg-surface-content dot-grid">
        <ReactFlow
          defaultViewport={viewport}
          nodeTypes={cards}
          nodes={[...seats]}
          nodesDraggable={false}
          nodesFocusable={false}
        >
          <Story />
        </ReactFlow>
      </div>
    );
  };
}
