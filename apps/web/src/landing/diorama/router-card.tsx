import { GitFork } from 'lucide-react';

import { CHAMFER_INNER, CHAMFER_OUTER } from '../chamfer';
import { Port } from './port';

const PORT_SIDES = ['left', 'right'] as const;

function frameSize(className: string | undefined) {
  return className ?? 'h-22 w-46';
}

function frameAnchor(x: number | undefined, y: number | undefined, className: string | undefined) {
  return className === undefined ? { left: x, top: y } : undefined;
}

export function RouterCard({
  x,
  y,
  label = 'round-robin',
  className,
  ports = true,
}: {
  x?: number;
  y?: number;
  label?: string;
  className?: string;
  ports?: boolean;
}) {
  return (
    <div className={`absolute ${frameSize(className)}`} style={frameAnchor(x, y, className)}>
      <svg
        aria-hidden="true"
        viewBox="0 0 184 88"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full"
      >
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
        <span className="text-control leading-tight font-medium text-win-ink">{label}</span>
        <span className="font-mono text-annotation leading-tight text-win-ink2">{label}</span>
      </div>
      {(ports ? PORT_SIDES : []).map((side) => (
        <Port key={side} tone="bg-router" side={side} />
      ))}
    </div>
  );
}
