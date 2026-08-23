import { StatusStat } from './status-stat';

export function StatusBar() {
  return (
    <div className="absolute inset-x-0 inset-s-60 bottom-0 flex h-9.5 items-center gap-3.5 border-t border-win-line bg-win-chrome px-3.5 font-mono text-xs text-win-ink2">
      <StatusStat value="0" unit="req/min" statId="req-min" />
      <StatusStat value="0ms" unit="latency" statId="latency" />
      <StatusStat value="0" unit="client apps" statId="clients" />
      <span className="h-3.5 w-px bg-win-line" />
      <StatusStat value="0" unit="tok/min" statId="tok-min" />
      <span className="ms-auto flex gap-1">
        <StatusStat value="11" unit="nodes ·" />
        <StatusStat value="9" unit="wires" />
      </span>
    </div>
  );
}
