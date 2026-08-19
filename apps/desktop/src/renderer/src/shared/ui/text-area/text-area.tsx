import { Field } from '@base-ui/react/field';

type TextAreaProps = {
  /** Accessible name. Whatever heads the field visibly must repeat this string exactly. */
  label: string;
  /** Controlled text, newlines and all. */
  value: string;
  /** Standing hint inside an empty box, which never stands in for the name above it. */
  placeholder?: string;
  /** Receives the whole text on every keystroke. */
  onChangeValue: (value: string) => void;
  /** Marks prose a person may read but not rewrite, keeping the box reachable and selectable. */
  inert?: boolean;
  /**
   * How many lines it stands at before it scrolls.
   *
   * @summary Reach past the default only where the text a person writes is longer than a sentence
   * or two. The field never grows past this on its own, because a box that pushes the save button
   * off the surface while someone types is worse than one they scroll.
   */
  rows?: number;
};

const CONTROL =
  'w-full resize-y rounded-control border border-line-field bg-surface-card px-2.5 py-1.5 text-control leading-normal text-ink placeholder:text-ink-tertiary focus-ring-wide aria-disabled:bg-surface-inert';

/**
 * Labeled multiline text entry that reports every keystroke.
 *
 * @summary Reach for it where the value is prose a person composes rather than a name they type:
 * a branch rule, a note, anything that reads in sentences. Anything that fits on one line belongs
 * in `TextField`, which fixes its own height and cannot be dragged taller.
 */
export function TextArea({
  label,
  value,
  placeholder,
  onChangeValue,
  inert = false,
  rows = 4,
}: TextAreaProps) {
  return (
    <Field.Root className="w-full">
      <Field.Control
        aria-disabled={inert || undefined}
        aria-label={label}
        className={CONTROL}
        onChange={(event) => {
          onChangeValue(event.currentTarget.value);
        }}
        placeholder={placeholder}
        readOnly={inert}
        render={<textarea rows={rows} />}
        value={value}
      />
    </Field.Root>
  );
}
