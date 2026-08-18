export function TerminalChrome({ title }: { title: string }) {
  return (
    <div className="relative flex h-8.5 shrink-0 items-center gap-2 px-3">
      <span className="size-2.5 rounded-full bg-traffic-close" />
      <span className="size-2.5 rounded-full bg-traffic-hold" />
      <span className="size-2.5 rounded-full bg-traffic-go" />
      <span className="absolute inset-s-1/2 -translate-x-1/2 text-xs font-semibold text-term-faint">
        {title}
      </span>
    </div>
  );
}
