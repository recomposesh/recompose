import { nameOfRouterMode } from '@recompose/contracts';

import type { SpreadingMode } from '../../lib/routing-edits';

import { SegmentedControl } from '../../../../shared/ui';
import { modeOptions, modeSentences } from '../../lib/router-modes';

const NEXT_STEP =
  'Add the model, then drag a cable from the router to each provider it picks among.';

export type RouterDraftFieldsProps = {
  /** How the router being composed spreads, which is the one choice it cannot be born without. */
  mode: SpreadingMode;
  /** Receives the mode the person landed on. */
  onModeChange: (mode: SpreadingMode) => void;
  /** What the person called it, which is empty while it answers to its mode. */
  name: string;
  /** Receives every keystroke in the router name field. */
  onNameChange: (typed: string) => void;
};

/**
 * What a person decides about a router before it exists: how it spreads and what it is called.
 *
 * @summary The mode leads because a router cannot be born without one, and the name follows because
 * it can. The sentence under the strip describes the very mode a person just landed on rather than
 * standing as fixed help, and the placeholder is the name the router answers to while the field
 * stays empty, so leaving it alone is a complete answer rather than a step skipped.
 *
 * The name is asked here rather than left to the inspector because a person composing top down has
 * already been asked to name the virtual model one box above: naming the router in the same breath
 * costs them nothing, while finding the rename afterwards costs them a hunt through a second panel.
 */
export function RouterDraftFields({
  mode,
  onModeChange,
  name,
  onNameChange,
}: RouterDraftFieldsProps) {
  return (
    <div className="flex flex-col gap-1.5 px-2 py-1.5">
      <SegmentedControl
        label="Routing mode"
        onChangeValue={onModeChange}
        options={modeOptions}
        spread="row"
        value={mode}
      />
      <p className="text-detail text-ink-secondary">{modeSentences[mode]}</p>
      <label className="mt-1.5 flex flex-col gap-1">
        <span className="drawer-picker-heading">Router name</span>
        <input
          className="field-control w-full placeholder:text-ink-tertiary"
          onInput={(event) => {
            onNameChange(event.currentTarget.value);
          }}
          placeholder={nameOfRouterMode(mode)}
          type="text"
          value={name}
        />
      </label>
      <p className="text-detail text-ink-secondary">{NEXT_STEP}</p>
    </div>
  );
}
