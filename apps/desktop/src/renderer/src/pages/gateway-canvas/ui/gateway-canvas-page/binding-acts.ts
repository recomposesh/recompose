import type { Account, GatewayConfig } from '@recompose/contracts';

import { targetTheEntryNames } from '@recompose/contracts';

import type { XY } from '../../lib/canvas-positions';
import type { NamedDefinition } from '../../lib/model-draft';
import type { CanvasWorld } from './canvas-standings';

import { accountName } from '../../../../entities/account';
import { closeInspector } from '../../../../shared/lib';
import { keepCanvasPositions, setNodePosition } from '../../lib/canvas-position-store';
import {
  emptyDefinition,
  gatewayDefining,
  gatewayRebinding,
  gatewayReleasing,
} from '../../lib/model-draft';
import { ROUTE_COLUMN, seatForNewNode } from '../../lib/tidy-layout';
import { heldDraft, leaveDrafting, startDrafting } from '../../lib/use-held-draft';
import { shownWhereItWasBorn } from './born-card-camera';
import { modelIdOf, targetModelIdOf } from './canvas-wiring';

/** The name a definition answers to out loud, which is its id until a person names it. */
export function spokenNameOf(definition: NamedDefinition): string {
  return definition.displayName === '' ? definition.id : definition.displayName;
}

/**
 * Puts a graduated draft away: seats what it became, forgets it, and says what it bound to.
 *
 * @summary Every path out of a draft lands here, whether it finished on a target or on a router,
 * so a draft is never half put away: the card keeps the spot the person placed it at, the overlay
 * standing goes, the inspector closes, and the live region says what the definition now reaches.
 * A binding that brings a second card into being seats that one too, in the same write.
 */
export function graduatedDraft(
  world: CanvasWorld,
  named: NamedDefinition,
  boundTo: string,
  alsoSeat?: (draftSeat: XY) => void,
): void {
  const draft = heldDraft(world.slug);

  if (draft !== undefined) {
    setNodePosition(world.slug, `model:${named.id}`, draft.seat);
    alsoSeat?.(draft.seat);
    keepCanvasPositions(world.slug);
  }

  leaveDrafting(world.slug);
  world.standings.select(undefined);
  closeInspector();
  world.standings.announce({
    kind: 'bound',
    virtualModel: spokenNameOf(named),
    target: boundTo,
  });
}

/** The name a target account reads as, or its bare id once it left the registry. */
export function targetNameIn(accounts: readonly Account[], accountId: string): string {
  const account = accounts.find((held) => held.id === accountId);

  return account === undefined ? accountId : accountName(account);
}

/**
 * Hands back the seating a completed pick owes the target card it brings into being.
 *
 * @summary A cable let go on open canvas stands a pending card exactly where the pointer released,
 * and the target that answers the pick takes that card's place, so what a person aimed at is where
 * the composition grows. It seats nothing when the account already stands on the canvas, because
 * a card a person can see is one they placed rather than one this pick is making, and nothing
 * when the picker was opened on a card rather than by a drop, which named no spot at all.
 */
function seatedWhereTheCableLanded(world: CanvasWorld, bornTargetId: string): () => void {
  const picker = world.standings.picker;
  const at = picker !== undefined && 'at' in picker ? picker.at : undefined;
  const alreadyStanding = world.graph.nodes.some((node) => node.id === bornTargetId);

  return () => {
    if (at === undefined || alreadyStanding) {
      return;
    }

    setNodePosition(world.slug, bornTargetId, at);
    keepCanvasPositions(world.slug);
  };
}

function seatOfTheBornTarget(world: CanvasWorld, bornTargetId: string): XY | undefined {
  const picker = world.standings.picker;
  const alreadyStanding = world.graph.nodes.some((node) => node.id === bornTargetId);

  if (picker === undefined || alreadyStanding) {
    return undefined;
  }

  if ('at' in picker) {
    return picker.origin === 'drop' ? undefined : picker.at;
  }

  return seatForNewNode(ROUTE_COLUMN, world.seats);
}

/**
 * Writes one rewritten gateway, seating whatever card the pick brought into being.
 *
 * @summary Every completed pick lands here, so a born card is seated, the picker put away, and a
 * refusal said out loud in one place rather than once per kind of thing a person can bind. A card
 * that already stands is seated by nobody, because a card a person can see is one they placed.
 */
export function committedPick(
  world: CanvasWorld,
  bornTargetId: string,
  rewritten: GatewayConfig,
  landed: () => void,
): void {
  const seatTheTarget = seatedWhereTheCableLanded(world, bornTargetId);
  const bornAt = seatOfTheBornTarget(world, bornTargetId);

  world.define.mutate(rewritten, {
    onSuccess: () => {
      world.standings.setPicker(undefined);
      seatTheTarget();
      landed();
      shownWhereItWasBorn(world, bornAt);
    },
    onError: (failure) => {
      world.standings.setPicker(undefined);
      world.standings.refuse(failure);
    },
  });
}

