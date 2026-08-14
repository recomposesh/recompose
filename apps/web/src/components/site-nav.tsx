import { Link } from '@tanstack/react-router';

import { gitHubUrl } from '../lib/layout.shared';
import { releasesUrl } from '../lib/shared';
import { NoteLabel } from './note-label';
import { Wordmark } from './wordmark';

export function SiteNav() {
  return (
    <nav className="site-nav">
      <Link className="site-brand" to="/" aria-label="recompose">
        <Wordmark />
      </Link>

      <div className="site-links">
        <Link to="/docs/$" params={{ _splat: '' }} aria-label="docs">
          <NoteLabel label="docs" />
        </Link>
        <a href={`${gitHubUrl}/releases`} aria-label="changelog">
          <NoteLabel label="changelog" />
        </a>
        <a href={gitHubUrl} aria-label="github">
          <NoteLabel label="github" />
        </a>
      </div>

      <a className="site-cta" href={releasesUrl}>
        download &rarr;
      </a>
    </nav>
  );
}
