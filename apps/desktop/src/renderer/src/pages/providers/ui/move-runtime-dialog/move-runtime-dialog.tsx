import { useSelector } from '@tanstack/react-form';

import { ConsequenceDialog } from '../../../../shared/ui';
import { portRefusal, usePortForm } from '../../model/runtime-port';
import { RuntimePortField } from '../runtime-port-field/runtime-port-field';

type MoveRuntimeDialogProps = {
  /** Whether the move waits on the person's word. */
  open: boolean;
  /** The runtime being moved, named so the dialog says whose port it is asking for. */
  name: string;
  /** Where the row answers today, which is what the field opens on. */
  address: string;
  /** Called when the person leaves the row where it stands. */
  onCancel: () => void;
  /** Called with the port the person settled on. */
  onMove: (port: number) => void;
};

function portIn(address: string): string {
  return URL.canParse(address) ? new URL(address).port : '';
}

/**
 * The one knob a moved server needs.
 *
 * @summary A server's port is where it answers today rather than a fact about the row, so moving
 * it keeps the row, its name, and everything pointed at it. The field opens on the port the row
 * answers at now, because a move is almost always a small edit to a number a person already knows.
 *
 * Only the port is asked for. The host stays loopback, minted by main the same way an add mints
 * it, so no stored row can ever name anything but this machine.
 */
export function MoveRuntimeDialog({
  open,
  name,
  address,
  onCancel,
  onMove,
}: MoveRuntimeDialogProps) {
  const form = usePortForm(portIn(address));
  const settled = useSelector(form.store, (state) => portRefusal(state.values.port) === undefined);

  return (
    <ConsequenceDialog
      confirmLabel="Move"
      heading={`Move ${name}`}
      onCancel={onCancel}
      onConfirm={() => {
        if (settled) {
          onMove(Number(form.state.values.port));
        }
      }}
      open={open}
    >
      <p>Point {name} at the port it answers on now. Nothing else about the row changes.</p>
      <div className="mt-3 w-full field-box text-start">
        <RuntimePortField form={form} />
      </div>
    </ConsequenceDialog>
  );
}
