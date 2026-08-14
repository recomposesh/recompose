import { Link, createFileRoute } from '@tanstack/react-router';

import { HeroCanvas } from '../hero/hero-canvas';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  return (
    <main className="relative min-h-svh overflow-hidden bg-fd-background">
      <HeroCanvas />

      <div className="relative mx-auto flex min-h-svh max-w-5xl flex-col justify-center px-8">
        <h1 className="max-w-2xl text-5xl leading-tight font-medium text-fd-foreground">
          every model, one gateway you control
        </h1>

        <p className="mt-6 max-w-xl text-lg text-fd-muted-foreground">
          recompose turns your accounts, models and providers into virtual models behind one local
          gateway.
        </p>

        <div className="mt-10 flex items-center gap-4">
          <Link
            className="rounded-lg bg-fd-primary px-5 py-3 text-sm font-medium text-fd-primary-foreground"
            to="/docs/$"
            params={{ _splat: '' }}
          >
            Read the docs
          </Link>
        </div>
      </div>
    </main>
  );
}
