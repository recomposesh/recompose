import type { UsageWindow } from '../../lib/usage-window';

import { Button } from '../../../../shared/ui';
import { atClock, clockOf } from '../../lib/clock-edges';

type RangeWindowFooterProps = {
  /** The window a person is drawing, before it lands on the screen. */
  drafted: UsageWindow;
  /** Receives the window as each edge moves. */
  onDraftedChange: (next: UsageWindow) => void;
  /** The zone every edge is read in, which the footer names. */
  zone: string;
  /** Leaves the standing window alone. */
  onCancel: () => void;
  /** Lands the drawn window on the screen. */
  onApply: () => void;
};

const timeField =
  'h-control rounded-control bg-surface-field px-2 font-mono text-mono-value text-ink focus-ring-wide clock-field';

/**
 * The times both edges stand at, the zone they are read in, and the two acts that settle them.
 *
 * @summary The window applies rather than committing as it is drawn, so half a window never lands
 * on the screen as a reading nobody asked for.
 */
export function RangeWindowFooter({
  drafted,
  onDraftedChange,
  zone,
  onCancel,
  onApply,
}: RangeWindowFooterProps) {
  return (
    <div className="flex items-center justify-between gap-2.5 border-t border-line-faint px-3.5 py-2.5">
      <div className="flex items-center gap-2">
        <input
          aria-label="Window opens at"
          className={timeField}
          onInput={(event) => {
            onDraftedChange({ ...drafted, from: atClock(drafted.from, event.currentTarget.value) });
          }}
          type="time"
          value={clockOf(drafted.from)}
        />
        <input
          aria-label="Window closes at"
          className={timeField}
          onInput={(event) => {
            onDraftedChange({ ...drafted, to: atClock(drafted.to, event.currentTarget.value) });
          }}
          type="time"
          value={clockOf(drafted.to)}
        />
        <span className="text-caption text-ink-secondary">{zone}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button onPress={onCancel} variant="secondary">
          Cancel
        </Button>
        <Button onPress={onApply} variant="primary">
          Apply
        </Button>
      </div>
    </div>
  );
}
