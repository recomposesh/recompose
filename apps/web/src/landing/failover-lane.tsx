export function FailoverLane({
  label,
  status,
  statusTone,
  ticks,
}: {
  label: string;
  status: string;
  statusTone: string;
  ticks: string[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="font-serif text-sm text-stage-ink">{label}</span>
        <span className={`font-mono text-xs ${statusTone}`}>{status}</span>
      </div>
      <div className="flex gap-0.5">
        {ticks.map((tone, index) => (
          <span key={`${tone}-${index}`} className={`h-3.5 flex-1 rounded-xs ${tone}`} />
        ))}
      </div>
    </div>
  );
}
