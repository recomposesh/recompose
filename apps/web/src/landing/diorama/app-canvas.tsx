import { RotateCw } from 'lucide-react';

import type { CanvasNode } from './node-card';

import { CanvasMinimap } from './canvas-minimap';
import { CanvasWire } from './canvas-wire';
import { NodeCard } from './node-card';
import { RouterCard } from './router-card';
import { ZoomToolbar } from './zoom-toolbar';

const WIRES = [
  { id: 'smart-in', d: 'M208 164 C244 164, 244 92, 280 92' },
  { id: 'fast-in', d: 'M208 164 C244 164, 244 332, 280 332' },
  { id: 'smart-out', d: 'M464 92 L536 92' },
  { id: 'fast-out', d: 'M464 332 L536 332' },
  { id: 'rr-kimi', d: 'M720 332 C745 332, 745 172, 770 172' },
  { id: 'rr-codex', d: 'M720 332 C745 332, 745 372, 770 372' },
];

const NODES: CanvasNode[] = [
  { x: 24, y: 120, kind: 'gateway', kicker: 'Gateway', title: 'coding', mono: ':8397' },
  {
    x: 280,
    y: 48,
    kind: 'virtual-model',
    kicker: 'Virtual model',
    title: 'smart',
    mono: 'smart',
    ports: 'both',
  },
  {
    x: 280,
    y: 288,
    kind: 'virtual-model',
    kicker: 'Virtual model',
    title: 'fast',
    mono: 'fast',
    ports: 'both',
  },
  {
    x: 536,
    y: 48,
    kind: 'subscription',
    kicker: 'Subscription',
    title: 'Claude',
    prose: 'work@example.com',
    mono: 'claude-opus-5',
    ports: 'in',
  },
  {
    x: 770,
    y: 128,
    kind: 'subscription',
    kicker: 'Subscription',
    title: 'Kimi',
    prose: 'personal@example.com',
    mono: 'kimi-k3',
    ports: 'in',
  },
  {
    x: 770,
    y: 328,
    kind: 'subscription',
    kicker: 'Subscription',
    title: 'Codex',
    prose: 'work@example.com',
    mono: 'gpt-5.6-sol',
    ports: 'in',
    glyph: RotateCw,
  },
];

export function AppCanvas() {
  return (
    <div className="absolute inset-s-60 inset-e-0 top-13.5 bottom-9.5 overflow-hidden bg-win-canvas win-dots">
      <svg aria-hidden="true" viewBox="0 0 1000 592" className="absolute inset-0 size-full">
        {WIRES.map((wire) => (
          <CanvasWire key={wire.id} id={wire.id} d={wire.d} />
        ))}
      </svg>

      {NODES.map((node) => (
        <NodeCard key={`${node.x}-${node.y}`} node={node} />
      ))}
      <RouterCard x={536} y={288} />

      <ZoomToolbar />
      <CanvasMinimap />
    </div>
  );
}
