import type { BoundKind } from '../../lib/binding-kinds';
import type { XY } from '../../lib/canvas-positions';
import type { ModelListReading } from '../../lib/model-draft';
import type { PickerStage } from '../drop-picker/drop-picker';
import type { OptionGroup } from '../option-list/option-list';
import type { CanvasWorld, PickerStanding } from './canvas-standings';

import { targetGroups } from '../../lib/target-groups';
import { completedDraftPick, completedRebindPick } from './binding-acts';
import { routerAddressOf } from './canvas-wiring';
import { completedChildPick, completedChildRebindPick } from './ladder-acts';
import { boundThroughARouter } from './router-acts';

/** The picker as the page anchors it onto the canvas, ready to stand on the card it names. */
export type PickerOnCanvas = {
  stage: PickerStage;
  groups: readonly OptionGroup[];
  refusal: string | undefined;
  pickedName: string | undefined;
  anchorSeat: XY;
  onPickKind: (kind: BoundKind) => void;
  onPickAccount: (accountId: string) => void;
  onPickProviderModel: (providerModel: string) => void;
  onStepBack: (() => void) | undefined;
  onDismiss: () => void;
};

function pickedProviderName(world: CanvasWorld, picker: PickerStanding): string | undefined {
  if (picker.step !== 'provider-model') {
    return undefined;
  }

  return targetGroups([...world.accounts])
    .flatMap((group) => group.options)
    .find((option) => option.id === picker.accountId)?.name;
}

function pickerGroups(
  world: CanvasWorld,
  picker: PickerStanding,
  offered: readonly string[],
): readonly OptionGroup[] {
  return picker.step === 'account'
    ? targetGroups([...world.accounts])
    : [{ options: offered.map((id) => ({ id, name: id })) }];
}

/**
 * Where the answer to a completed pick goes, which is one act per shape of the ask behind it.
 *
 * @summary A draft becomes a whole definition, a virtual model's own cable aims that definition
 * somewhere new, and a cable off a router either moves the child it already ended at or binds one
 * more. The ask carries which of the last two it is, because only the gesture that opened it knows
 * whether the person was rearranging a binding or composing another.
 */
function completedPick(
  world: CanvasWorld,
  picker: PickerStanding,
  accountId: string,
  providerModel: string,
): void {
  const { from } = picker;

  if (from === 'draft') {
    completedDraftPick(world, accountId, providerModel);

    return;
  }

  const address = routerAddressOf(from);

  if (address === undefined) {
    completedRebindPick(world, accountId, providerModel);

    return;
  }

  const replacing = 'replacing' in picker ? picker.replacing : undefined;

  if (replacing === undefined) {
    completedChildPick(world, address, accountId, providerModel);

    return;
  }

  completedChildRebindPick(world, address, replacing, accountId, providerModel);
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
 * The step out of the one standing, or nothing where the ask opened on this stage.
 *
 * @summary The kind ask is the first thing every drop and every plus asks, so a stage carrying its
 * drop point has that ask behind it and offers the way back to it. A cable let go on a stored
 * target card opens on the model pick with the account already settled, and its way back reaches
 * the account list and stops there, because nothing asked what kind to bind.
 */
function steppedBack(world: CanvasWorld, picker: PickerStanding): (() => void) | undefined {
  if (picker.step === 'kind') {
    return undefined;
  }

  if (picker.step === 'account') {
    return 'at' in picker
      ? () => {
          world.standings.setPicker({ ...picker, step: 'kind' });
        }
      : undefined;
  }

  return () => {
    world.standings.setPicker(
      'at' in picker
        ? { step: 'account', from: picker.from, at: picker.at, origin: picker.origin }
        : {
            step: 'account',
            from: picker.from,
            anchor: picker.anchor,
            replacing: picker.replacing,
          },
    );
  };
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
    pickedName: pickedProviderName(world, picker),
    anchorSeat: world.seats[anchorId] ?? { x: 0, y: 0 },
    onPickKind: answeredKind(world, picker),
    onPickAccount: (accountId) => {
      if (picker.step !== 'account') {
        return;
      }

      world.standings.setPicker(
        'at' in picker
          ? {
              step: 'provider-model',
              from: picker.from,
              accountId,
              at: picker.at,
              origin: picker.origin,
            }
          : {
              step: 'provider-model',
              from: picker.from,
              accountId,
              anchor: picker.anchor,
              replacing: picker.replacing,
            },
      );
    },
    onPickProviderModel: (providerModel) => {
      if (picker.step === 'provider-model') {
        completedPick(world, picker, picker.accountId, providerModel);
      }
    },
    onStepBack: steppedBack(world, picker),
    onDismiss: () => {
      world.standings.setPicker(undefined);
    },
  };
}
