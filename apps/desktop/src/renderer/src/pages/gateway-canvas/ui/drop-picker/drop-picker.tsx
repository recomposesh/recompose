import type { KeyboardEvent, ReactNode } from 'react';

import { useEffect, useId, useRef } from 'react';

import type { OptionGroup } from '../option-list/option-list';

import { useStepTransition } from '../../../../shared/lib';
import { Button, placeFocus } from '../../../../shared/ui';
import { OptionList } from '../option-list/option-list';

/** Which of the two kinds a released cable may bind. */
export type BoundKind = 'router' | 'target';

/** Which part of the binding the ask is asking for, and what the parts before it settled on. */
export type PickerStage =
  | { step: 'kind' }
  | { step: 'account' }
  | { step: 'provider-model'; accountId: string };

type StageWording = {
  heading: string;
  searchLabel: string;
  nothingMatched: string;
};

const wording: Record<PickerStage['step'], StageWording> = {
  kind: {
    heading: 'Bind a router or a target',
    searchLabel: 'Search kinds',
    nothingMatched: 'Nothing binds here.',
  },
  account: {
    heading: 'Pick an account',
    searchLabel: 'Search accounts',
    nothingMatched: 'No account matches that.',
  },
  'provider-model': {
    heading: 'Pick a provider model',
    searchLabel: 'Search models',
    nothingMatched: 'No model matches that.',
  },
};

const KIND_OPTIONS: readonly OptionGroup[] = [
  {
    options: [
      { id: 'router', name: 'Router', detail: 'spreads requests across its children' },
      { id: 'target', name: 'Target', detail: 'one account, one real model' },
    ],
  },
];

function stageBody(
  refusal: string | undefined,
  said: StageWording,
  groups: readonly OptionGroup[],
  onPick: (picked: string) => void,
  focusSearch: boolean,
): ReactNode {
  if (refusal !== undefined) {
    return (
      <p className="px-1 pb-1 text-detail text-ink" role="alert">
        {refusal}
      </p>
    );
  }

  return (
    <OptionList
      focusSearch={focusSearch}
      groups={groups}
      nothingMatched={said.nothingMatched}
      onPick={onPick}
      picked={undefined}
      searchLabel={said.searchLabel}
    />
  );
}

type PickActs = {
  onPickKind: (kind: BoundKind) => void;
  onPickAccount: (accountId: string) => void;
  onPickProviderModel: (providerModel: string) => void;
};

function pickedAt(stage: PickerStage, acts: PickActs): (picked: string) => void {
  if (stage.step === 'kind') {
    return (picked) => {
      acts.onPickKind(picked === 'router' ? 'router' : 'target');
    };
  }

  return stage.step === 'account' ? acts.onPickAccount : acts.onPickProviderModel;
}

function stageHeading(
  stage: PickerStage,
  headingId: string,
  said: StageWording,
  onSelectDifferentProvider: () => void,
): ReactNode {
  return (
    <div className="flex items-center gap-1.5 px-2.5 pt-1 pb-1.5">
      {stage.step === 'provider-model' ? (
        <Button
          aria-label="Select different provider"
          glyph="chevron"
          glyphClassName="rotate-90"
          onPress={onSelectDifferentProvider}
          variant="icon-secondary"
        />
      ) : null}
      <p className="picker-heading" id={headingId}>
        {said.heading}
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
  /** Receives which of the two kinds a person chose to bind here. */
  onPickKind: (kind: BoundKind) => void;
  /** Receives the account a person settled the first stage on. */
  onPickAccount: (accountId: string) => void;
  /** Receives the provider model that completes the binding. */
  onPickProviderModel: (providerModel: string) => void;
  /** Returns the second stage to the account choices. */
  onSelectDifferentProvider: () => void;
  /** Runs when a person leaves the picker, which is what takes the pending card away. */
  onDismiss: () => void;
};

/**
 * The two-stage picker that finishes a cable a person let go of, standing on its pending card.
 *
 * @summary Render it inside the pending target card, so the question stands where the cable landed
 * rather than at a coordinate a person has to hunt for. A binding needs both an account and the
 * model that account serves, so the account settles first and the model second, and one write
 * commits them together. Esc leaves at either stage, which is the one way out that changes nothing.
 */
export function DropPicker({
  stage,
  groups,
  refusal,
  onPickKind,
  onPickAccount,
  onPickProviderModel,
  onSelectDifferentProvider,
  onDismiss,
}: DropPickerProps) {
  const headingId = useId();
  const asking = useRef<HTMLDialogElement>(null);
  const said = wording[stage.step];
  const transition = useStepTransition(stage.step, ['kind', 'account', 'provider-model']);

  useEffect(() => {
    const asked = asking.current;
    const body = asked?.querySelector<HTMLElement>('[data-picker-body]');

    asked?.show();
    placeFocus(body?.querySelector<HTMLElement>('input, button') ?? asked);
  }, [stage.step]);

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
      <div className={transition} key={stage.step}>
        {stageHeading(stage, headingId, said, onSelectDifferentProvider)}
        <div className="max-h-64 overflow-y-auto px-1.5 pb-1" data-picker-body="">
          {stageBody(
            refusal,
            said,
            stage.step === 'kind' ? KIND_OPTIONS : groups,
            pickedAt(stage, { onPickKind, onPickAccount, onPickProviderModel }),
            stage.step === 'provider-model',
          )}
        </div>
      </div>
    </dialog>
  );
}
