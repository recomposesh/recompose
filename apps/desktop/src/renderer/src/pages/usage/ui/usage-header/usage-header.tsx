import { Button, Icon } from '../../../../shared/ui';

type UsageHeaderProps = {
  /** The sentence naming what the readings below stand for. */
  scope: string;
  /** When the standing readings were last answered. */
  updatedAt: number | undefined;
  /** The instant the stamp reads against. */
  now: number;
  /** Asks for a fresh read of everything on the screen. */
  onRefresh: () => void;
};

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;

function stampWording(updatedAt: number | undefined, now: number): string {
  if (updatedAt === undefined) {
    return 'Reading history';
  }

  const passed = Math.max(0, now - updatedAt);

  if (passed < MINUTE_MS) {
    return `Updated ${String(Math.floor(passed / 1_000))}s ago`;
  }

  if (passed < HOUR_MS) {
    return `Updated ${String(Math.floor(passed / MINUTE_MS))}m ago`;
  }

  return `Updated ${String(Math.floor(passed / HOUR_MS))}h ago`;
}

/**
 * The title, what the window stands for, and how fresh the readings under it are.
 *
 * @summary The stamp is the readings' own age rather than the moment the screen was opened, so a
 * paused poll reads as stale instead of passing for live, and the refresh asks every reading on
 * the screen at once.
 */
export function UsageHeader({ scope, updatedAt, now, onRefresh }: UsageHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        <h1 className="text-title text-ink">Usage</h1>
        <p className="text-caption text-ink-secondary">{scope}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-caption text-ink-secondary">{stampWording(updatedAt, now)}</span>
        <Button onPress={onRefresh} variant="secondary">
          <Icon aria-hidden className="size-3" name="renew" />
          Refresh
        </Button>
      </div>
    </header>
  );
}
