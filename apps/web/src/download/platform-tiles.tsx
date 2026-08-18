import type { ReactNode } from 'react';

import type { DownloadTarget } from '../lib/download-targets';

import { AppleMark, TuxMark, UbuntuMark, WindowsMark } from '../components/platform-marks';

const tiles: Record<DownloadTarget, { tone: string; mark: ReactNode }> = {
  'mac-arm64': {
    tone: 'bg-fd-primary text-fd-primary-foreground',
    mark: <AppleMark className="-mt-0.5 size-4.5" />,
  },
  'mac-x64': {
    tone: 'bg-fd-primary text-fd-primary-foreground',
    mark: <AppleMark className="-mt-0.5 size-4.5" />,
  },
  windows: { tone: 'bg-windows text-white', mark: <WindowsMark className="size-4.5" /> },
  'linux-appimage': { tone: 'bg-tux text-tile', mark: <TuxMark className="size-4.5" /> },
  'linux-deb': { tone: 'bg-ubuntu text-white', mark: <UbuntuMark className="size-4.5" /> },
};

export function PlatformTile({ target }: { target: DownloadTarget }) {
  const tile = tiles[target];

  return (
    <span className={`flex size-9 items-center justify-center rounded-tile ${tile.tone}`}>
      {tile.mark}
    </span>
  );
}
