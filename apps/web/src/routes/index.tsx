import { Link, createFileRoute } from '@tanstack/react-router';

import { SiteNav } from '../components/site-nav';
import { HeroCanvas } from '../hero/hero-canvas';
import { releasesUrl } from '../lib/shared';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  return (
    <main className="landing">
      <HeroCanvas />

      <div className="landing-overlay">
        <SiteNav />

        <div className="landing-claim">
          <h1>
            <span className="landing-lead">every model</span>
            one gateway you
            <br />
            control for the new age
          </h1>

          <p className="landing-support">
            recompose turns your accounts, models and providers into virtual models behind one local
            gateway.
          </p>

          <div className="landing-actions">
            <a className="landing-download" href={releasesUrl}>
              download for macOS
            </a>
            <Link className="landing-secondary" to="/docs/$" params={{ _splat: '' }}>
              read the docs &rarr;
            </Link>
          </div>
        </div>

        <div className="app-window">
          <div className="app-window-bar">
            <span className="app-window-dot" />
            <span className="app-window-dot" />
            <span className="app-window-dot" />
            <span className="app-window-title">recompose &mdash; gateways</span>
          </div>
        </div>
      </div>
    </main>
  );
}
