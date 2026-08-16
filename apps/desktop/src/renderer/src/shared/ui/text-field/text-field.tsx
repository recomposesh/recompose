import { Field } from '@base-ui/react/field';

type TextFieldProps = {
  /** Accessible name of the field. Whatever shows it visibly must repeat this string. */
  label: string;
  /** Controlled input value. */
  value: string;
  /** Standing hint inside an empty field, which never replaces the label. */
  placeholder?: string;
  /** Switches masking for secret entry. */
  type?: 'password' | 'text';
  /** Receives the raw input value on every keystroke. */
  onChangeValue: (value: string) => void;
  /** Marks a field whose machinery is missing, keeping it reachable but unmovable. */
  inert?: boolean;
  /** Stretches the field across whatever holds it, the way a column heading a list does. */
  fullWidth?: boolean;
};

function stretchedBy(fullWidth: boolean): string {
  return fullWidth ? 'w-full' : '';
}

/**
 * Labeled single-line text entry that reports every keystroke.
 *
 * @summary Reach for it when a draft belongs to the form rather than to storage.
 */
export function TextField({
  label,
  value,
  placeholder,
  type = 'text',
  onChangeValue,
  inert = false,
  fullWidth = false,
}: TextFieldProps) {
  const stretch = stretchedBy(fullWidth);

  return (
    <Field.Root className={stretch}>
      <Field.Control
        aria-disabled={inert || undefined}
        aria-label={label}
        className={`field-control placeholder:text-ink-tertiary aria-disabled:bg-surface-inert ${stretch}`}
        onChange={(event) => {
          onChangeValue(event.currentTarget.value);
        }}
        placeholder={placeholder}
        readOnly={inert}
        type={type}
        value={value}
      />
    </Field.Root>
  );
}
