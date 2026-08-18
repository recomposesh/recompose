import { Fragment } from 'react';

import type { Platform } from '../lib/detect-platform';
import type { DownloadTarget } from '../lib/download-targets';

import { PlatformRow } from './platform-row';
import { PlatformTile } from './platform-tiles';

const rowCopy: Record<DownloadTarget, { name: string; detail: string }> = {
  'mac-arm64': { name: 'macOS · Apple Silicon', detail: '.dmg · macOS 12 Monterey or later' },
  'mac-x64': { name: 'macOS · Intel', detail: '.dmg · macOS 12 Monterey or later' },
  windows: {
    name: 'Windows',
    detail: 'installer for Windows 10+ · SmartScreen may warn until signing lands',
  },
  'linux-appimage': { name: 'Linux AppImage', detail: 'self-updating · any modern 64-bit distro' },
  'linux-deb': { name: 'Linux deb', detail: 'Debian and Ubuntu' },
};

const rowsFor: Record<Platform, DownloadTarget[]> = {
  mac: ['linux-appimage', 'linux-deb', 'windows'],
  windows: ['mac-arm64', 'mac-x64', 'linux-appimage', 'linux-deb'],
  linux: ['mac-arm64', 'mac-x64', 'windows'],
};

export function OtherPlatforms({ platform }: { platform: Platform }) {
  return (
    <section className="mx-auto flex max-w-360 flex-col items-center px-5 pt-6 pb-14 md:px-10 lg:px-16">
      <p className="text-xs font-medium tracking-caps text-stage-faint">OTHER PLATFORMS</p>

      <div className="mt-4.5 w-full max-w-220 rounded-2xl border border-stage-hairline bg-stage-card px-4 py-2.5 md:px-6.5">
        {rowsFor[platform].map((target, index) => (
          <Fragment key={target}>
            {index > 0 && <div className="h-px bg-stage-hairline" />}
            <PlatformRow
              target={target}
              name={rowCopy[target].name}
              detail={rowCopy[target].detail}
              tile={<PlatformTile target={target} />}
            />
          </Fragment>
        ))}
      </div>
    </section>
  );
}
