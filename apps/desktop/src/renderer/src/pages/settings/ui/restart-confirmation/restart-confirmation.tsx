import { ConsequenceDialog } from '../../../../shared/ui';

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
  if (address === undefined) {
    return null;
  }

  const gateways = running === 1 ? '1 running gateway' : `${String(running)} running gateways`;

  return (
    <ConsequenceDialog
      confirmLabel="Restart gateways"
      heading="Restart running gateways?"
      onCancel={onCancel}
      onConfirm={() => {
        onConfirm(address);
      }}
      open
    >
      Changing the bind address to {address} restarts {gateways}.
    </ConsequenceDialog>
  );
}
