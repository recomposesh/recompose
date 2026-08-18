import { StatusStat } from './status-stat';

export function StatusBar() {
  return (
    <div className="absolute inset-x-0 inset-s-60 bottom-0 flex h-9.5 items-center gap-3.5 border-t border-win-line bg-win-chrome px-3.5 font-mono text-xs text-win-ink2">
      <StatusStat value="0" unit="req/min" />
      <StatusStat value="0ms" unit="latency" />
      <StatusStat value="0" unit="client apps" />
      <span className="h-3.5 w-px bg-win-line" />
      <StatusStat value="0" unit="tok/min" />
      <span className="ms-auto flex gap-1">
        <StatusStat value="7" unit="nodes ·" />
        <StatusStat value="6" unit="wires" />
      </span>
    </div>
  );
}
