import type { GatewayConfig } from '@recompose/contracts';
import type { ReactNode, RefObject } from 'react';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import type { SettledDefinition } from '../../lib/model-draft';
import type { OptionGroup } from '../option-list/option-list';

import {
  accountsQueryOptions,
  providerModelsQueryOptions,
  refusalSentence,
  useDefineVirtualModel,
} from '../../../../shared/api';
import { placeFocus } from '../../../../shared/ui';
import {
  emptyDefinition,
  gatewayDefining,
  idFollowingName,
  idRefusal,
  modelListReading,
  nameRefusal,
  refusalFromMain,
  servesPreview,
} from '../../lib/model-draft';
import { targetGroups } from '../../lib/target-groups';
import { editDraft, useHeldDraft } from '../../lib/use-held-draft';
import { ModelFields } from '../model-fields/model-fields';

type DraftInspectorProps = {
  /** The gateway the definition joins once it settles, whose stored shape the save carries whole. */
  gateway: GatewayConfig;
  /** Receives the definition the moment the save lands, which is when the draft graduates. */
  onDefined: (definition: SettledDefinition) => void;
};

function useOfferedModels(accountId: string) {
  const look = useQuery({
    ...providerModelsQueryOptions(accountId),
    enabled: accountId !== '',
  });
  const reading = modelListReading(look.data);

  return {
    offered: reading.offered,
    refusal: look.error === null ? reading.refusal : refusalSentence(look.error),
  };
}

function useDraftSaving(
  gateway: GatewayConfig,
  definition: SettledDefinition,
  onDefined: (definition: SettledDefinition) => void,
) {
  const define = useDefineVirtualModel();
  const [attempted, setAttempted] = useState(false);
  const [refusal, setRefusal] = useState<string | undefined>(undefined);

  return {
    attempted,
    refusal,
    saving: define.isPending,
    clearRefusal: () => {
      setRefusal(undefined);
    },
    save: () => {
      setAttempted(true);

      const refused =
        nameRefusal(definition.displayName) ?? idRefusal(definition.id, gateway.virtualModels);

      if (refused !== undefined) {
        return;
      }

      define.mutate(gatewayDefining(gateway, definition), {
        onSuccess: () => {
          onDefined(definition);
        },
        onError: (failure) => {
          setRefusal(refusalFromMain(failure));
        },
      });
    },
  };
}

function spokenAfterAsking(attempted: boolean, spoken: string | undefined): string | undefined {
  return attempted ? spoken : undefined;
}

function untouchedDefinition(definition: SettledDefinition): boolean {
  return (
    definition.displayName === '' &&
    definition.id === '' &&
    definition.accountId === '' &&
    definition.providerModel === ''
  );
}

function nameOfPicked(
  targets: readonly OptionGroup[],
  accountId: string | undefined,
): string | undefined {
  return targets.flatMap((group) => group.options).find((option) => option.id === accountId)?.name;
}

function servesLine(preview: string | undefined): ReactNode {
  return preview === undefined ? null : (
    <p className="border-t border-line-faint bg-surface-inert px-3.5 py-2 font-mono text-mono-value text-ink-secondary">
      {preview}
    </p>
  );
}

function refusedSave(refusal: string | undefined): ReactNode {
  return refusal === undefined ? null : (
    <p className="border-t border-line-faint px-3.5 py-2 text-caption text-danger-ink" role="alert">
      {refusal}
    </p>
  );
}

function saveWithheld(settled: boolean, saving: boolean): boolean {
  return !settled || saving;
}

function draftFoot(disabled: boolean, onSave: () => void): ReactNode {
  return (
    <footer className="mt-auto flex border-t border-line-faint px-3.5 py-3">
      <button
        className="push-button-primary flex-1 whitespace-nowrap"
        disabled={disabled}
        onClick={onSave}
        type="button"
      >
        Add virtual model
      </button>
    </footer>
  );
}

