import { Button, Icon } from '../../../../shared/ui';

const AWAY_WITH_THE_REASON = '@max-[36rem]:hidden';

type StoppedAnsweringNoteProps = {
  /** The name the gateway carries everywhere else, so the notice names what a person is looking at. */
  gateway: string;
  /** Stands the gateway back up, which is the whole of what this notice offers. */
  onStartAgain: () => void;
  /** Puts the notice away for a person who has read it and means to leave the gateway down. */
  onPutAway: () => void;
};

/**
 * The strip saying a gateway stopped answering with nothing on screen having asked it to.
 *
 * @summary Reach for it from the gateway page and nowhere else. It stands in the canvas column
 * between the stage and the strip below it, never over either: a save that left the gateway down
 * is read a moment after the person edited a card, and a surface floating over the composition
 * would cover the very card they are about to press again. Taking its own band pushes the stage up
 * instead, which moves the composition rather than hiding any of it.
 *
 * It says what happened rather than what caused it, because the window cannot tell a restart that
 * never came back up from an engine that died, and both leave the same thing true: requests are
 * being refused and nothing else on screen explains it. A gateway a person stopped themselves
 * never reaches here, so the notice never explains a decision back to whoever made it.
 *
 * Start again is the only act it offers, because starting is the one thing that ends the silence.
 * Putting it away is not that act: it leaves the gateway down and only agrees to stop saying so,
 * which is why it reads as a dismissal rather than as an answer.
 */
export function StoppedAnsweringNote({
  gateway,
  onStartAgain,
  onPutAway,
}: StoppedAnsweringNoteProps) {
  return (
    <div
      aria-label="Gateway stopped answering"
      className="@container flex shrink-0 items-center gap-3 border-t border-attention/40 bg-attention/10 px-3.5 py-2"
      role="status"
    >
      <Icon className="size-4 shrink-0 text-attention-ink" name="stop" />
      <p className="min-w-0 flex-1 truncate text-detail text-ink">
        <b className="font-medium">{`${gateway} stopped answering`}</b>
        <span className={AWAY_WITH_THE_REASON}>
          {' Nothing here asked it to stop, so requests are being refused.'}
        </span>
      </p>
      <Button glyph="play" onPress={onStartAgain}>
        Start again
      </Button>
      <Button aria-label="Dismiss" glyph="close" onPress={onPutAway} variant="icon-secondary" />
    </div>
  );
}
