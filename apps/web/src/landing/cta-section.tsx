import { Star } from 'lucide-react';

import { AppleMark } from '../components/apple-mark';
import { gitHubUrl, releasesUrl } from '../lib/links';
import { CtaWires, STAGE_HEIGHT, STAGE_WIDTH } from './cta-wires';

const PILL_GLOW = '0 0 60px rgb(50 215 75 / 0.15), 0 24px 60px rgb(0 0 0 / 0.35)';

export function CtaSection() {
  return (
    <section className="bg-stage">
      <div className="mx-auto flex max-w-360 flex-col items-center px-16 py-32">
        <h2 className="text-center text-5xl font-medium text-stage-ink">
          compose your own AI network
        </h2>

        <div
          className="relative mt-12 w-full"
          style={{ aspectRatio: `${STAGE_WIDTH} / ${STAGE_HEIGHT}` }}
        >
          <CtaWires />

          <div
            className="absolute inset-s-1/2 top-1/2 flex h-16 w-130 -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-3.5 rounded-2xl border border-stage-line bg-stage-card"
            style={{ boxShadow: PILL_GLOW }}
          >
            <span className="size-2.5 rounded-full bg-live" />
            <span className="font-mono text-xl text-stage-ink">http://localhost:8397/coding</span>
          </div>
        </div>

        <div className="mt-12 flex items-center gap-2.5">
          <a
            className="inline-flex items-center gap-2 rounded-lg bg-fd-primary px-6 py-3.5 text-body font-medium text-fd-primary-foreground transition-opacity hover:opacity-85"
            href={releasesUrl}
          >
            <AppleMark />
            download for macOS
          </a>
          <a
            className="inline-flex items-center gap-2 rounded-lg px-6 py-3.5 text-body text-stage-ink transition-colors hover:bg-fd-accent"
            href={gitHubUrl}
          >
            <Star className="size-4" />
            star on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}
