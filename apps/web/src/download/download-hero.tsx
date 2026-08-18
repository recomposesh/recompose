import type { Platform } from '../lib/detect-platform';

import { SiteNav } from '../components/site-nav';
import { CablesBackground } from './cables-background';
import { PrimaryDownload } from './primary-download';
import { ReleasePill } from './release-pill';

export function DownloadHero({ platform }: { platform: Platform }) {
  return (
    <section className="relative overflow-hidden">
      <CablesBackground />

      <SiteNav />

      <div className="relative mx-auto flex max-w-360 flex-col items-center px-16 pt-23 pb-18 text-center">
        <ReleasePill />

        <h1 className="mt-8.5 flex items-center gap-5 text-hero leading-none font-medium">
          <span className="text-fd-foreground">download</span>
          <span className="text-stage-soft">recompose</span>
        </h1>

        <p className="mt-5.5 text-lg text-stage-soft">
          every model you can reach, one gateway you control. free and open source.
        </p>

        <div className="mt-9">
          <PrimaryDownload platform={platform} />
        </div>
      </div>
    </section>
  );
}
