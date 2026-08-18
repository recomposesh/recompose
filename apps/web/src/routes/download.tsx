import { createFileRoute } from '@tanstack/react-router';
import { useSyncExternalStore } from 'react';

import type { Platform } from '../lib/detect-platform';

import { DownloadHero } from '../download/download-hero';
import { OtherPlatforms } from '../download/other-platforms';
import { TerminalCard } from '../download/terminal-card';
import { SiteFooter } from '../landing/site-footer';
import { detectPlatform } from '../lib/detect-platform';

export const Route = createFileRoute('/download')({
  head: () => ({
    meta: [{ title: 'download recompose' }],
  }),
  component: DownloadPage,
});

const subscribeToNothing = () => () => {};
const visitorPlatform = (): Platform => detectPlatform(navigator.userAgent);
const prerenderPlatform = (): Platform => 'mac';

function DownloadPage() {
  const platform = useSyncExternalStore(subscribeToNothing, visitorPlatform, prerenderPlatform);

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
