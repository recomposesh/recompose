import type { KeyboardEvent, ReactNode } from 'react';

import { useEffect, useId, useRef } from 'react';

import type { BoundKind } from '../../lib/binding-kinds';
import type { RouterMode } from '../../lib/routing-edits';
import type { OptionGroup } from '../option-list/option-list';
import type { PickerStage, StageWording } from './picker-stages';

import { useStepTransition } from '../../../../shared/lib';
import { Button, placeFocus } from '../../../../shared/ui';
import { BINDING_KINDS, boundKindOf } from '../../lib/binding-kinds';
import { ModeRows } from '../mode-rows/mode-rows';
import { NoProviderRows } from '../no-provider-rows/no-provider-rows';
import { OptionList } from '../option-list/option-list';
import { STAGE_ORDER, stageKey, stageWording } from './picker-stages';

export type { PickerStage };

const KIND_OPTIONS: readonly OptionGroup[] = [{ options: BINDING_KINDS }];

type PickActs = {
  onPickKind: (kind: BoundKind) => void;
  onPickRouterMode: (mode: RouterMode) => void;
  onPickAccount: (accountId: string) => void;
  onPickProviderModel: (providerModel: string) => void;
};

/** What one stage puts on offer, which is the list it draws from and the acts that receive it. */
type StageOffer = { groups: readonly OptionGroup[]; acts: PickActs };

function listedBody(stage: PickerStage, said: StageWording, offered: StageOffer): ReactNode {
  if (stage.step === 'account' && offered.groups.length === 0) {
    return <NoProviderRows />;
  }

  return (
    <OptionList
      focusSearch={stage.step === 'provider-model'}
      groups={stage.step === 'kind' ? KIND_OPTIONS : offered.groups}
      nothingMatched={said.nothingMatched}
      onPick={pickedAt(stage, offered.acts)}
      picked={undefined}
      searchLabel={said.searchLabel}
    />
  );
}

/**
 * The three modes a nested router may spread by, stacked the way the drawer stacks them.
 *
 * @summary Each row carries its own cost beside its name, and no row rests chosen, because a mode
 * standing preselected would answer for the person and nest a router nobody picked.
 */
function modeBody(acts: PickActs): ReactNode {
  return (
    <div className="p-0.5">
      <ModeRows
        onChangeValue={(mode) => {
          acts.onPickRouterMode(mode);
        }}
        value={undefined}
      />
    </div>
  );
}

function refusalBody(refusal: string): ReactNode {
  return (
    <p className="px-1 pb-1 text-detail text-ink" role="alert">
      {refusal}
    </p>
  );
}

/** What the stage standing offers, which is a list on every stage but the one asking the mode. */
function stageBody(
  stage: PickerStage,
  refusal: string | undefined,
  said: StageWording,
  offered: StageOffer,
): ReactNode {
  if (refusal !== undefined) {
    return refusalBody(refusal);
  }

  return stage.step === 'router-mode' ? modeBody(offered.acts) : listedBody(stage, said, offered);
}

/**
 * How tall the body under the heading may stand, which the mode step alone is exempt from.
 *
 * @summary A list is capped and scrolls, because it grows with whatever a person connected and an
 * uncapped one would run off the canvas. The three modes are a fixed set carrying the cost of
 * choosing each, so they render whole: a person weighing three costs against each other should not
 * have to scroll a popover to find the third, and a capped region holding no tab stop of its own
 * would hide that row from the keyboard as well as from the eye.
 */
function bodyFace(stage: PickerStage): string {
  const face = 'px-1.5 pb-1';

  return stage.step === 'router-mode' ? face : `max-h-64 overflow-y-auto ${face}`;
}

function pickedAt(stage: PickerStage, acts: PickActs): (picked: string) => void {
  if (stage.step === 'kind') {
    return (picked) => {
      acts.onPickKind(boundKindOf(picked));
    };
  }

  return stage.step === 'account' ? acts.onPickAccount : acts.onPickProviderModel;
}

