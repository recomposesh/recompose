import type { Ref } from 'react';

import { Field } from '@base-ui/react/field';
import { useRef } from 'react';

type FieldBoxRowProps = {
  /** Name of the field, leading its row and carried as the control's accessible name. */
  label: string;
  /** Controlled value of the control. */
  value: string;
  /** Standing hint inside an empty control, which never replaces the label. */
  placeholder?: string | undefined;
  /** Switches masking for secret entry. */
  type?: 'password' | 'text' | undefined;
  /** Receives every keystroke, which also clears any refusal standing under the field. */
  onChangeValue: (value: string) => void;
  /**
   * Receives the value when the person settles it, on Enter and on leaving the field, once per
   * value rather than once per act, so Enter followed by a blur settles the same value only once.
   */
  onCommitValue?: ((value: string) => void) | undefined;
  /** Sentence explaining why the last save refused this field. */
  refusal?: string | undefined;
  /** Width and family classes for the control, which sibling fields do not share. */
  controlClasses: string;
  /**
   * Stands the label over the control rather than beside it.
   *
   * @summary Reach for it where the value is longer than the room left beside its own label, so the
   * control takes the row's full width and the value reads whole instead of through a slot.
   */
  stacked?: boolean | undefined;
  /** Reaches the input itself, so the sheet can land opening focus on this row. */
  ref?: Ref<HTMLInputElement> | undefined;
};

/**
 * How the row lays its label and its control out, which is the one thing stacking changes.
 *
 * @summary A row beside its label hands the control the trailing edge, and a stacked row hands it
 * the whole width, so the marker the style reads and the control's own classes settle together.
 */
function layoutOf(stacked: boolean, controlClasses: string) {
  return {
    control: `sheet-field placeholder:text-ink-tertiary ${stacked ? '' : 'ms-auto'} ${controlClasses}`,
    marker: stacked ? '' : undefined,
  };
}

/** One labelled row of a field box, carrying its own refusal under the field it refuses. */
export function FieldBoxRow({
  label,
  value,
  placeholder,
  type = 'text',
  onChangeValue,
  onCommitValue,
  refusal,
  controlClasses,
  stacked,
  ref,
}: FieldBoxRowProps) {
  const lastSettled = useRef(value);
  const layout = layoutOf(stacked === true, controlClasses);

  const settle = (typed: string) => {
    if (typed === lastSettled.current) {
      return;
    }

    lastSettled.current = typed;
    onCommitValue?.(typed);
  };

  return (
    <Field.Root className="field-box-row" data-stacked={layout.marker}>
      <Field.Label>{label}</Field.Label>
      <Field.Control
        className={layout.control}
        onBlur={(event) => {
          settle(event.currentTarget.value);
        }}
        onChange={(event) => {
          onChangeValue(event.currentTarget.value);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            settle(event.currentTarget.value);
          }
        }}
        placeholder={placeholder}
        ref={ref}
        type={type}
        value={value}
      />
      {refusal === undefined ? null : (
        <Field.Error className="w-full text-caption text-danger-ink" match role="alert">
          {refusal}
        </Field.Error>
      )}
    </Field.Root>
  );
}
