import { Link } from '@tanstack/react-router';
import { Star } from 'lucide-react';

import { AppleMark } from '../components/apple-mark';
import { gitHubUrl } from '../lib/links';
import { CtaWires, STAGE_HEIGHT, STAGE_WIDTH } from './cta-wires';

const PILL_GLOW = '0 0 60px rgb(50 215 75 / 0.15), 0 24px 60px rgb(0 0 0 / 0.35)';

export function CtaSection() {
  return (
    <section className="bg-stage">
      <div className="mx-auto flex max-w-360 flex-col items-center px-5 py-20 md:px-10 md:py-24 lg:px-16 lg:py-32">
        <h2 className="text-center text-3xl font-medium text-stage-ink md:text-4xl lg:text-5xl">
          compose your own AI network
        </h2>

        <div
          className="mt-10 flex items-center gap-2.5 rounded-xl border border-stage-line bg-stage-card px-5 py-3.5 md:hidden"
          style={{ boxShadow: PILL_GLOW }}
        >
          <span className="size-1.75 rounded-full bg-live" />
          <span className="font-mono text-sm text-stage-ink">http://localhost:8397/coding</span>
        </div>

        <div
          className="relative mt-12 hidden w-full md:block"
          style={{ aspectRatio: `${STAGE_WIDTH} / ${STAGE_HEIGHT}` }}
        >
          <CtaWires />

          <div
            className="absolute inset-s-1/2 top-1/2 flex h-16 w-130 -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-3.5 rounded-2xl border border-stage-line bg-stage-card"
            style={{ boxShadow: PILL_GLOW }}
          >
            <span className="size-2.5 rounded-full bg-live" />
            <span className="font-mono text-xl text-stage-ink">http://127.0.0.1:8397</span>
          </div>
        </div>

        <div className="mt-10 flex w-full max-w-90 flex-col gap-2.5 md:mt-12 md:w-auto md:max-w-none md:flex-row md:items-center">
          <Link
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-fd-primary px-6 py-3.5 text-body font-medium text-fd-primary-foreground transition-opacity hover:opacity-85"
            to="/download"
          >
            <AppleMark />
            download for macOS
          </Link>
          <a
            className="inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3.5 text-body text-stage-ink transition-colors hover:bg-fd-accent"
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
