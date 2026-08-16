import { SheetActionSlot } from '../../../../shared/ui';

type SignInActionProps = {
  /** The provider the plan belongs to, which is what the act names rather than the tool. */
  name: string;
  /** Stands the act inert where nothing on the machine can carry a sign-in out. */
  disabled?: boolean;
  /** Reaches for the sign-in the provider's own tool owns. */
  onSignIn?: (() => void) | undefined;
  /** Names what the act is held back by, for a screen reader reaching the disabled button. */
  reasonId?: string | undefined;
};

/**
 * The sheet's own act for handing a sign-in to the provider's tool.
 *
 * @summary Reach for it where the machine holds nothing, because then the sign-in is the only way
 * in and belongs on the sheet's foot beside Cancel. Where the machine already holds an account the
 * step offers two ways instead, and neither of them rides the foot.
 */
export function SignInAction({ name, disabled = false, onSignIn, reasonId }: SignInActionProps) {
  return (
    <SheetActionSlot>
      <button
        aria-describedby={reasonId}
        className="push-button-primary focus-ring"
        disabled={disabled}
        onClick={onSignIn}
        type="button"
      >
        Sign in to {name}
      </button>
    </SheetActionSlot>
  );
}
