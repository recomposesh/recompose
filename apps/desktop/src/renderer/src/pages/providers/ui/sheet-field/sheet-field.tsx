import { FieldBoxRow } from '../../../../shared/ui';

type SheetFieldProps = {
  /** What the row asks for, which is also the name a screen reader announces it by. */
  label: string;
  value: string;
  onChangeValue: (value: string) => void;
  placeholder?: string | undefined;
  /** Passed only where the value is a secret, so the control hides what it holds. */
  type?: 'password';
  /**
   * Stands the label over the control rather than beside it.
   *
   * @summary Reach for it on a form whose longest value is an address rather than a word: a slot
   * beside the label leaves an address unreadable, and one stacked row makes every sibling stack.
   */
  stacked?: boolean;
};

/**
 * One field inside a connect step, at the width every connect step's controls share.
 *
 * @summary Reach for it for any row inside a sheet's field box. The width is a fact about the
 * sheet rather than about the field, so it stands here once instead of beside every label a
 * connect step asks for.
 */
export function SheetField({
  label,
  value,
  onChangeValue,
  placeholder,
  type,
  stacked,
}: SheetFieldProps) {
  const controlClasses = stacked === true ? 'w-full' : 'w-sheet-secret';

  if (type === 'password') {
    return (
      <FieldBoxRow
        controlClasses={controlClasses}
        label={label}
        onChangeValue={onChangeValue}
        placeholder={placeholder}
        stacked={stacked}
        type="password"
        value={value}
      />
    );
  }

  return (
    <FieldBoxRow
      controlClasses={controlClasses}
      label={label}
      onChangeValue={onChangeValue}
      placeholder={placeholder}
      stacked={stacked}
      value={value}
    />
  );
}
