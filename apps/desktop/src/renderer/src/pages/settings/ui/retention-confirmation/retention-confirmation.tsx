import type { UsageRetentionDays } from '@recompose/contracts';

import { ConsequenceDialog } from '../../../../shared/ui';

type RetentionConfirmationProps = {
  /** The shorter window awaiting the person's word, or nothing while no change waits. */
  days: UsageRetentionDays | undefined;
  /** Called when the person keeps the standing window instead. */
  onCancel: () => void;
  /** Receives the window once the person accepts the history it drops. */
  onConfirm: (days: UsageRetentionDays) => void;
};

/**
 * The dialog standing between a shorter retention window and the history it drops.
 *
 * @summary Shortening prunes with no way back, so the change holds until the person accepts that
 * cost. Widening never reaches here.
 */
export function RetentionConfirmation({ days, onCancel, onConfirm }: RetentionConfirmationProps) {
  if (days === undefined) {
    return null;
  }

  return (
    <ConsequenceDialog
      confirmLabel="Delete history"
      heading="Delete older usage history?"
      onCancel={onCancel}
      onConfirm={() => {
        onConfirm(days);
      }}
      open
    >
      Usage older than {String(days)} days is deleted permanently and cannot be recovered.
    </ConsequenceDialog>
  );
}
