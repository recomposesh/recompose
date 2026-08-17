import { RouterModes } from './router-modes';
import { RouterPanel } from './router-panel';

export function RouterSection() {
  return (
    <section className="bg-stage">
      <div className="mx-auto max-w-360 px-16 py-28">
        <h2 className="text-4xl font-medium text-stage-ink">routers keep the answer coming</h2>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-stage-dim">
          failover tries the next target the moment one stumbles. a round-robin pool spreads the day
          across accounts. clients never see either.
        </p>

        <RouterPanel />
        <RouterModes />
      </div>
    </section>
  );
}
