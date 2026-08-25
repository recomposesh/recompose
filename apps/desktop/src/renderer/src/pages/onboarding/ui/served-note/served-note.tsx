import { Button, ConfettiBurst } from '../../../../shared/ui';

const TITLE = 'That was the whole setup';

const BODY =
  'Everything you just built is on this canvas, live. Rearrange it any time, and your harnesses never notice.';

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
 * The note that meets a person on the canvas the moment their first request lands.
 *
 * @summary It stands on the canvas rather than over it: setup is finished, and one more surface
 * holding the window would undo the thing this note is celebrating. It says what happened rather
 * than congratulating, because the graph behind it is the point and the note is only the caption.
 * The burst is the one piece that does congratulate, and it lasts about a second, which is as long
 * as a first request is worth marking.
 */
export function ServedNote({ harness, onDismiss }: ServedNoteProps) {
  return (
    <aside
      className="pointer-events-auto absolute inset-s-1/2 bottom-8 flex w-105 -translate-x-1/2 flex-col gap-2 rounded-panel border border-line-subtle bg-surface-card/92 p-3.5 shadow-raised backdrop-blur"
      aria-labelledby="served-note-title"
    >
      <ConfettiBurst />
      <h2 className="relative text-card-title text-ink" id="served-note-title">
        {TITLE}
      </h2>
      <p className="text-detail text-ink-secondary">{bodyFor(harness)}</p>
      <span className="flex justify-end">
        <Button onPress={onDismiss}>Got it</Button>
      </span>
    </aside>
  );
}
