import { SheetActionSlot } from '../../../../shared/ui';

type SignInPressProps = {
  /** What the press offers while nothing is waiting on the far end. */
  label: string;
  /** The plan being waited on, named so the wait says whose it is. */
  waitingOn: string;
  /** Whether the far end has been asked and has yet to answer. */
  pending: boolean;
  /** Starts the wait, which is the one thing a press here ever does. */
  onPress: () => void;
};

/**
 * The one press a sign-in this app runs itself offers.
 *
 * @summary It reads as the wait rather than as the act while the far end has yet to answer, which
 * is the only thing telling a person the press landed: nothing else on the step moves until the
 * account is stored.
 */
export function SignInPress({ label, waitingOn, pending, onPress }: SignInPressProps) {
  return (
    <SheetActionSlot>
      <button className="push-button-primary focus-ring-wide" onClick={onPress} type="button">
        {pending ? `Waiting for ${waitingOn}` : label}
      </button>
    </SheetActionSlot>
  );
}
