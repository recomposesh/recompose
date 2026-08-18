import { Link } from '@tanstack/react-router';

import { gitHubUrl, releasesUrl } from '../lib/links';
import { NoteLabel } from './note-label';
import { TrebleClef } from './treble-clef';
import { Wordmark } from './wordmark';

export function SiteNav() {
  return (
    <nav className="relative z-10 mx-auto flex w-full max-w-360 items-center justify-between px-16 py-6 text-base">
      <Link to="/" aria-label="recompose" className="relative inline-flex text-fd-foreground">
        <Wordmark height={22} />
        <span aria-hidden="true" data-spot="mask" className="spot-mask absolute inset-0">
          <Wordmark height={22} />
        </span>
      </Link>

      <div className="flex items-center gap-8 text-fd-foreground">
        <Link
          to="/docs/$"
          params={{ _splat: '' }}
          aria-label="docs"
          data-spot="var"
          className="note-link"
        >
          <NoteLabel label="docs" />
        </Link>
        <a href={releasesUrl} aria-label="changelog" data-spot="var" className="note-link">
          <NoteLabel label="changelog" />
        </a>
        <a href={gitHubUrl} aria-label="github" data-spot="var" className="note-link">
          <NoteLabel label="github" />
        </a>
      </div>

      <a
        href={releasesUrl}
        aria-label="download"
        data-spot="var"
        className="note-link group inline-flex items-center gap-1 text-fd-foreground"
      >
        <span className="relative inline-flex">
          <TrebleClef />
          <span aria-hidden="true" data-spot="mask" className="spot-mask absolute inset-0">
            <TrebleClef />
          </span>
        </span>
        <NoteLabel label="download" />
      </a>
    </nav>
  );
}