type DraftTargets = {
  targets: readonly OptionGroup[] | undefined;
  target: string | undefined;
  targetName: string | undefined;
  settled: boolean;
};

function draftTargetsOf(
  definition: SettledDefinition,
  offered: readonly OptionGroup[] | undefined,
): DraftTargets {
  const target = definition.accountId === '' ? undefined : definition.accountId;

  return {
    targets: offered,
    target,
    targetName: nameOfPicked(offered ?? [], target),
    settled: definition.accountId !== '' && definition.providerModel !== '',
  };
}

type DraftFieldsView = {
  gateway: GatewayConfig;
  definition: SettledDefinition;
  picked: DraftTargets;
  models: ReturnType<typeof useOfferedModels>;
  attempted: boolean;
  nameField: RefObject<HTMLInputElement | null>;
  edited: (next: SettledDefinition) => void;
};

function draftFields(view: DraftFieldsView): ReactNode {
  const { definition, edited } = view;

  return (
    <ModelFields
      id={definition.id}
      idRefusal={spokenAfterAsking(
        view.attempted,
        idRefusal(definition.id, view.gateway.virtualModels),
      )}
      models={view.models.offered}
      modelRefusal={view.models.refusal}
      name={definition.displayName}
      nameField={view.nameField}
      nameRefusal={spokenAfterAsking(view.attempted, nameRefusal(definition.displayName))}
      onIdChange={(typed) => {
        edited({ ...definition, id: typed });
      }}
      onNameChange={(typed) => {
        edited({
          ...definition,
          displayName: typed,
          id: idFollowingName(definition.displayName, typed, definition.id),
        });
      }}
      onPickModel={(picked) => {
        edited({ ...definition, providerModel: picked });
      }}
      onPickTarget={(picked) => {
        edited({ ...definition, accountId: picked, providerModel: '' });
      }}
      onSelectDifferentProvider={() => {
        edited({ ...definition, accountId: '', providerModel: '' });
      }}
      providerModel={definition.providerModel}
      target={view.picked.target}
      targetName={view.picked.targetName}
      targets={view.picked.targets}
    />
  );
}

/**
 * The inspector body that finishes a draft virtual model, writing every keystroke back to it.
 *
 * @summary The draft itself is the state: each edit lands in the held draft, so the card on the
 * canvas says what the fields say while a person is still typing, and the definition survives any
 * way of leaving. The save waits until the binding is whole, and a refused save says why right
 * here, while the draft holds every word.
 */
export function DraftInspector({ gateway, onDefined }: DraftInspectorProps) {
  const held = useHeldDraft(gateway.slug);
  const registry = useQuery(accountsQueryOptions);
  const definition = held?.definition ?? emptyDefinition();
  const models = useOfferedModels(definition.accountId);
  const saving = useDraftSaving(gateway, definition, onDefined);
  const nameField = useRef<HTMLInputElement>(null);
  const newlyAdded = untouchedDefinition(definition);
  const focusNameOnMount = useRef(newlyAdded);

  useEffect(() => {
    if (focusNameOnMount.current) {
      placeFocus(nameField.current);
    }
  }, []);

  const edited = (next: SettledDefinition): void => {
    editDraft(gateway.slug, next);
    saving.clearRefusal();
  };

  const offered = registry.data === undefined ? undefined : targetGroups(registry.data.accounts);
  const picked = draftTargetsOf(definition, offered);

  return (
    <>
      <div className="flex-1 overflow-y-auto px-3.5 pt-2 pb-4">
        {draftFields({
          gateway,
          definition,
          picked,
          models,
          attempted: saving.attempted,
          nameField,
          edited,
        })}
      </div>
      {servesLine(
        servesPreview({
          id: definition.id,
          target: picked.targetName,
          providerModel: definition.providerModel,
        }),
      )}
      {refusedSave(saving.refusal)}
      {draftFoot(saveWithheld(picked.settled, saving.saving), saving.save)}
    </>
  );
}
