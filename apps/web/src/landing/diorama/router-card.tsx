import { GitFork } from 'lucide-react';

import { CHAMFER_INNER, CHAMFER_OUTER } from '../chamfer';
import { Port } from './port';

export function RouterCard({ x, y }: { x: number; y: number }) {
  return (
    <div className="absolute h-22 w-46" style={{ left: x, top: y }}>
      <svg aria-hidden="true" viewBox="0 0 184 88" className="absolute inset-0 size-full">
        <path d={CHAMFER_OUTER} strokeWidth={1.5} className="fill-win-card stroke-router" />
        <path d={CHAMFER_INNER} strokeWidth={1.5} fill="none" className="stroke-router" />
      </svg>
      <div className="relative flex h-full flex-col justify-center gap-0.5 px-5">
        <span className="flex items-center gap-1.5">
          <span className="flex size-4.25 items-center justify-center rounded bg-router/12">
            <GitFork className="size-2.75 text-router" />
          </span>
          <span className="text-caption font-medium tracking-wider text-router uppercase">
            Router
          </span>
        </span>
        <span className="text-control leading-tight font-medium text-win-ink">round-robin</span>
        <span className="font-mono text-annotation leading-tight text-win-ink2">round-robin</span>
      </div>
      <Port tone="bg-router" side="left" />
      <Port tone="bg-router" side="right" />
    </div>
  );
}
