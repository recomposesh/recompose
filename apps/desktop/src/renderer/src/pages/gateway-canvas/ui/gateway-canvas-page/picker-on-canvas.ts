import type { XY } from '../../lib/canvas-positions';
import type { ModelListReading } from '../../lib/model-draft';
import type { BoundKind, PickerStage } from '../drop-picker/drop-picker';
import type { OptionGroup } from '../option-list/option-list';
import type { CanvasWorld, PickerStanding } from './canvas-standings';

import { targetGroups } from '../../lib/target-groups';
import { completedDraftPick, completedRebindPick } from './binding-acts';
import { routerSeatOf } from './canvas-wiring';
import { boundThroughARouter, completedChildPick } from './router-acts';

/** The picker as the page anchors it onto the canvas, ready to stand on the card it names. */
export type PickerOnCanvas = {
  stage: PickerStage;
  groups: readonly OptionGroup[];
  refusal: string | undefined;
  anchorSeat: XY;
  onPickKind: (kind: BoundKind) => void;
  onPickAccount: (accountId: string) => void;
  onPickProviderModel: (providerModel: string) => void;
  onSelectDifferentProvider: () => void;
  onDismiss: () => void;
};

function pickerGroups(
  world: CanvasWorld,
  picker: PickerStanding,
  offered: readonly string[],
): readonly OptionGroup[] {
  return picker.step === 'account'
    ? targetGroups([...world.accounts])
    : [{ options: offered.map((id) => ({ id, name: id })) }];
}

function completedPick(
  world: CanvasWorld,
  from: string,
  accountId: string,
  providerModel: string,
): void {
  if (from === 'draft') {
    completedDraftPick(world, accountId, providerModel);

    return;
  }

  if (routerSeatOf(from) === undefined) {
    completedRebindPick(world, accountId, providerModel);

    return;
  }

  completedChildPick(world, from, accountId, providerModel);
}

/**
 * Answers the kind ask, which either carries the ask on or finishes it in one write.
 *
 * @summary Picking the target continues into the account and model pick that ships today, because
 * a target is still two facts. Picking the router settles there, since a fresh router holds no
 * child and has nothing left to ask about.
 */
function answeredKind(world: CanvasWorld, picker: PickerStanding): (kind: BoundKind) => void {
  return (kind) => {
    if (picker.step !== 'kind') {
      return;
    }

    if (kind === 'target') {
      world.standings.setPicker({ ...picker, step: 'account' });

      return;
    }

    boundThroughARouter(world, picker.from);
  };
}

function pickerStage(picker: PickerStanding): PickerStage {
  if (picker.step === 'provider-model') {
    return { step: 'provider-model', accountId: picker.accountId };
  }

  return picker.step === 'kind' ? { step: 'kind' } : { step: 'account' };
}

/**
 * The picker the page renders onto the canvas, or nothing while no pick stands open.
 *
 * @summary Every answer the picker can give moves through a named act on the world, so the picker
 * itself holds no topology: the first stage narrows to an account, the second commits the pick,
 * and a dismissal only takes the standing away.
 */
export function pickerOnCanvas(
  world: CanvasWorld,
  models: ModelListReading,
): PickerOnCanvas | undefined {
  const picker = world.standings.picker;

  if (picker === undefined) {
    return undefined;
  }

  const anchorId = 'at' in picker ? 'pending' : picker.anchor;

  return {
    stage: pickerStage(picker),
    groups: pickerGroups(world, picker, models.offered),
    refusal: picker.step === 'provider-model' ? models.refusal : undefined,
    anchorSeat: world.seats[anchorId] ?? { x: 0, y: 0 },
    onPickKind: answeredKind(world, picker),
    onPickAccount: (accountId) => {
      if (picker.step === 'account') {
        world.standings.setPicker({
          step: 'provider-model',
          from: picker.from,
          accountId,
          at: picker.at,
          origin: picker.origin,
        });
      }
    },
    onPickProviderModel: (providerModel) => {
      if (picker.step === 'provider-model') {
        completedPick(world, picker.from, picker.accountId, providerModel);
      }
    },
    onSelectDifferentProvider: () => {
      if (picker.step !== 'provider-model') {
        return;
      }

      const at = 'at' in picker ? picker.at : (world.seats[picker.anchor] ?? { x: 0, y: 0 });
      const origin = 'origin' in picker ? picker.origin : 'ask';

      world.standings.setPicker({ step: 'account', from: picker.from, at, origin });
    },
    onDismiss: () => {
      world.standings.setPicker(undefined);
    },
  };
}
