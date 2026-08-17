import { Link } from '@tanstack/react-router';

import { AppleMark } from '../components/apple-mark';
import { SiteNav } from '../components/site-nav';
import { HeroCanvas } from '../hero/hero-canvas';
import { releasesUrl } from '../lib/links';

export function HeroSection() {
  return (
    <section className="relative min-h-svh overflow-hidden">
      <HeroCanvas />

      <SiteNav />

      <div className="relative mx-auto flex max-w-360 flex-col px-16 pt-20 pb-32">
        <h1
          data-spot="text"
          className="spot-copy hero-lift max-w-3xl text-5xl leading-none font-medium text-fd-muted-foreground"
        >
          <span data-spot="text" className="spot-copy block text-fd-foreground">
            compose
          </span>
          every model you can reach
          <br />
          into every harness you run
        </h1>

        <p
          data-spot="text"
          className="spot-copy hero-lift mt-7 max-w-xl text-lg text-fd-muted-foreground"
        >
          recompose wires subscriptions, keys and local runtimes into virtual models, so a rate
          limit never stops an agent.
        </p>

        <div className="mt-9 flex items-center gap-2">
          <a
            className="inline-flex items-center gap-2 rounded-lg bg-fd-primary px-5 py-3 text-sm font-medium text-fd-primary-foreground transition-opacity hover:opacity-85"
            href={releasesUrl}
          >
            <AppleMark />
            download for macOS
          </a>
          <Link
            className="hero-lift rounded-lg px-5 py-3 text-sm text-fd-foreground transition-colors hover:bg-fd-accent"
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
