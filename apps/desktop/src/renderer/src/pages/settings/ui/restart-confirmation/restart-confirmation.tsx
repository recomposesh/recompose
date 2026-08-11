import { useId } from 'react';

type RestartConfirmationProps = {
  /** The bind address awaiting the person's word, or nothing while no change waits. */
  address: string | undefined;
  /** How many gateways are serving right now, which the change would restart. */
  running: number;
  /** Called when the person keeps the stored address instead. */
  onCancel: () => void;
  /** Receives the address once the person accepts the restart it costs. */
  onConfirm: (address: string) => void;
};

/**
 * The dialog standing between a bind-address change and the gateways it restarts.
 *
 * @summary Reach for it when a saved change interrupts something running: it says what the change
 * restarts and hands the address back only after the person accepts that cost.
 */
export function RestartConfirmation({
  address,
  running,
  onCancel,
  onConfirm,
}: RestartConfirmationProps) {
  const headingId = useId();

  if (address === undefined) {
    return null;
  }

  const gateways = running === 1 ? '1 running gateway' : `${String(running)} running gateways`;

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
        Restart running gateways?
      </h3>
      <p className="mt-1 text-detail text-ink-secondary">
        Changing the bind address to {address} restarts {gateways}.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <button className="push-button" onClick={onCancel} type="button">
          Cancel
        </button>
        <button
          className="push-button-primary"
          onClick={() => {
            onConfirm(address);
          }}
          type="button"
        >
          Restart gateways
        </button>
      </div>
    </dialog>
  );
}
