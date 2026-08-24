import type { ReactNode } from 'react';

import type { Platform } from '../lib/detect-platform';

import { AppleMark, TuxMark, WindowsMark } from '../components/platform-marks';

const callFor: Record<Platform, { label: string; mark: ReactNode }> = {
  mac: { label: 'download for macOS', mark: <AppleMark /> },
  windows: { label: 'download for Windows', mark: <WindowsMark /> },
  linux: { label: 'download for Linux', mark: <TuxMark /> },
};

export function DownloadCall({ platform }: { platform: Platform }) {
  const { label, mark } = callFor[platform];

  return (
    <>
      {mark}
      {label}
    </>
  );
}
