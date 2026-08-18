export function PathChip({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`flex items-center gap-2 rounded-lg border border-stage-line bg-stage-panel px-5 py-3 ${className}`}
    >
      {children}
    </span>
  );
}
