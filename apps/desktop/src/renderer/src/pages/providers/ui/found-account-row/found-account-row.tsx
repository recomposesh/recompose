import { PickRow } from '../pick-row/pick-row';

type FoundAccountRowProps = {
  /** @summary The address the provider's own tool signs in as, when its records name one. */
  signedInAs?: string | undefined;
  /** @summary The plan the account holds, when its records name one. */
  plan?: string | undefined;
  /** @summary The tool that wrote this credential, named so the person knows where it came from. */
  toolName: string;
  /** @summary How the credential stands, so a lapse reads before a person tries to connect it. */
  standing: 'connected' | 'lapsed';
  /** @summary Stands inert while any act on the step runs, so the sheet never resizes under a hand. */
  inert: boolean;
  /** @summary True while this row's own act runs, which is what the row's quiet line reports. */
  connecting: boolean;
  onConnect: () => void;
};

function initialOf(name: string): string {
  return name.slice(0, 1).toUpperCase();
}

function standingReads(standing: 'connected' | 'lapsed', toolName: string): string {
  return standing === 'lapsed'
    ? `Signed out in ${toolName}`
    : `Already signed in through ${toolName}`;
}

/**
 * The account this machine already holds, stated as the answer rather than offered as a blank.
 *
 * @summary The whole row is the act, because the step offers exactly two ways to one end and a
 * button inside one of them would rank that way over the other. The disc carries the initial the
 * address opens with, so the row is found by shape before it is read.
 */
export function FoundAccountRow({
  signedInAs,
  plan,
  toolName,
  standing,
  inert,
  connecting,
  onConnect,
}: FoundAccountRowProps) {
  const who = signedInAs ?? toolName;

  return (
    <PickRow
      badge={plan}
      disabled={inert}
      label={`Connect ${who}`}
      lead={
        <span className="flex size-6 items-center justify-center rounded-pill border border-line-subtle bg-surface-inert text-detail font-semibold text-ink-secondary">
          {initialOf(who)}
        </span>
      }
      onPick={onConnect}
      title={who}
      under={connecting ? 'Connecting' : standingReads(standing, toolName)}
    />
  );
}
