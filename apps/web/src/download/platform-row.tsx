import type { ReactNode } from 'react';

import { ArrowDown } from 'lucide-react';

import type { DownloadTarget } from '../lib/download-targets';

import { downloadHref } from '../lib/download-targets';

export interface PlatformRowData {
  target: DownloadTarget;
  name: string;
  detail: string;
  tile: ReactNode;
}

export function PlatformRow({ target, name, detail, tile }: PlatformRowData) {
  return (
    <div className="flex items-center justify-between gap-3 py-4">
      <div className="flex min-w-0 items-center gap-3.5">
        {tile}
        <span className="flex flex-col gap-0.5 text-start">
          <span className="text-body font-medium text-fd-foreground">{name}</span>
          <span className="text-control text-stage-faint">{detail}</span>
        </span>
      </div>
      <a
        href={downloadHref[target]}
        aria-label={`download ${name}`}
        className="inline-flex shrink-0 items-center gap-1.75 rounded-full border border-stage-ring py-2 ps-4 pe-3.5 text-control font-medium text-fd-foreground transition-colors hover:bg-fd-accent"
      >
        download
        <ArrowDown className="size-3.25" />
      </a>
    </div>
  );
}
