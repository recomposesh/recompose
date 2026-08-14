import type { ToggleEvent } from 'react';

import { useId, useState } from 'react';

type CableFailureChipProps = {
  /** The status the gateway answered the last request through this binding with. */
  status: number;
  /** The sentence saying what the request came to, written from the status and nothing else. */
  detail: string;
};

const READING_STANDING =
  'w-56 menu-surface px-3 text-start [inset:auto] [margin-inline:0] [margin-block-end:0] [margin-block-start:--spacing(1)] [position-area:block-end_span-inline-end] [position-try-fallbacks:flip-block]';

/**
 * The last error a binding answered with, standing on the cable that carried it.
 *
 * @summary Reach for it on a failed cable, where a person has seen the color and now wants the
 * reason. It says only that an error stands until it is asked, because a sentence printed over
 * every failed cable would bury the canvas it explains. The reading is a popover, so the browser
 * itself puts it away on Esc or on a press outside, stands it in the top layer where the canvas
 * pane cannot clip it, and anchors it to the chip that invoked it. It sits below the chip and
 * flips above when the room below runs out, so a cable near the bottom edge still reads whole.
 */
export function CableFailureChip({ status, detail }: CableFailureChipProps) {
  const [shown, setShown] = useState(false);
  const readingId = useId();

  return (
    <span className="inline-flex">
      <button
        aria-controls={readingId}
        aria-expanded={shown}
        className="inline-flex h-chip items-center rounded-chip border border-cable-failed bg-surface-card px-1.5 text-caption font-medium text-danger-ink focus-ring-wide"
        popoverTarget={readingId}
        type="button"
      >
        Last error
      </button>
      <div
        className={READING_STANDING}
        id={readingId}
        onToggle={(event: ToggleEvent<HTMLDivElement>) => {
          setShown(event.newState === 'open');
        }}
        popover="auto"
      >
        <span className="block text-mono-caption text-ink-secondary">Status {status}</span>
        <span className="mt-0.5 block text-detail text-ink" data-failure-detail="">
          {detail}
        </span>
      </div>
    </span>
  );
}
