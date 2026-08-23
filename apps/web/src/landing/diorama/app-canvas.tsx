import { Asterisk, Repeat, RotateCw, Split } from 'lucide-react';

import type { CanvasNode } from './node-card';

import { CanvasMinimap } from './canvas-minimap';
import { CanvasWire } from './canvas-wire';
import { JudgeSatellite } from './judge-satellite';
import { NodeCard } from './node-card';
import { RouterCard } from './router-card';
import { ZoomToolbar } from './zoom-toolbar';

const WIRES = [
  { id: 'smart-in', d: 'M192 158 C232 158, 232 140, 272 140' },
  { id: 'fast-in', d: 'M192 158 C232 158, 232 370, 272 370' },
  { id: 'smart-out', d: 'M440 140 L520 140' },
  { id: 'fast-out', d: 'M440 370 L520 370' },
  { id: 'judge-zai', d: 'M688 140 C728 140, 728 48, 768 48' },
  { id: 'judge-deepseek', d: 'M688 140 L768 140' },
  { id: 'judge-kimi', d: 'M688 140 C728 140, 728 232, 768 232' },
  { id: 'rr-claude', d: 'M688 370 C728 370, 728 324, 768 324' },
  { id: 'rr-codex', d: 'M688 370 C728 370, 728 416, 768 416' },
];

const NODES: CanvasNode[] = [
  { x: 24, y: 120, kind: 'gateway', kicker: 'Gateway', title: 'coding', mono: ':8397' },
  {
    x: 272,
    y: 102,
    kind: 'virtual-model',
    kicker: 'Virtual model',
    title: 'smart',
    mono: 'smart',
    ports: 'both',
  },
  {
    x: 272,
    y: 332,
    kind: 'virtual-model',
    kicker: 'Virtual model',
    title: 'fast',
    mono: 'fast',
    ports: 'both',
  },
  {
    x: 768,
    y: 10,
    kind: 'subscription',
    kicker: 'Subscription',
    title: 'Z.ai',
    prose: 'GLM Coding Plan',
    mono: 'glm-5-air',
    ports: 'in',
  },
  {
    x: 768,
    y: 102,
    kind: 'api-key',
    kicker: 'API key',
    title: 'DeepSeek',
    prose: 'your own key',
    mono: 'deepseek-v4',
    ports: 'in',
  },
  {
    x: 768,
    y: 194,
    kind: 'subscription',
    kicker: 'Subscription',
    title: 'Kimi',
    prose: 'personal@example.com',
    mono: 'kimi-k3',
    ports: 'in',
  },
  {
    x: 768,
    y: 286,
    kind: 'subscription',
    kicker: 'Subscription',
    title: 'Claude',
    prose: 'work@example.com',
    mono: 'claude-fable-5',
    ports: 'in',
    glyph: Asterisk,
  },
  {
    x: 768,
    y: 378,
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
      <JudgeSatellite x={556} y={6} model="glm-5-air" />
      <RouterCard x={520} y={102} label="conditional" glyph={Split} />
      <RouterCard x={520} y={332} label="round-robin" glyph={Repeat} />

      <ZoomToolbar />
      <CanvasMinimap />
    </div>
  );
}
