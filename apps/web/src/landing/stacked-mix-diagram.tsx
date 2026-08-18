import { BrandTile } from './brand-tile';
import { HARNESSES, MODELS } from './mix-layout';

export function StackedMixDiagram() {
  return (
    <div className="mt-10 flex flex-col items-center lg:hidden">
      <div className="flex items-start justify-center gap-2 md:gap-6">
        {HARNESSES.map((h) => (
          <div key={h.label} className="flex flex-col items-center gap-2.5">
            <BrandTile name={h.label} className="size-9 md:size-11" />
            <span className="hidden font-serif text-xs text-stage-dim md:block">{h.label}</span>
          </div>
        ))}
      </div>

      <span className="h-6 w-0.5 bg-live" />

      <div className="flex items-center gap-2 rounded-lg border border-stage-line bg-stage-card px-4 py-2.5">
        <span className="size-1.75 rounded-full bg-live" />
        <span className="font-mono text-xs text-stage-ink md:text-control">
          http://localhost:8397/coding
        </span>
      </div>

      <span className="h-6 w-0.5 bg-live" />

      <div className="grid w-full grid-cols-2 gap-2 md:grid-cols-4">
        {MODELS.map((m) => (
          <div
            key={m.label}
            className="flex h-8 items-center justify-center rounded-md border border-stage-line"
          >
            <span className="font-mono text-xs text-stage-dim">{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
