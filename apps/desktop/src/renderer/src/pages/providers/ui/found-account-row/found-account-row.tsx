import { Badge } from '../../../../shared/ui';

type FoundAccountRowProps = {
  /** @summary The address the provider's own tool signs in as, when its records name one. */
  signedInAs?: string | undefined;
  /** @summary The plan the account holds, when its records name one. */
  plan?: string | undefined;
  /** @summary The tool that wrote this credential, named so the person knows where it came from. */
  toolName: string;
  /** @summary Stands inert while any act on the step runs, so the sheet never resizes under a hand. */
  inert: boolean;
  /** @summary True while this row's own act runs, which is what the label reports. */
  connecting: boolean;
  onConnect: () => void;
};

/**
 * The account this machine already holds, stated as the answer rather than offered as a blank.
 *
 * @summary The act sits in the row rather than the sheet's foot, because the foot already holds
 * Cancel and the theme carries two button weights. Position carries the third level.
 */
export function FoundAccountRow({
  signedInAs,
  plan,
  toolName,
  inert,
  connecting,
  onConnect,
}: FoundAccountRowProps) {
  return (
    <div className="flex min-h-row w-full items-center gap-3 rounded-card border border-line-subtle bg-surface-card px-4 py-2.5 text-start">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-body text-ink">{signedInAs ?? toolName}</span>
          {plan === undefined ? null : <Badge>{plan}</Badge>}
        </span>
        <span className="text-detail text-ink-secondary">Already signed in through {toolName}</span>
      </div>
      <button
        className="push-button-primary focus-ring disabled:bg-surface-inert disabled:text-ink-secondary"
        disabled={inert}
        onClick={onConnect}
        type="button"
      >
        {connecting ? 'Connecting' : 'Connect'}
      </button>
    </div>
  );
}
