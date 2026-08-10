import { Radio } from '@base-ui/react/radio';
import { RadioGroup } from '@base-ui/react/radio-group';
import { useId } from 'react';

const roleInks = {
  'virtual-model': 'text-virtual-model-ink',
  target: 'text-target-ink',
} as const;

type SegmentedControlOption<Value extends string> = {
  /** Value committed when this segment wins. */
  value: Value;
  /** Text the segment shows and answers to. */
  label: string;
  /**
   * Which role the segment stands for, drawn as a leading mark in that role's ink.
   *
   * @summary Reach for it where the segments name things a person also meets on another surface,
   * so the strip and that surface read as one set. Leave it off wherever the labels stand for
   * nothing but themselves.
   */
  tint?: keyof typeof roleInks | undefined;
};

type SegmentedControlProps<Value extends string> = {
  /** Accessible name of the whole choice. */
  label: string;
  /** Controlled selection. */
  value: Value;
  /** The mutually exclusive choices, in reading order. */
  options: readonly SegmentedControlOption<Value>[];
  /** Receives the choice the person landed on. */
  onChangeValue: (value: Value) => void;
  /** Marks a choice whose machinery is missing, keeping it reachable but unmovable. */
  inert?: boolean;
};

/**
 * One of a few mutually exclusive choices, laid out side by side.
 *
 * @summary Reach for it over a select when the options are few and worth reading at a glance.
 */
export function SegmentedControl<Value extends string>({
  label,
  value,
  options,
  onChangeValue,
  inert = false,
}: SegmentedControlProps<Value>) {
  const segmentId = useId();

  return (
    <RadioGroup
      aria-disabled={inert || undefined}
      aria-label={label}
      className="inline-flex h-segment items-center gap-hairline rounded-control bg-surface-track p-hairline aria-disabled:bg-surface-inert"
      onValueChange={(next) => {
        if (inert) {
          return;
        }

        onChangeValue(next);
      }}
      value={value}
    >
      {options.map((option) => (
        <Radio.Root
          aria-labelledby={`${segmentId}-${option.value}`}
          className="flex h-chip items-center rounded-chip px-2 text-detail text-ink focus-ring row-hover data-checked:chip-selected"
          key={option.value}
          value={option.value}
        >
          {option.tint === undefined ? null : (
            <span
              aria-hidden
              className={`me-1.5 size-1.5 shrink-0 rounded-pill bg-current ${roleInks[option.tint]}`}
            />
          )}
          <span id={`${segmentId}-${option.value}`}>{option.label}</span>
        </Radio.Root>
      ))}
    </RadioGroup>
  );
}
