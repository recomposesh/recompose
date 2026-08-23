import { Split } from 'lucide-react';

import type { CanvasNode } from './node-card';

import { ClaudeWindow } from './claude-window';
import { NARRATION_CLAUDE_BRIGHT, NARRATION_CLAUDE_DIM } from './narration-copy';
import { NarrationLine } from './narration-line';
import { NodeCard } from './node-card';
import { RouterCard } from './router-card';

const COMPACT = 'h-20 w-38 px-2.75';

const SMART: CanvasNode = {
  kind: 'virtual-model',
  kicker: 'virtual model',
  title: 'smart',
  mono: 'smart',
  ports: 'none',
};

const ZAI: CanvasNode = {
  kind: 'subscription',
  kicker: 'subscription',
  title: 'Z.ai',
  prose: 'glm-5-air',
  ports: 'none',
};

const DEEPSEEK: CanvasNode = {
  kind: 'api-key',
  kicker: 'api key',
  title: 'DeepSeek',
  prose: 'deepseek-v4',
  ports: 'none',
};

const WIRES = [
  'M175 94 L175 116',
  'M141 196 C141 216, 84 212, 84 232',
  'M209 196 C209 216, 266 212, 266 232',
];

export function MobileDiorama() {
  return (
    <div className="bg-stage px-5 pt-16 pb-20 md:hidden">
      <div className="mx-auto flex max-w-90 flex-col gap-7">
        <p className="font-sans text-2xl leading-tight font-medium">
          <NarrationLine text={NARRATION_CLAUDE_BRIGHT} tone="text-stage-bright" />
          <NarrationLine text={NARRATION_CLAUDE_DIM} tone="text-stage-faint" />
        </p>

        <div className="w-full overflow-hidden rounded-xl border border-win-line bg-win-canvas font-system shadow-2xl">
          <div className="flex h-8 items-center gap-1.5 bg-win-chrome px-3">
            <span className="size-2.25 rounded-full bg-traffic-close" />
            <span className="size-2.25 rounded-full bg-traffic-hold" />
            <span className="size-2.25 rounded-full bg-traffic-go" />
            <span className="ms-1.5 text-annotation font-medium text-win-ink2">recompose</span>
          </div>

          <div className="relative h-82 w-full win-dots">
            <svg
              aria-hidden="true"
              viewBox="0 0 350 328"
              preserveAspectRatio="none"
              className="absolute inset-0 size-full"
            >
              {WIRES.map((d) => (
                <path key={d} d={d} strokeWidth={2.5} fill="none" className="stroke-live" />
              ))}
            </svg>

            <NodeCard node={SMART} className={`${COMPACT} inset-s-1/2 top-3.5 -translate-x-1/2`} />
            <RouterCard
              label="conditional"
              glyph={Split}
              ports={false}
              className={`${COMPACT} inset-s-1/2 top-29 -translate-x-1/2`}
            />
            <NodeCard node={ZAI} className={`${COMPACT} inset-s-2 top-58`} />
            <NodeCard node={DEEPSEEK} className={`${COMPACT} inset-e-2 top-58`} />
          </div>
        </div>

        <ClaudeWindow className="relative h-77.5 w-full max-w-90" />
      </div>
    </div>
  );
}
