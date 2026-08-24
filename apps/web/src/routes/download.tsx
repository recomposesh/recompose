import { createFileRoute } from '@tanstack/react-router';

import { DownloadHero } from '../download/download-hero';
import { OtherPlatforms } from '../download/other-platforms';
import { TerminalCard } from '../download/terminal-card';
import { SiteFooter } from '../landing/site-footer';
import { pageMeta } from '../lib/seo';
import { useVisitorPlatform } from '../lib/visitor-platform';

export const Route = createFileRoute('/download')({
  head: () => ({
    meta: pageMeta({
      title: 'download recompose',
      description:
        'recompose for macOS, Windows, and Linux. every model you can reach, one gateway you control.',
      path: '/download',
    }),
  }),
  component: DownloadPage,
});

function DownloadPage() {
  const platform = useVisitorPlatform();

  return (
    <>
      <main className="relative bg-fd-background">
        <DownloadHero platform={platform} />
        <OtherPlatforms platform={platform} />
        <TerminalCard />
      </main>
      <SiteFooter />
    </>
  );
}
