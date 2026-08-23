import { Brain } from 'lucide-react';

export function JudgeSatellite({ x, y, model }: { x: number; y: number; model: string }) {
  return (
    <div
      className="absolute flex w-24 flex-col items-center"
      style={{ left: x, top: y, height: 96 }}
    >
      <span
        className="flex size-9 items-center justify-center rounded-full border-router bg-win-card shadow-lg"
        style={{ borderWidth: 1.5 }}
      >
        <span className="sr-only">Judge</span>
        <Brain className="size-5 text-router" />
      </span>
      <span className="mt-1 font-mono text-annotation leading-tight text-win-ink2">{model}</span>
      <span className="relative mt-1 w-0 flex-1">
        <span className="absolute inset-0 border-s border-dashed border-router" />
        <span
          data-wire-live="judge-tie"
          className="absolute inset-0 border-s border-dashed border-live opacity-0"
        />
      </span>
    </div>
  );
}
