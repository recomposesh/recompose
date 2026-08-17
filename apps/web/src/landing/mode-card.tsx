export function ModeCard({
  title,
  icon,
  body,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-stage-hairline bg-stage-card p-6">
      <div className="h-30 rounded-lg bg-stage-panel">{children}</div>
      <div className="flex items-center gap-2.5">
        {icon}
        <span className="text-lg font-medium text-stage-ink">{title}</span>
      </div>
      <p className="text-body leading-relaxed text-stage-dim">{body}</p>
    </div>
  );
}
