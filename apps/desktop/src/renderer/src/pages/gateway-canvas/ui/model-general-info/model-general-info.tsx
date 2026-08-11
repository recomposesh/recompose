import type { GatewayConfig, VirtualModel } from '@recompose/contracts';
import type { ReactNode } from 'react';

import { modelAliasSchema } from '@recompose/contracts';
import { useState } from 'react';

import { useDefineVirtualModel } from '../../../../shared/api';
import { CopyButton } from '../../../../shared/ui';
import {
  editFooter,
  editRow,
  editableSectionHeading,
  factRow,
  savedNotice,
} from '../subject-shell/subject-shell';

type RenameDraft = {
  name: string;
  alias: string;
  refused: string | undefined;
};

function renameRefusal(
  gateway: GatewayConfig,
  model: VirtualModel,
  nextId: string,
): string | undefined {
  if (!modelAliasSchema.safeParse(nextId).success) {
    return 'A model id is lowercase letters, digits, dots and dashes.';
  }

  if (nextId !== model.id && gateway.virtualModels.some((held) => held.id === nextId)) {
    return `"${nextId}" already serves this gateway.`;
  }

  return undefined;
}

function renamedGateway(
  gateway: GatewayConfig,
  model: VirtualModel,
  nextId: string,
  nextName: string,
): GatewayConfig {
  return {
    ...gateway,
    virtualModels: gateway.virtualModels.map((held) =>
      held.id === model.id ? { ...held, id: nextId, displayName: nextName } : held,
    ),
  };
}

type RenameActs = {
  onDrafted: (draft: RenameDraft) => void;
  onLanded: () => void;
  onRenamed: (modelId: string) => void;
};

function saveRename(
  rewrite: ReturnType<typeof useDefineVirtualModel>,
  gateway: GatewayConfig,
  model: VirtualModel,
  held: RenameDraft,
  acts: RenameActs,
): void {
  const nextName = held.name.trim();
  const nextId = held.alias.trim();
  const refusal = renameRefusal(gateway, model, nextId);

  if (refusal !== undefined) {
    acts.onDrafted({ ...held, refused: refusal });

    return;
  }

  rewrite.mutate(renamedGateway(gateway, model, nextId, nextName), {
    onSuccess: () => {
      acts.onLanded();

      if (nextId !== model.id) {
        acts.onRenamed(nextId);
      }
    },
    onError: (failure) => {
      acts.onDrafted({ ...held, refused: failure.message });
    },
  });
}

function modelNameRow(name: string, onName: (name: string) => void): ReactNode {
  return editRow(
    'Model Name',
    <input
      aria-label="Model name"
      className="field-control w-full"
      onInput={(event) => {
        onName(event.currentTarget.value);
      }}
      type="text"
      value={name}
    />,
  );
}

function modelIdRow(alias: string, onAlias: (alias: string) => void): ReactNode {
  return editRow(
    'Model id',
    <input
      aria-label="Model id"
      className="field-control w-full font-mono"
      onInput={(event) => {
        onAlias(event.currentTarget.value);
      }}
      spellCheck={false}
      type="text"
      value={alias}
    />,
  );
}

function renameRows(draft: RenameDraft, onDraft: (draft: RenameDraft) => void): ReactNode {
  return (
    <>
      {modelNameRow(draft.name, (name) => {
        onDraft({ ...draft, name });
      })}
      {modelIdRow(draft.alias, (alias) => {
        onDraft({ ...draft, alias });
      })}
    </>
  );
}

function modelFactRows(model: VirtualModel): ReactNode {
  return (
    <>
      {factRow('Model Name', model.displayName)}
      {factRow('Model id', model.id, <CopyButton label="Copy model id" value={model.id} />)}
    </>
  );
}

type ModelGeneralInfoProps = {
  /** The stored gateway holding the definition, which a rename rewrites as a whole. */
  gateway: GatewayConfig;
  /** The virtual model whose name and id the box reads. */
  model: VirtualModel;
  /** Hears the model id a rename settled on, so the selection can follow the definition. */
  onRenamed: (modelId: string) => void;
};

/**
 * The virtual model's name and id, editable behind the heading's Edit.
 *
 * @summary The id is the string clients actually send, so a saved change is not done until the
 * harness pointing here restarts: the notice under the box says exactly that. A rename onto an id
 * another definition holds refuses before anything writes, because two models under one id would
 * leave clients calling a coin flip.
 */
export function ModelGeneralInfo({ gateway, model, onRenamed }: ModelGeneralInfoProps) {
  const rewrite = useDefineVirtualModel();
  const [draft, setDraft] = useState<RenameDraft | undefined>(undefined);
  const [saved, setSaved] = useState(false);

  const beginEditing = () => {
    setSaved(false);
    setDraft({ name: model.displayName, alias: model.id, refused: undefined });
  };

  const save = (held: RenameDraft) => {
    saveRename(rewrite, gateway, model, held, {
      onDrafted: setDraft,
      onLanded: () => {
        setDraft(undefined);
        setSaved(true);
      },
      onRenamed,
    });
  };

  return (
    <>
      {editableSectionHeading('General Info', draft !== undefined, beginEditing)}
      <div className="field-box">
        {draft === undefined ? modelFactRows(model) : renameRows(draft, setDraft)}
      </div>
      {draft === undefined
        ? savedNotice(saved)
        : editFooter(
            {
              onCancel: () => {
                setDraft(undefined);
              },
              onSave: () => {
                save(draft);
              },
            },
            draft.refused,
          )}
    </>
  );
}
