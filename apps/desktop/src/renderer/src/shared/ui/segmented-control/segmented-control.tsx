import { Radio } from '@base-ui/react/radio';
import { RadioGroup } from '@base-ui/react/radio-group';
import { useId } from 'react';

const roleInks = {
  'virtual-model': 'text-virtual-model-ink',
} as const;

const optionInks = {
  positive: 'text-running-ink',
  danger: 'text-danger-ink',
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
  /** Semantic ink the option's text carries in every selection state. */
  tone?: keyof typeof optionInks | undefined;
  /**
   * Why this one segment cannot be pressed, keeping it reachable but unmovable.
   *
   * @summary Reach for it where one choice outruns what the machinery holds, like a range wider
   * than the retention window. The reason reads as the segment's accessible description.
   */
  inertReason?: string | undefined;
};

type AnyOption = SegmentedControlOption<string>;

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

function inertDescriptionId(segmentId: string, option: AnyOption): string | undefined {
  return option.inertReason === undefined ? undefined : `${segmentId}-${option.value}-inert`;
}

function segmentClass(option: AnyOption): string {
  const ink = option.tone === undefined ? 'text-ink' : optionInks[option.tone];
  const held = option.inertReason === undefined ? '' : 'text-ink-secondary opacity-60';

  return `flex h-chip items-center rounded-chip focus-ring px-2 text-detail data-checked:chip-selected ${ink} ${held}`;
}

function segmentMark(option: AnyOption) {
  if (option.tint === undefined) {
    return null;
  }

  return (
    <span
      aria-hidden
      className={`me-1.5 size-1.5 shrink-0 rounded-pill bg-current ${roleInks[option.tint]}`}
    />
  );
}

function inertReasonReading(segmentId: string, option: AnyOption) {
  if (option.inertReason === undefined) {
    return null;
  }

  return (
    <span className="sr-only" id={inertDescriptionId(segmentId, option)}>
      {option.inertReason}
    </span>
  );
}

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
        if (
          inert ||
          options.some((option) => option.value === next && option.inertReason !== undefined)
        ) {
          return;
        }

        onChangeValue(next);
      }}
      value={value}
    >
      {options.map((option) => (
        <Radio.Root
          aria-describedby={inertDescriptionId(segmentId, option)}
          aria-disabled={option.inertReason === undefined ? undefined : true}
          aria-labelledby={`${segmentId}-${option.value}`}
          className={segmentClass(option)}
          key={option.value}
          value={option.value}
        >
          {segmentMark(option)}
          <span id={`${segmentId}-${option.value}`}>{option.label}</span>
          {inertReasonReading(segmentId, option)}
        </Radio.Root>
      ))}
    </RadioGroup>
  );
}
