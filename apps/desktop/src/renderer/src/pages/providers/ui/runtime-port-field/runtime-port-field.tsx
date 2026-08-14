import type { ReactElement } from 'react';

import type { PortForm } from '../../model/runtime-port';

import { FieldBoxRow } from '../../../../shared/ui';
import { portRefusal } from '../../model/runtime-port';

/** A landing nobody is watching for, which is what a surface reading the draft itself wants. */
const NOTHING_LANDS = (): void => undefined;

type RuntimePortFieldProps = {
  /** The draft the port is typed into. */
  form: PortForm;
  /**
   * @summary Called when a port lands, on Enter or on leaving the field. The dialog leaves it
   * out, because its Move button reads the draft rather than watching for a landing.
   */
  onCommitValue?: (settled: string) => void;
};

/**
 * The one knob a local server needs, wherever it is asked for.
 *
 * @summary The step that adds a runtime and the dialog that moves one ask for the same thing under
 * the same rule, so they ask through one field rather than two that could drift. It is
 * right-aligned and monospaced, because a port is read as a number rather than as a word.
 */
export function RuntimePortField({
  form,
  onCommitValue = NOTHING_LANDS,
}: RuntimePortFieldProps): ReactElement {
  return (
    <form.Field name="port" validators={{ onChange: (draft) => portRefusal(draft.value) }}>
      {(field) => (
        <FieldBoxRow
          controlClasses="w-sheet-port text-end font-mono"
          label="Port"
          onChangeValue={field.handleChange}
          refusal={field.state.meta.errors[0]}
          onCommitValue={onCommitValue}
          value={field.state.value}
        />
      )}
    </form.Field>
  );
}
