import type { KeyboardEvent } from 'react';

import { useId, useState } from 'react';

type CableFailureChipProps = {
  /** The status the gateway answered the last request through this binding with. */
  status: number;
  /** The sentence saying what the request came to, written from the status and nothing else. */
  detail: string;
};

/**
 * The last error a binding answered with, standing on the cable that carried it.
 *
 * @summary Reach for it on a failed cable, where a person has seen the colour and now wants the
 * reason. It says only that an error stands until it is asked, because a sentence printed over
 * every failed cable would bury the canvas it explains. Pressing it again or Esc puts it away,
 * so reading an error costs a person nothing and leaves the composition where they left it.
 */
export function CableFailureChip({ status, detail }: CableFailureChipProps) {
  const [shown, setShown] = useState(false);
  const readingId = useId();

  return (
    <span className="relative inline-flex">
      <button
        aria-controls={readingId}
        aria-expanded={shown}
        className="inline-flex h-chip items-center rounded-chip border border-cable-failed bg-surface-card px-1.5 text-caption font-medium text-danger-ink focus-ring"
        onClick={() => {
          setShown((was) => !was);
        }}
        onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
          if (event.key === 'Escape' && shown) {
            event.stopPropagation();
            setShown(false);
          }
        }}
        type="button"
      >
        Last error
      </button>
      <span
        className="absolute inset-s-0 top-full z-10 mt-1 block w-56 menu-surface px-3 text-start"
        hidden={!shown}
        id={readingId}
      >
        <span className="block text-mono-caption text-ink-secondary">Status {status}</span>
        <span className="mt-0.5 block text-detail text-ink">{detail}</span>
      </span>
    </span>
  );
}
