import {
  BookOpen,
  Copy,
  PanelBottom,
  PanelLeft,
  PanelRight,
  Share2,
  WandSparkles,
} from 'lucide-react';

import { ToolButton } from './tool-button';

export function AppToolbar() {
  return (
    <div className="absolute inset-s-60 inset-e-0 top-0 flex h-13.5 items-center gap-2.5 border-b border-win-line bg-win-chrome px-3.5">
      <ToolButton>
        <PanelLeft className="size-4 text-win-ink2" />
      </ToolButton>
      <ToolButton>
        <span className="size-3.5 bg-down" style={{ borderRadius: 3 }} />
      </ToolButton>
      <ToolButton>
        <BookOpen className="size-4 text-win-ink2" />
      </ToolButton>

      <div className="relative flex h-7.5 flex-1 items-center justify-center gap-2 rounded-md border border-win-line bg-win-raised px-8">
        <Share2 className="absolute inset-s-2.5 size-3.5 text-accent-ink" />
        <span className="size-1.75 rounded-full bg-live" />
        <span className="font-mono text-xs whitespace-nowrap">
          <span className="text-win-ink2">http://</span>
          <span className="text-win-ink">127.0.0.1:8397</span>
          <span className="text-win-ink2"> · Running</span>
        </span>
        <Copy className="absolute inset-e-2.5 size-3 text-win-ink2" />
      </div>

      <ToolButton>
        <WandSparkles className="size-4 text-win-ink2" />
      </ToolButton>
      <span className="flex h-7.25 items-center gap-0.5 rounded-md border border-win-line bg-win-raised p-0.5">
        <span className="flex h-5.75 w-7.75 items-center justify-center rounded">
          <PanelBottom className="size-4 text-win-ink2" />
        </span>
        <span className="flex h-5.75 w-7.75 items-center justify-center rounded">
          <PanelRight className="size-4 text-win-ink2" />
        </span>
      </span>
    </div>
  );
}
