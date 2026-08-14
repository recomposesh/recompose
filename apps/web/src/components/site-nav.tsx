import { Link } from '@tanstack/react-router';

import { gitHubUrl } from '../lib/layout.shared';
import { releasesUrl } from '../lib/shared';

export function SiteNav() {
  return (
    <nav className="site-nav">
      <Link className="site-brand" to="/">
        <img src="/recompose-wordmark.svg" alt="recompose" width={264} height={48} />
      </Link>

      <div className="site-links">
        <Link to="/docs/$" params={{ _splat: '' }}>
          docs
        </Link>
        <a href={`${gitHubUrl}/releases`}>changelog</a>
        <a href={gitHubUrl}>github</a>
      </div>

      <a className="site-cta" href={releasesUrl}>
        download &rarr;
      </a>
    </nav>
  );
}
