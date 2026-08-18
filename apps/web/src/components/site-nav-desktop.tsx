import { Link } from '@tanstack/react-router';

import { gitHubUrl } from '../lib/links';
import { NoteLabel } from './note-label';
import { TrebleClef } from './treble-clef';

export function SiteNavDesktop() {
  return (
    <>
      <div className="hidden items-center gap-8 text-fd-foreground md:flex">
        <Link
          to="/docs/$"
          params={{ _splat: '' }}
          aria-label="docs"
          data-spot="var"
          className="note-link"
        >
          <NoteLabel label="docs" />
        </Link>
        <Link to="/changelog" aria-label="changelog" data-spot="var" className="note-link">
          <NoteLabel label="changelog" />
        </Link>
        <a href={gitHubUrl} aria-label="github" data-spot="var" className="note-link">
          <NoteLabel label="github" />
        </a>
      </div>

      <Link
        to="/download"
        aria-label="download"
        data-spot="var"
        className="note-link group hidden items-center gap-1 text-fd-foreground md:inline-flex"
      >
        <span className="relative inline-flex">
          <TrebleClef />
          <span aria-hidden="true" data-spot="mask" className="spot-mask absolute inset-0">
            <TrebleClef />
          </span>
        </span>
        <NoteLabel label="download" />
      </Link>
    </>
  );
}
