import { CornerDownRight, Repeat, X } from 'lucide-react';

import { ModeCard } from './mode-card';

export function RouterModes() {
  return (
    <div className="mt-6 grid gap-6 sm:grid-cols-2">
      <ModeCard
        title="failover"
        icon={<CornerDownRight className="size-4 text-router" />}
        body="targets in order. the first one serves until it errors or hits a limit, then the next takes the same request."
      >
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
      </ModeCard>
      <ModeCard
        title="round-robin"
        icon={<Repeat className="size-4 text-router" />}
        body="a pool of equals. each request goes to the next account in turn, so no single subscription burns out."
      >
        <svg aria-hidden="true" viewBox="0 0 596 120" className="size-full">
          <circle cx={298} cy={60} r={38} className="stroke-wire" strokeWidth={2} fill="none" />
          <circle cx={298} cy={22} r={5} className="fill-gateway" />
          <circle cx={265} cy={81} r={5} className="fill-virtual-model" />
          <circle cx={331} cy={81} r={5} className="fill-subscription" />
          <path
            d="M322 42 L332 30 M332 30 l-6 0 M332 30 l1 7"
            strokeWidth={2}
            className="stroke-live"
            fill="none"
          />
        </svg>
      </ModeCard>
    </div>
  );
}
