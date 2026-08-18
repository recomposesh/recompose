import { FailoverStrip } from './failover-strip';
import { RouterModes } from './router-modes';
import { RouterPanel } from './router-panel';

export function RouterSection() {
  return (
    <section className="bg-stage">
      <div className="mx-auto max-w-360 px-5 py-16 md:px-10 md:py-20 lg:px-16 lg:py-28">
        <h2 className="text-2xl font-medium text-stage-ink md:text-3xl lg:text-4xl">
          routers keep the answer coming
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-stage-dim md:text-lg">
          failover tries the next target the moment one stumbles. a round-robin pool spreads the day
          across accounts. clients never see either.
        </p>

        <FailoverStrip />
        <div className="hidden lg:block">
          <RouterPanel />
        </div>
        <RouterModes />
      </div>
    </section>
  );
}
