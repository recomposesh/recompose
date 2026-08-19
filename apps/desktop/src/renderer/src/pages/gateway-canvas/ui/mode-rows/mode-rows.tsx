import { Radio } from '@base-ui/react/radio';
import { RadioGroup } from '@base-ui/react/radio-group';
import { useId } from 'react';

import type { RouterMode } from '../../lib/routing-edits';

import { modeOptions, modeSentences } from '../../lib/router-modes';

export type ModeRowsProps = {
  /**
   * How the router spreads as it stands, or nothing while no row is chosen yet.
   *
   * @summary Nothing leaves every row resting, which is what the step that asks the question opens
   * on: a preselected row would answer for the person and store a mode nobody picked.
   */
  value: RouterMode | undefined;
  /** Receives the mode the person landed on. */
  onChangeValue: (mode: RouterMode) => void;
  /**
   * Why a mode cannot be picked on this surface, keyed by the mode it holds shut.
   *
   * @summary Reach for it where one mode needs something the surface cannot supply, like a router
   * holding no child to branch on. The reason reads under the row's own sentence, so the row stays
   * reachable and says what it would take rather than going missing without a word.
   */
  inertReasons?: Partial<Record<RouterMode, string>> | undefined;
};

const ROW_FACE =
  'flex w-full flex-col items-start gap-0.5 rounded-control border border-line-faint px-2.5 py-2 text-start focus-ring data-checked:border-line-selected data-checked:bg-surface-selected';

function rowClass(inert: boolean): string {
  return inert ? `${ROW_FACE} opacity-60` : `${ROW_FACE} row-hover`;
}

function nameClass(inert: boolean): string {
  return inert
    ? 'text-control text-ink-secondary'
    : 'text-control text-ink group-data-checked:font-medium';
}

/**
 * One mode, read as the word it answers to over the cost of standing in it.
 *
 * @summary The name carries the accessible name alone and the sentence rides the description, so a
 * screen reader announces the choice before its reasoning rather than reading a paragraph as the
 * option's own title. A row a surface cannot write says why in its own visible line and in that
 * same description, so the reason lands on a person who reads the panel and on one who hears it,
 * rather than on a row that only its control knows is shut.
 */
function modeRow(
  rowId: string,
  option: { value: RouterMode; label: string },
  inertReason: string | undefined,
) {
  const inert = inertReason !== undefined;

  return (
    <Radio.Root
      aria-describedby={`${rowId}-${option.value}-why`}
      aria-labelledby={`${rowId}-${option.value}`}
      className={`group ${rowClass(inert)}`}
      disabled={inert}
      key={option.value}
      value={option.value}
    >
      <span className={nameClass(inert)} id={`${rowId}-${option.value}`}>
        {option.label}
      </span>
      <span className="text-detail text-ink-secondary" id={`${rowId}-${option.value}-why`}>
        {modeSentences[option.value]}
        {inert ? <span className="mt-1 block text-ink-tertiary">{inertReason}</span> : null}
      </span>
    </Radio.Root>
  );
}

/**
 * How a router spreads, offered as a stack of rows that each carry the cost of choosing them.
 *
 * @summary One list, read the same way by the drawer composing a router and the inspector editing
 * one, so a person who chose on one surface and returns on the other is reading their own reason.
 * The rows stack rather than sitting side by side because three mode names outgrow the narrowest
 * panel, and because a sentence per mode has nowhere to stand in a strip: the cost then reads at
 * the point of choice rather than under a control a person has already moved. A fourth mode joins
 * the stack without a layout fight.
 */
export function ModeRows({ value, onChangeValue, inertReasons }: ModeRowsProps) {
  const rowId = useId();

  return (
    <RadioGroup<RouterMode | null>
      aria-label="Routing mode"
      className="flex w-full flex-col gap-1"
      onValueChange={(next) => {
        if (next !== null) {
          onChangeValue(next);
        }
      }}
      value={value ?? null}
    >
      {modeOptions.map((option) => modeRow(rowId, option, inertReasons?.[option.value]))}
    </RadioGroup>
  );
}
