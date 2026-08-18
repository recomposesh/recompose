import { createFileRoute } from '@tanstack/react-router';

import { ChangelogScreen } from '../../changelog/changelog-screen';
import { latestChangelogEntry } from '../../lib/changelog-entries';

export const Route = createFileRoute('/changelog/')({
  head: () => ({
    meta: [{ title: 'recompose changelog' }],
  }),
  component: ChangelogIndex,
});

function ChangelogIndex() {
  return <ChangelogScreen entry={latestChangelogEntry} />;
}