function stageHeading(
  headingId: string,
  heading: string,
  said: StageWording,
  onStepBack: (() => void) | undefined,
): ReactNode {
  return (
    <div className="flex items-center gap-1.5 px-2.5 pt-1 pb-1.5">
      {onStepBack === undefined || said.stepBack === '' ? null : (
        <Button
          aria-label={said.stepBack}
          glyph="chevron"
          glyphClassName="rotate-90"
          onPress={onStepBack}
          variant="icon-secondary"
        />
      )}
      <p className="picker-heading" id={headingId}>
        {heading}
      </p>
    </div>
  );
}

export type DropPickerProps = {
  /** Which part of the binding is being asked for, which is what the list on offer answers. */
  stage: PickerStage;
  /** What this stage offers, gathered the way a person reads them. */
  groups: readonly OptionGroup[];
  /** Why the stage offers nothing, when the picked account's models could not be read. */
  refusal: string | undefined;
  /** What the picked provider reads as, which names whose model list the last stage offers. */
  pickedName: string | undefined;
  /** Receives which of the two kinds a person chose to bind here. */
  onPickKind: (kind: BoundKind) => void;
  /** Receives how the router being nested here spreads. */
  onPickRouterMode: (mode: RouterMode) => void;
  /** Receives the account a person settled the first stage on. */
  onPickAccount: (accountId: string) => void;
  /** Receives the provider model that completes the binding. */
  onPickProviderModel: (providerModel: string) => void;
  /** Returns this stage to the one that opened it, or nothing where no stage stands behind it. */
  onStepBack: (() => void) | undefined;
  /** Runs when a person leaves the picker, which is what takes the pending card away. */
  onDismiss: () => void;
};

/**
 * The stepped picker that finishes a cable a person let go of, standing on its pending card.
 *
 * @summary Render it inside the pending target card, so the question stands where the cable landed
 * rather than at a coordinate a person has to hunt for. A binding needs both an account and the
 * model that account serves, so the account settles first and the model second, and one write
 * commits them together. A router nested here walks further: it says how it spreads, and a
 * conditional one names a judge and a fallback, because the stored shape refuses a router holding
 * neither. Every stage a person walked into offers the chevron back out of it, and a stage nothing
 * stands behind wears none, so the chevron never promises a step that is not there. Esc leaves at
 * any stage, which is the one way out that changes nothing.
 */
export function DropPicker({
  stage,
  groups,
  refusal,
  pickedName,
  onPickKind,
  onPickRouterMode,
  onPickAccount,
  onPickProviderModel,
  onStepBack,
  onDismiss,
}: DropPickerProps) {
  const headingId = useId();
  const asking = useRef<HTMLDialogElement>(null);
  const said = stageWording(stage, pickedName);
  const key = stageKey(stage);
  const transition = useStepTransition(key, STAGE_ORDER);

  useEffect(() => {
    const asked = asking.current;
    const body = asked?.querySelector<HTMLElement>('[data-picker-body]');

    asked?.show();
    placeFocus(body?.querySelector<HTMLElement>('input, button') ?? asked);
  }, [key]);

  return (
    <dialog
      aria-labelledby={headingId}
      className="absolute inset-s-0 top-full z-10 mx-0 mt-1 mb-0 w-64 menu-surface px-0 picker-focus-plain"
      onKeyDown={(event: KeyboardEvent<HTMLDialogElement>) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          onDismiss();
        }
      }}
      ref={asking}
      tabIndex={-1}
    >
      <div className={transition} key={key}>
        {stageHeading(headingId, said.heading, said, onStepBack)}
        <div className={bodyFace(stage)} data-picker-body="">
          {stageBody(stage, refusal, said, {
            groups,
            acts: { onPickKind, onPickRouterMode, onPickAccount, onPickProviderModel },
          })}
        </div>
      </div>
    </dialog>
  );
}
