import { Link, createFileRoute } from '@tanstack/react-router';

import { AppleMark } from '../components/apple-mark';
import { SiteNav } from '../components/site-nav';
import { HeroCanvas } from '../hero/hero-canvas';
import { releasesUrl } from '../lib/links';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  return (
    <main className="relative min-h-svh overflow-hidden bg-fd-background">
      <HeroCanvas />

      <SiteNav />

      <div className="relative mx-auto flex max-w-7xl flex-col px-10 pt-24 pb-32">
        <h1 className="hero-lift max-w-3xl text-5xl leading-none font-medium text-fd-muted-foreground">
          <span className="block text-fd-foreground">every model</span>
          one gateway you control
          <br />
          for the new age with agents
        </h1>

        <p className="hero-lift mt-7 max-w-xl text-lg text-fd-muted-foreground">
          recompose turns your accounts, models and providers into virtual models behind one local
          gateway.
        </p>

        <div className="mt-9 flex items-center gap-2">
          <a
            className="inline-flex items-center gap-2 rounded-lg bg-fd-primary px-5 py-3 text-sm font-medium text-fd-primary-foreground"
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
    </main>
  );
}
