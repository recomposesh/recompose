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

      <div className="relative mx-auto flex max-w-360 flex-col items-center px-5 pt-14 pb-12 text-center md:px-10 md:pt-23 md:pb-18 lg:px-16">
        <ReleasePill />

        <h1 className="mt-8 flex flex-col items-center text-5xl leading-none font-medium md:mt-8.5 md:flex-row md:gap-5 md:text-6xl lg:text-hero">
          <span className="text-fd-foreground">download</span>
          <span className="text-stage-soft">recompose</span>
        </h1>

        <p className="mt-5 text-base text-stage-soft md:mt-5.5 md:text-lg">
          every model you can reach, one gateway you control. free and open source.
        </p>

        <div className="mt-9 w-full md:w-auto">
          <PrimaryDownload platform={platform} />
        </div>
      </div>
    </section>
  );
}
