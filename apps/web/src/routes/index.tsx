import { Link } from '@tanstack/react-router';
import { createFileRoute } from '@tanstack/react-router';
import { HomeLayout } from 'fumadocs-ui/layouts/home';

import { gitHubUrl, navOptions } from '../lib/layout.shared';
import { releasesUrl } from '../lib/shared';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  return (
    <HomeLayout nav={navOptions} githubUrl={gitHubUrl}>
      <main className="landing">
        <h1 className="landing-claim">
          <span className="landing-lead">every model</span>
          one gateway you control for the new age
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
            read the docs
          </Link>
        </div>
      </main>
    </HomeLayout>
  );
}
