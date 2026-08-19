import type { BoundKind } from '../../lib/binding-kinds';
import type { SettledDefinition } from '../../lib/model-draft';
import type { RouterMode } from '../../lib/routing-edits';
import type { JudgePick } from '../routing-picker/routing-picker';

import { idFollowingName } from '../../lib/model-draft';

/** What one look at a provider's model list left the fields to read. */
type OfferedModels = { offered: readonly string[]; refusal: string | undefined };

/** Writes a whole definition back to the held draft, which every edit here goes through. */
type Edited = (next: SettledDefinition) => void;

/**
 * Every edit the fields can make, each one written back to the held draft as a whole definition.
 *
 * @summary Answering the binding ask again clears the account and the model, because a person who
 * walked back to that question is choosing a different shape and a target left standing under a
 * router would reach storage as a binding nobody asked for. Walking back to the mode drops the
 * judge for the same reason: only one mode reads requests, so a judge under any other one is an
 * answer to a question nobody asked.
 */
export function draftEdits(definition: SettledDefinition, edited: Edited) {
  return {
    onIdChange: (typed: string) => {
      edited({ ...definition, id: typed });
    },
    onNameChange: (typed: string) => {
      const id = idFollowingName(definition.displayName, typed, definition.id);

      edited({ ...definition, displayName: typed, id });
    },
    onPickKind: (kind: BoundKind) => {
      edited({ ...definition, bindsThrough: kind, accountId: '', providerModel: '' });
    },
    onPickModel: (picked: string) => {
      edited({ ...definition, providerModel: picked });
    },
    onPickTarget: (picked: string) => {
      edited({ ...definition, accountId: picked, providerModel: '' });
    },
    onReopenKind: () => {
      edited({ ...definition, bindsThrough: undefined, accountId: '', providerModel: '' });
    },
    onReopenRouterMode: () => {
      edited({ ...definition, routerMode: undefined, judge: undefined });
    },
    onRouterModeChange: (mode: RouterMode) => {
      edited({ ...definition, routerMode: mode });
    },
    onRouterNameChange: (typed: string) => {
      edited({ ...definition, routerName: typed });
    },
    onSelectDifferentProvider: () => {
      edited({ ...definition, accountId: '', providerModel: '' });
    },
  };
}

/**
 * How a person picks the judge, written back to the draft as the one binding it is.
 *
 * @summary Picking an account clears the model under it, the same way the target pick does: a model
 * one account serves is rarely a model the next one does, and a stale pair would reach storage as a
 * judge that refuses every request it reads.
 */
export function judgePick(
  definition: SettledDefinition,
  edited: Edited,
  models: OfferedModels,
  name: string | undefined,
): JudgePick {
  const binding = definition.judge;

  return {
    binding,
    name,
    models: models.offered,
    modelRefusal: models.refusal,
    onPickAccount: (accountId: string) => {
      edited({ ...definition, judge: { accountId, providerModel: '' } });
    },
    onPickModel: (providerModel: string) => {
      edited({ ...definition, judge: { accountId: binding?.accountId ?? '', providerModel } });
    },
    onSelectDifferentProvider: () => {
      edited({ ...definition, judge: undefined });
    },
  };
}

/** Which account the judge reads through, which is empty while the draft has named none. */
export function judgeAccountOf(definition: SettledDefinition): string {
  return definition.judge?.accountId ?? '';
}