/**
 * Writes the draft as a whole definition, which is what a completed pick asks for.
 *
 * @summary One write commits the account and the model together, because the stored shape
 * refuses half a binding. A landed write graduates the draft and announces it; a refused one
 * holds the draft with every word intact and says why, both out loud and in the inspector.
 */
export function completedDraftPick(
  world: CanvasWorld,
  accountId: string,
  providerModel: string,
): void {
  const definition = heldDraft(world.slug)?.definition ?? emptyDefinition();
  const settled = { ...definition, accountId, providerModel };

  committedPick(world, `target:${settled.id}`, gatewayDefining(world.gateway, settled), () => {
    graduatedDraft(world, settled, targetNameIn(world.accounts, accountId));
  });
}

/**
 * Aims one stored definition at the picked target, which rebinds or repairs it.
 *
 * @summary The definition keeps its id and its name, because a person rebinding is aiming the
 * model they already named somewhere new. A binding whose account had left reads as repaired
 * rather than rebound, since what the person fixed was a break rather than a choice.
 */
export function completedRebindPick(
  world: CanvasWorld,
  accountId: string,
  providerModel: string,
): void {
  const picker = world.standings.picker;
  const modelId = picker === undefined ? undefined : modelIdOf(picker.from);
  const model = world.gateway.virtualModels.find((held) => held.id === modelId);

  if (modelId === undefined || model === undefined) {
    return;
  }

  const bound = targetTheEntryNames(model.routing);
  const wasBroken = world.accounts.every((held) => held.id !== bound?.accountId);

  committedPick(
    world,
    `target:${modelId}`,
    gatewayRebinding(world.gateway, modelId, { kind: 'target', accountId, providerModel }),
    () => {
      world.standings.announce({
        kind: wasBroken ? 'repaired' : 'rebound',
        virtualModel: model.displayName,
        target: targetNameIn(world.accounts, accountId),
      });
    },
  );
}

/**
 * Releases a binding into a held draft that keeps its name, its id, and its seat.
 *
 * @summary The stored shape carries no virtual model without a target, so unbinding takes the
 * definition out of the gateway and stands what a person typed as a draft card in the same place.
 * Rebinding the draft writes it back, which is why the unbind itself needs no confirmation.
 */
export function releasedBinding(world: CanvasWorld, modelId: string, selectDraft = true): void {
  const model = world.gateway.virtualModels.find((held) => held.id === modelId);

  if (model === undefined) {
    return;
  }

  const seat = world.seats[`model:${modelId}`] ?? { x: 0, y: 0 };

  world.define.mutate(gatewayReleasing(world.gateway, modelId), {
    onSuccess: () => {
      startDrafting(
        world.slug,
        { displayName: model.displayName, id: model.id, accountId: '', providerModel: '' },
        seat,
      );
      world.standings.select(selectDraft ? 'draft' : undefined);

      if (!selectDraft) {
        closeInspector();
      }

      world.standings.announce({ kind: 'released', virtualModel: model.displayName });
    },
    onError: world.standings.refuse,
  });
}

function boundModelOf(world: CanvasWorld, nodeId: string) {
  const modelId = targetModelIdOf(nodeId);

  return world.gateway.virtualModels.find((held) => held.id === modelId);
}

/**
 * Turns a Delete press on a target card into the removal question.
 *
 * @summary A target card stands for exactly one binding, and releasing still takes a stored
 * definition off the gateway, so a press this small never does that unannounced.
 */
export function askedTargetRemoval(world: CanvasWorld, nodeId: string): void {
  if (boundModelOf(world, nodeId) !== undefined) {
    world.standings.setRemoving(nodeId);
  }
}

/**
 * Releases the one binding a confirmed target removal held, standing its model back as a draft.
 *
 * @summary Deleting the card unbinds rather than destroys, because the target is a reference to a
 * stored account and the definition aimed at it is the person's own work.
 */
export function releasedTarget(world: CanvasWorld, nodeId: string): void {
  const model = boundModelOf(world, nodeId);

  if (model !== undefined) {
    releasedBinding(world, model.id, false);
  }
}

/**
 * Removes what a confirmed deletion named: the held draft, or a whole stored definition.
 *
 * @summary A removal leaves no draft behind, because the person answered a question that named
 * the definition and chose to let it go, which is the opposite of putting it down for later.
 */
export function removedDefinition(world: CanvasWorld, nodeId: string): void {
  if (nodeId === 'draft') {
    leaveDrafting(world.slug);
    world.standings.select(undefined);
    closeInspector();

    return;
  }

  const modelId = modelIdOf(nodeId);

  if (modelId === undefined) {
    return;
  }

  world.define.mutate(gatewayReleasing(world.gateway, modelId), {
    onSuccess: () => {
      world.standings.select(undefined);
      closeInspector();
    },
    onError: world.standings.refuse,
  });
}
