import { GitFork } from 'lucide-react';

import { PANEL_HEIGHT, PANEL_WIDTH, RouterWires } from './router-wires';

function overlay(x: number, y: number) {
  return {
    left: `${(x / PANEL_WIDTH) * 100}%`,
    top: `${(y / PANEL_HEIGHT) * 100}%`,
  };
}

export function RouterPanel() {
  return (
    <div
      className="relative mt-16 w-full overflow-hidden rounded-2xl border border-stage-hairline bg-stage-panel"
      style={{ aspectRatio: `${PANEL_WIDTH} / ${PANEL_HEIGHT}` }}
    >
      <RouterWires />

      <div
        className="absolute flex flex-col items-center justify-center gap-0.5"
        style={{ ...overlay(100, 166), height: '21%', width: '14%' }}
      >
        <span className="flex items-center gap-1.5">
          <span className="flex size-4.25 items-center justify-center rounded bg-router/15">
            <GitFork className="size-2.75 text-router" />
          </span>
          <span className="text-caption font-bold tracking-wider text-router uppercase">
            router
          </span>
        </span>
        <span className="text-control font-semibold text-stage-ink">failover</span>
        <span className="font-mono text-annotation text-stage-dim">failover</span>
      </div>

      <span className="absolute font-serif text-sm text-stage-ink" style={overlay(420, 96)}>
        claude · work
      </span>
      <span className="absolute font-mono text-xs text-down" style={overlay(1050, 98)}>
        429 · rate limited
      </span>
      <span className="absolute font-serif text-sm text-stage-ink" style={overlay(420, 244)}>
        claude · personal
      </span>
      <span className="absolute font-mono text-xs text-live" style={overlay(1000, 246)}>
        took over · client never noticed
      </span>
      <span className="absolute font-mono text-xs text-pending" style={overlay(940, 74)}>
        429 → next target
      </span>
    </div>
  );
}
