export function StatusStat({ value, unit }: { value: string; unit: string }) {
  return (
    <span className="whitespace-nowrap">
      <span className="font-medium text-win-ink">{value}</span> {unit}
    </span>
  );
}
