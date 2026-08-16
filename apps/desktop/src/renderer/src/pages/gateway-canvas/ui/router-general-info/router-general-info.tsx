import type { GatewayConfig } from '@recompose/contracts';
import type { ReactNode } from 'react';

import { nameOfRouter, nameOfRouterMode } from '@recompose/contracts';
import { useState } from 'react';

import type { RouterMode } from '../../lib/routing-edits';

import { useDefineVirtualModel } from '../../../../shared/api';
import { gatewayNamingRouter } from '../../lib/routing-edits';
import {
  editableSectionHeading,
  editFooter,
  editRow,
  factRow,
} from '../subject-shell/subject-shell';

type NameDraft = {
  name: string;
  refused: string | undefined;
};

type NameActs = {
  onDraft: (held: NameDraft) => void;
  onCancel: () => void;
  onSave: () => void;
};

type RouterGeneralInfoProps = {
  /** The stored gateway holding the routing, which a rename rewrites as a whole. */
  gateway: GatewayConfig;
  /** The virtual model whose routing holds this router. */
  modelId: string;
  /** The id the stored table holds this router under, which the rename names it by. */
  routeNodeId: string;
  /** How the router spreads, which is the name it wears while nobody has named it. */
  mode: RouterMode;
  /** The name a person gave it, or nothing while it answers to its mode. */
  displayName: string | undefined;
};

function routerNameRow(
  draft: NameDraft,
  mode: RouterMode,
  onDraft: (held: NameDraft) => void,
): ReactNode {
  return editRow(
    'Router name',
    <input
      aria-label="Router name"
      className="field-control w-full"
      onInput={(event) => {
        onDraft({ ...draft, name: event.currentTarget.value });
      }}
      placeholder={nameOfRouterMode(mode)}
      type="text"
      value={draft.name}
    />,
  );
}

/**
 * How a person takes a name back, said where they can act on it.
 *
 * @summary An empty field is the whole gesture, and a placeholder is too quiet to carry a rule: it
 * paints under the contrast a person can rely on and it leaves the moment they type. The sentence
 * names the mode that speaks again, so nobody has to empty the field to find out what happens.
 */
function clearingHint(mode: RouterMode): ReactNode {
  return (
    <p className="mt-2 px-1 text-caption text-ink-secondary">
      Leave it empty and the router answers to {nameOfRouterMode(mode)} again.
    </p>
  );
}

function restingName(mode: RouterMode, displayName: string | undefined): ReactNode {
  return <div className="field-box">{factRow('Router name', nameOfRouter(mode, displayName))}</div>;
}

function editingName(draft: NameDraft, mode: RouterMode, acts: NameActs): ReactNode {
  return (
    <>
      <div className="field-box">{routerNameRow(draft, mode, acts.onDraft)}</div>
      {clearingHint(mode)}
      {editFooter({ onCancel: acts.onCancel, onSave: acts.onSave }, draft.refused)}
    </>
  );
}

/**
 * The name a router answers to, editable behind the heading's Edit.
 *
 * @summary A ladder standing beside another that spreads the same way reads as two cards printing
 * one word, so this is where a person tells them apart, and the name they write is what the card,
 * the removal question, and the refusal a client reads all say from then on. Leaving the field
 * empty is how a name is taken back, and the sentence under the box names the mode that speaks
 * again, so clearing never leaves a card with nothing on its name line.
 */
export function RouterGeneralInfo({
  gateway,
  modelId,
  routeNodeId,
  mode,
  displayName,
}: RouterGeneralInfoProps) {
  const rewrite = useDefineVirtualModel();
  const [draft, setDraft] = useState<NameDraft | undefined>(undefined);

  const save = (held: NameDraft): void => {
    const named = held.name.trim();

    rewrite.mutate(
      gatewayNamingRouter(gateway, modelId, routeNodeId, named === '' ? undefined : named),
      {
        onSuccess: () => {
          setDraft(undefined);
        },
        onError: (failure) => {
          setDraft({ ...held, refused: failure.message });
        },
      },
    );
  };

  return (
    <>
      {editableSectionHeading('General info', draft !== undefined, () => {
        setDraft({ name: displayName ?? '', refused: undefined });
      })}
      {draft === undefined
        ? restingName(mode, displayName)
        : editingName(draft, mode, {
            onDraft: setDraft,
            onCancel: () => {
              setDraft(undefined);
            },
            onSave: () => {
              save(draft);
            },
          })}
    </>
  );
}
