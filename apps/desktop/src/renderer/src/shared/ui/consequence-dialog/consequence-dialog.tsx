import type { ReactNode } from 'react';

import { useId } from 'react';

type ConsequenceDialogProps = {
  /** Whether a change waits on the person's word. */
  open: boolean;
  /** The question the dialog stands on. */
  heading: string;
  /** The cost the change carries, worth naming before it applies. */
  children: ReactNode;
  /** The act's own words, never a bare yes. */
  confirmLabel: string;
  /** Called when the person keeps things as they stand. */
  onCancel: () => void;
  /** Called once the person accepts the cost. */
  onConfirm: () => void;
};

/**
 * The dialog standing between a change and the cost it carries.
 *
 * @summary Reach for it wherever a saved change interrupts or destroys something: the body names
 * the cost, the confirming act names itself, and the change holds until the person answers.
 */
export function ConsequenceDialog({
  open,
  heading,
  children,
  confirmLabel,
  onCancel,
  onConfirm,
}: ConsequenceDialogProps) {
  const headingId = useId();

  if (!open) {
    return null;
  }

  return (
    <dialog
      aria-labelledby={headingId}
      className="m-auto w-96 menu-surface p-4"
      onCancel={onCancel}
      ref={(dialog) => {
        if (dialog !== null && !dialog.open) {
          dialog.showModal();
        }
      }}
    >
      <h3 className="text-heading text-ink" id={headingId}>
        {heading}
      </h3>
      <p className="mt-1 text-detail text-ink-secondary">{children}</p>
      <div className="mt-4 flex justify-end gap-2">
        <button className="push-button" onClick={onCancel} type="button">
          Cancel
        </button>
        <button className="push-button-primary" onClick={onConfirm} type="button">
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
