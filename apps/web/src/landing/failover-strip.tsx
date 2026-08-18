import { CornerDownRight } from 'lucide-react';

import { FailoverLane } from './failover-lane';

const WORK_TICKS = [
  ...Array.from({ length: 18 }, () => 'bg-live'),
  'bg-down',
  'bg-down',
  ...Array.from({ length: 6 }, () => 'bg-stage-line'),
];

const PERSONAL_TICKS = [
  ...Array.from({ length: 20 }, () => 'bg-stage-line'),
  ...Array.from({ length: 6 }, () => 'bg-live'),
];

export function FailoverStrip() {
  return (
    <div className="mt-10 flex flex-col gap-4 rounded-2xl border border-stage-hairline bg-stage-panel p-5 lg:hidden">
      <FailoverLane
        label="claude · work"
        status="429 · rate limited"
        statusTone="text-down"
        ticks={WORK_TICKS}
      />
      <div className="flex items-center gap-2 text-pending">
        <CornerDownRight className="size-3.25" />
        <span className="font-mono text-annotation">429 → next target</span>
      </div>
      <FailoverLane
        label="claude · personal"
        status="took over · client never noticed"
        statusTone="text-live"
        ticks={PERSONAL_TICKS}
      />
    </div>
  );
}
