import { createFileRoute } from '@tanstack/react-router';

import { changelogAtomFeed } from '../lib/atom';
import { changelogEntries } from '../lib/changelog-entries';

export const Route = createFileRoute('/changelog.xml')({
  server: {
    handlers: {
      GET: () =>
        new Response(changelogAtomFeed(changelogEntries), {
          headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' },
        }),
    },
  },
});
