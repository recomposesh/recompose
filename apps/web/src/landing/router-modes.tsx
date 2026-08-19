import { CornerDownRight, Repeat, Split } from 'lucide-react';

import { ConditionalDiagram } from './conditional-diagram';
import { FailoverDiagram } from './failover-diagram';
import { ModeCard } from './mode-card';
import { RoundRobinDiagram } from './round-robin-diagram';

export function RouterModes() {
  return (
    <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <ModeCard
        title="failover"
        icon={<CornerDownRight className="size-4 text-router" />}
        body="targets in order. the first one serves until it errors or hits a limit, then the next takes the same request."
      >
        <FailoverDiagram />
      </ModeCard>
      <ModeCard
        title="round-robin"
        icon={<Repeat className="size-4 text-router" />}
        body="a pool of equals. each request goes to the next account in turn, so no single subscription burns out."
      >
        <RoundRobinDiagram />
      </ModeCard>
      <ModeCard
        title="conditional"
        icon={<Split className="size-4 text-router" />}
        body="the right model for each request. a judge reads it and picks who answers."
        className="sm:col-span-2 lg:col-span-1"
      >
        <ConditionalDiagram />
      </ModeCard>
    </div>
  );
}
