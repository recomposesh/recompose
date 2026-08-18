import type { ReactNode } from 'react';

import { Terminal } from 'lucide-react';

import type { DownloadTarget } from '../lib/download-targets';

import { AppleMark } from '../components/apple-mark';
import { TuxMark } from '../components/tux-mark';
import { WindowsMark } from '../components/windows-mark';
import { releaseAssetUrl } from '../lib/download-targets';

const rows: { target: DownloadTarget; label: string; asset: string; mark: ReactNode }[] = [
  {
    target: 'mac-arm64',
    label: 'macOS · apple silicon',
    asset: 'dmg ↓',
    mark: <AppleMark className="-mt-0.5 size-4" />,
  },
  {
    target: 'mac-x64',
    label: 'macOS · intel',
    asset: 'dmg ↓',
    mark: <AppleMark className="-mt-0.5 size-4" />,
  },
  {
    target: 'windows',
    label: 'windows · x64',
    asset: 'exe ↓',
    mark: <WindowsMark className="size-3.75" />,
  },
  {
    target: 'linux-appimage',
    label: 'linux · appimage',
    asset: 'appimage ↓',
    mark: <TuxMark className="size-3.75" />,
  },
  {
    target: 'linux-deb',
    label: 'linux · deb',
    asset: 'deb ↓',
    mark: <TuxMark className="size-3.75" />,
  },
];

export function ReleaseDownloads({ version }: { version: string }) {
  return (
    <div className="w-full max-w-115 border-t border-stage-line">
      {rows.map((row) => (
        <div
          key={row.target}
          className="flex items-center justify-between border-b border-stage-hairline py-3 ps-0.5"
        >
          <span className="flex items-center gap-2.5 text-sm text-stage-prose">
            {row.mark}
            {row.label}
          </span>
          <a
            href={releaseAssetUrl(version, row.target)}
            className="text-sm text-fd-foreground underline-offset-4 hover:underline"
          >
            {row.asset}
          </a>
        </div>
      ))}
      <div className="flex items-center justify-between border-b border-stage-hairline py-3 ps-0.5">
        <span className="flex items-center gap-2.5 text-sm text-stage-prose">
          <Terminal className="size-3.75" />
          homebrew
        </span>
        <code className="font-mono text-xs text-fd-foreground">brew install --cask recompose</code>
      </div>
    </div>
  );
}
