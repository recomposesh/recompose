import { createFileRoute } from '@tanstack/react-router';

import { ChangelogScreen } from '../../changelog/changelog-screen';
import { latestChangelogEntry } from '../../lib/changelog-entries';
import { pageMeta } from '../../lib/seo';

export const Route = createFileRoute('/changelog/')({
  head: () => ({
    meta: pageMeta({
      title: 'recompose changelog',
      description: 'keep up with the latest recompose releases.',
      path: '/changelog',
    }),
  }),
  component: ChangelogIndex,
});

function ChangelogIndex() {
  return <ChangelogScreen entry={latestChangelogEntry} />;
}
