import { Link } from '@tanstack/react-router';

import { AppleMark } from '../components/apple-mark';
import { SiteNav } from '../components/site-nav';
import { HeroCanvas } from '../hero/hero-canvas';

const DOWNLOAD_CTA =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-fd-primary px-5 py-3 text-sm font-medium text-fd-primary-foreground transition-opacity hover:opacity-85';
const DOWNLOAD_CTA_STAGE_INK = 'max-md:bg-white max-md:text-neutral-900';

export function HeroSection() {
  return (
    <section data-spot-stage className="relative min-h-svh overflow-hidden">
      <HeroCanvas />

      <SiteNav tone="stage" />

      <div className="relative mx-auto flex max-w-360 flex-col px-5 pt-12 pb-20 md:px-10 md:pt-20 md:pb-32 lg:px-16">
        <h1
          data-spot="text"
          className="spot-copy hero-lift max-w-3xl text-3xl leading-none font-medium text-fd-muted-foreground max-md:text-neutral-400 md:text-4xl lg:text-5xl"
        >
          <span data-spot="text" className="spot-copy block text-fd-foreground max-md:text-white">
            compose
          </span>
          every model you can reach <br className="hidden md:inline" />
          into every harness you run
        </h1>

        <p
          data-spot="text"
          className="spot-copy hero-lift mt-5 max-w-xl text-base text-fd-muted-foreground max-md:text-neutral-400 md:mt-7 md:text-lg"
        >
          recompose wires subscriptions, keys and local runtimes into virtual models, so a rate
          limit never stops an agent.
        </p>

        <div className="mt-8 flex flex-col gap-2 md:mt-9 md:flex-row md:items-center">
          <Link className={`${DOWNLOAD_CTA} ${DOWNLOAD_CTA_STAGE_INK}`} to="/download">
            <AppleMark />
            download for macOS
          </Link>
          <Link
            className="hero-lift rounded-lg px-5 py-3 text-center text-sm text-fd-foreground transition-colors hover:bg-fd-accent max-md:text-white"
            to="/docs/$"
            params={{ _splat: '' }}
          >
            read the docs &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}
