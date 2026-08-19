import { X } from 'lucide-react';

export function FailoverDiagram() {
  return (
    <svg aria-hidden="true" viewBox="0 0 596 120" className="size-full">
      <rect x={180} y={24} width={200} height={10} rx={3} className="fill-down/40" />
      <rect x={180} y={55} width={200} height={10} rx={3} className="fill-live" />
      <rect x={180} y={86} width={200} height={10} rx={3} className="fill-stage-line" />
      <path
        d="M414 29 C414 52, 400 60, 388 60"
        strokeWidth={2}
        className="stroke-live"
        fill="none"
      />
      <foreignObject x={386} y={20} width={16} height={16}>
        <X className="size-3.5 text-down" />
      </foreignObject>
    </svg>
  );
}
