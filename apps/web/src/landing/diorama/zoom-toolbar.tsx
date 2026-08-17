import { Maximize, Minus, Plus } from 'lucide-react';

export function ZoomToolbar() {
  return (
    <div
      className="absolute inset-s-4 bottom-4 flex items-center gap-0.5 border border-win-line bg-win-raised/95 shadow-lg"
      style={{ borderRadius: 9, padding: 3 }}
    >
      <span className="flex size-6 items-center justify-center rounded-md">
        <Minus className="size-3.5 text-win-ink2" />
      </span>
      <span className="flex h-6 items-center rounded-md border border-win-line bg-win-canvas px-2 font-mono text-xs text-win-ink">
        100%
      </span>
      <span className="flex size-6 items-center justify-center rounded-md">
        <Plus className="size-3.5 text-win-ink2" />
      </span>
      <span className="flex size-6 items-center justify-center rounded-md">
        <Maximize className="size-3.5 text-win-ink2" />
      </span>
    </div>
  );
}
