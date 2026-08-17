import { BrandTile } from '../brand-tile';

const DOCK_APPS = [
  { name: 'recompose', running: true },
  { name: 'claude code', running: true },
  { name: 'codex', running: false },
  { name: 'cursor', running: false },
  { name: 'zed', running: false },
];

export function Dock() {
  return (
    <div className="absolute inset-s-1/2 bottom-3 -translate-x-1/2">
      <div className="flex items-start gap-3.5 rounded-2xl border border-white/20 bg-white/30 px-3.5 pt-2 pb-1 backdrop-blur-md dark:border-white/10 dark:bg-white/10">
        {DOCK_APPS.map((app) => (
          <span key={app.name} className="flex flex-col items-center gap-1">
            <BrandTile name={app.name} className="size-11" />
            <span
              className={`size-0.75 rounded-full ${app.running ? 'bg-black/60 dark:bg-white/60' : 'bg-transparent'}`}
            />
          </span>
        ))}
      </div>
    </div>
  );
}
