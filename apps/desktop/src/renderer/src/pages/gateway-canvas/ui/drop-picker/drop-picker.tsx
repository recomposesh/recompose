import type { KeyboardEvent } from 'react';

import { useEffect, useId, useRef } from 'react';

import type { OptionGroup } from '../option-list/option-list';

import { placeFocus } from '../../../../shared/ui';
import { OptionList } from '../option-list/option-list';

/** Which half of the binding the picker is asking for, and what the first half settled on. */
export type PickerStage = { step: 'account' } | { step: 'provider-model'; accountId: string };

type StageWording = {
  heading: string;
  searchLabel: string;
  nothingMatched: string;
};

const wording: Record<PickerStage['step'], StageWording> = {
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

export type DropPickerProps = {
  /** Which half of the binding is being asked for, which is what the list on offer answers. */
  stage: PickerStage;
  /** What this stage offers, gathered the way a person reads them. */
  groups: readonly OptionGroup[];
  /** Receives the account a person settled the first stage on. */
  onPickAccount: (accountId: string) => void;
  /** Receives the provider model that completes the binding. */
  onPickProviderModel: (providerModel: string) => void;
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
  onPickAccount,
  onPickProviderModel,
  onDismiss,
}: DropPickerProps) {
  const headingId = useId();
  const asking = useRef<HTMLDialogElement>(null);
  const said = wording[stage.step];

  useEffect(() => {
    const asked = asking.current;

    asked?.show();
    placeFocus(asked?.querySelector<HTMLElement>('input, button') ?? asked);
  }, [stage.step]);

  return (
    <dialog
      aria-labelledby={headingId}
      className="absolute inset-s-0 top-full z-10 mx-0 mt-2 mb-0 w-64 menu-surface px-0 focus-ring"
      onKeyDown={(event: KeyboardEvent<HTMLDialogElement>) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          onDismiss();
        }
      }}
      ref={asking}
      tabIndex={-1}
    >
      <p
        className="px-2.5 pt-1 pb-1.5 text-footnote font-bold tracking-wider text-ink-secondary uppercase"
        id={headingId}
      >
        {said.heading}
      </p>
      <div className="max-h-64 overflow-y-auto px-1.5 pb-1">
        <OptionList
          groups={groups}
          nothingMatched={said.nothingMatched}
          onPick={stage.step === 'account' ? onPickAccount : onPickProviderModel}
          picked={undefined}
          searchLabel={said.searchLabel}
        />
      </div>
    </dialog>
  );
}
