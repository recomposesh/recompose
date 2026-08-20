import { Link } from '@tanstack/react-router';

import { SiteFooter } from '../landing/site-footer';
import { FallenNotes } from './fallen-notes';
import { SiteNav } from './site-nav';

export function NotFoundScreen() {
  return (
    <>
      <main className="relative bg-fd-background">
        <SiteNav />

        <div className="mx-auto flex max-w-360 flex-col items-center px-5 pt-14 pb-24 text-center md:px-10 lg:px-16 lg:pb-32">
          <h1 className="font-serif text-billboard leading-display font-medium text-fd-foreground">
            404
          </h1>
          <FallenNotes className="mt-4 w-full max-w-105 text-fd-foreground" />
          <h2 className="mt-8 text-headline leading-display font-medium text-fd-foreground">
            this page wandered off the score
          </h2>
          <p className="mt-3.5 max-w-2xl text-reading text-stage-dim">
            this address answers nothing. the rest of the program is still playing.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            <Link
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-fd-primary px-5 py-3 text-sm font-medium text-fd-primary-foreground transition-opacity hover:opacity-85"
              to="/"
            >
              back to the landing page
            </Link>
            <Link
              className="rounded-lg px-5 py-3 text-center text-sm text-fd-foreground transition-colors hover:bg-fd-accent"
              to="/docs/$"
              params={{ _splat: '' }}
            >
              or read the docs &rarr;
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
