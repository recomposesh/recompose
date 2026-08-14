import { Link } from '@tanstack/react-router';

import { gitHubUrl, releasesUrl } from '../lib/links';
import { NoteLabel } from './note-label';
import { TrebleClef } from './treble-clef';
import { Wordmark } from './wordmark';

export function SiteNav() {
  return (
    <nav className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-10 py-6 text-base font-medium">
      <Link to="/" aria-label="recompose" data-spot="text" className="text-fd-foreground">
        <Wordmark height={22} />
      </Link>

      <div className="flex items-center gap-8 text-fd-foreground">
        <Link to="/docs/$" params={{ _splat: '' }} aria-label="docs" className="note-link">
          <NoteLabel label="docs" />
        </Link>
        <a href={releasesUrl} aria-label="changelog" className="note-link">
          <NoteLabel label="changelog" />
        </a>
        <a href={gitHubUrl} aria-label="github" className="note-link">
          <NoteLabel label="github" />
        </a>
      </div>

      <a
        href={releasesUrl}
        aria-label="download"
        className="note-link group inline-flex items-center gap-1 text-fd-foreground"
      >
        <TrebleClef />
        <NoteLabel label="download" />
      </a>
    </nav>
  );
}
