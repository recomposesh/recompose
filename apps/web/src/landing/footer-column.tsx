export function FooterColumn({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <span className="font-serif text-sm font-medium tracking-widest text-stage-dim">{label}</span>
      {children}
    </div>
  );
}
