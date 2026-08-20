import type { ReactNode } from 'react';

import { nameOfRouterMode } from '@recompose/contracts';

import type { RouterMode } from '../../lib/routing-edits';

import { modeSentences } from '../../lib/router-modes';

const NEXT_STEP =
  'Add the model, then drag a cable from the router to each provider it picks among.';

export type RouterDraftFieldsProps = {
  /** How the router being composed spreads, settled on the step before this one. */
  mode: RouterMode;
  /** What the person called it, which is empty while it answers to its mode. */
  name: string;
  /** Receives every keystroke in the router name field. */
  onNameChange: (typed: string) => void;
  /**
   * What a mode that reads its requests settled on, standing under the sentence that named it.
   *
   * @summary A slot rather than fields of its own, because only one mode asks for a judge and the
   * step that picked it already knows how to say what it picked. Leave it out for a mode that asks
   * nothing beyond how it spreads.
   */
  judge?: ReactNode;
};

/**
 * What a person decides about a router before it exists, once its mode is already settled.
 *
 * @summary The mode is chosen a step earlier and read back here as a fact, because this is the
 * step the save waits on: a person landing back from the judge and the else branch would otherwise
 * press save without seeing the one answer that decides what all of it means. The sentence under
 * it is the same one they chose by, so the cost reads again where the choice becomes final.
 *
 * The name is asked here rather than left to the inspector because a person composing top down has
 * already been asked to name the virtual model one box above: naming the router in the same breath
 * costs them nothing, while finding the rename afterwards costs them a hunt through a second panel.
 * The placeholder is the name the router answers to while the field stays empty, so leaving it
 * alone is a complete answer rather than a step skipped.
 */
export function RouterDraftFields({ mode, name, onNameChange, judge }: RouterDraftFieldsProps) {
  return (
    <div className="flex flex-col gap-1.5 px-2 py-1.5">
      <div className="flex flex-col gap-1">
        <span className="drawer-picker-heading">Mode</span>
        <p className="text-control text-ink">{nameOfRouterMode(mode)}</p>
      </div>
      <p className="text-detail text-ink-secondary">{modeSentences[mode]}</p>
      {judge}
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
