export function ToolButton({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-7.25 w-8.5 items-center justify-center rounded-md border border-win-line bg-win-raised">
      {children}
    </span>
  );
}
