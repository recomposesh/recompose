export function SidebarRow({
  icon,
  label,
  trailing,
  active = false,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  trailing?: React.ReactNode;
  active?: boolean;
  accent?: boolean;
}) {
  return (
    <span
      className={`flex h-7 items-center gap-1.75 rounded-md px-2 ${active ? 'bg-win-ink/10' : ''}`}
    >
      {icon}
      <span className={`text-control ${accent ? 'font-medium text-accent-ink' : 'text-win-ink'}`}>
        {label}
      </span>
      <span className="ms-auto flex items-center">{trailing}</span>
    </span>
  );
}
