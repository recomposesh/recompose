import { useEffect, useRef, useState } from 'react';

import { ConfettiBurst, Icon } from '../../../../shared/ui';

const TITLE = 'That was the whole setup';

const BODY = 'Everything you just built is on this canvas, live.';

const NEXT = 'Drag a cable off the gateway to add another model whenever you want one.';

/** How long the note stands before it takes itself away. */
const NOTE_MS = 5000;

const NOTE =
  'pointer-events-auto absolute inset-s-1/2 bottom-8 flex w-105 -translate-x-1/2 flex-col gap-1.25 ' +
  'rounded-panel border border-running/22 bg-surface-card/92 px-3.75 pt-3.25 pb-3.5 shadow-raised ' +
  'backdrop-blur';

type ServedNoteProps = {
  /** The harness whose request landed, where setup knows which one it was. */
  harness: string | undefined;
  /** Takes the note away. */
  onDismiss: () => void;
};

function bodyFor(harness: string | undefined): string {
  return harness === undefined ? BODY : `${harness} asked, and your plan answered. ${BODY}`;
}

/**
 * The note takes itself away once it has been read.
 *
 * @summary It carries no control of its own, so the clock is the only way out and the canvas
 * behind it is what a person is meant to be looking at. The clock holds while a pointer rests on
 * the note, because a line somebody is still reading must not leave mid-sentence.
 */
function useNoteClock(onDismiss: () => void): { hold: () => void; release: () => void } {
  const [held, setHeld] = useState(false);
  const away = useRef(onDismiss);

  away.current = onDismiss;

  useEffect(() => {
    if (held) {
      return undefined;
    }

    const timer = setTimeout(() => {
      away.current();
    }, NOTE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [held]);

  return {
    hold: () => {
      setHeld(true);
    },
    release: () => {
      setHeld(false);
    },
  };
}

/**
 * The note that meets a person on the canvas the moment their first request lands.
 *
 * @summary It stands on the canvas rather than over it: setup is finished, and one more surface
 * holding the window would undo the thing this note is celebrating. It says what happened rather
 * than congratulating, because the graph behind it is the point and the note is only the caption.
 * The last line says what to do next on that graph, which is the one thing setup never showed.
 *
 * The burst is the one piece that does congratulate, and it falls across the whole window rather
 * than inside the note, because what a person just finished is everything on the screen behind it.
 *
 * It is a status rather than a region, because it leaves on a clock. A landmark that disappears
 * would leave a reader navigating to something no longer there.
 */
export function ServedNote({ harness, onDismiss }: ServedNoteProps) {
  const clock = useNoteClock(onDismiss);

  return (
    <>
      <ConfettiBurst spread="window" />
      <div
        aria-labelledby="served-note-title"
        className={NOTE}
        onMouseEnter={() => {
          clock.hold();
        }}
        onMouseLeave={() => {
          clock.release();
        }}
        role="status"
      >
        <span className="flex items-center gap-2">
          <Icon className="size-3.5 text-running" name="checkRing" />
          <h2 className="text-card-title text-ink" id="served-note-title">
            {TITLE}
          </h2>
        </span>
        <p className="text-detail text-ink-secondary">{bodyFor(harness)}</p>
        <p className="text-detail text-ink-secondary">{NEXT}</p>
      </div>
    </>
  );
}
