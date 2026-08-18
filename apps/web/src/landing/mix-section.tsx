import { BrandTile } from './brand-tile';
import { DIAGRAM_HEIGHT, DIAGRAM_WIDTH, HARNESSES, MODELS, leftPercent } from './mix-layout';
import { MixWires } from './mix-wires';

export function MixSection() {
  return (
    <section className="bg-stage dot-field">
      <div className="mx-auto max-w-360 px-16 py-28">
        <h2 className="text-4xl font-medium text-stage-ink">swap the model, keep the harness</h2>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-stage-dim">
          every client dials the same local URL. swapping the model behind it is a dropdown, not a
          migration.
        </p>

        <div
          className="relative mt-16 w-full"
          style={{ aspectRatio: `${DIAGRAM_WIDTH} / ${DIAGRAM_HEIGHT}` }}
        >
          <MixWires />

          {HARNESSES.map((h) => (
            <div
              key={h.label}
              className="absolute top-0 flex w-30 -translate-x-1/2 flex-col items-center gap-2.5"
              style={{ left: leftPercent(h.x) }}
            >
              <BrandTile name={h.label} />
              <span className="font-serif text-sm text-stage-dim">{h.label}</span>
            </div>
          ))}

          <div
            className="absolute flex h-10 w-95 -translate-x-1/2 items-center justify-center gap-2 rounded-lg border border-stage-line bg-stage-card"
            style={{ left: leftPercent(656), top: `${(250 / DIAGRAM_HEIGHT) * 100}%` }}
          >
            <span className="size-1.75 rounded-full bg-live" />
            <span className="font-mono text-control text-stage-ink">http://127.0.0.1:8397</span>
          </div>

          {MODELS.map((m) => (
            <div
              key={m.label}
              className="absolute flex h-8 w-37 -translate-x-1/2 items-center justify-center rounded-md border border-stage-line"
              style={{ left: leftPercent(m.x), top: `${(452 / DIAGRAM_HEIGHT) * 100}%` }}
            >
              <span className="font-mono text-xs text-stage-dim">{m.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
