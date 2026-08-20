export function StatusStat({
  value,
  unit,
  statId,
}: {
  value: string;
  unit: string;
  statId?: string;
}) {
  return (
    <span className="whitespace-nowrap">
      <span data-status-stat={statId} className="font-medium text-win-ink">
        {value}
      </span>{' '}
      {unit}
    </span>
  );
}
