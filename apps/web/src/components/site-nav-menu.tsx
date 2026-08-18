import { Link } from '@tanstack/react-router';

import { gitHubUrl } from '../lib/links';

export function SiteNavMenu() {
  return (
    <div className="absolute inset-x-5 top-full z-20 flex flex-col gap-5 rounded-xl border border-stage-line bg-fd-background p-5 text-fd-foreground shadow-xl md:hidden">
      <Link to="/docs/$" params={{ _splat: '' }} aria-label="docs">
        docs
      </Link>
      <Link to="/changelog" aria-label="changelog">
        changelog
      </Link>
      <a href={gitHubUrl} aria-label="github">
        github
      </a>
      <Link to="/download" aria-label="download">
        download
      </Link>
    </div>
  );
}
