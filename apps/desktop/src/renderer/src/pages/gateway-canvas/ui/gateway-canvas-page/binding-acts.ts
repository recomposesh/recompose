import type { Account, GatewayConfig } from '@recompose/contracts';

import type { SettledDefinition } from '../../lib/model-draft';
import type { CanvasWorld } from './canvas-standings';

import { accountName } from '../../../../entities/account';
import { keepCanvasPositions, setNodePosition } from '../../lib/canvas-position-store';
import {
  emptyDefinition,
  gatewayDefining,
  gatewayRebinding,
  gatewayReleasing,
} from '../../lib/model-draft';
import { heldDraft, leaveDrafting, startDrafting } from '../../lib/use-held-draft';
import { modelIdOf } from './canvas-wiring';

/** The name a definition answers to out loud, which is its id until a person names it. */
export function spokenNameOf(definition: SettledDefinition): string {
  return definition.displayName === '' ? definition.id : definition.displayName;
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
function seatedWhereTheCableLanded(world: CanvasWorld, accountId: string): () => void {
  const picker = world.standings.picker;
  const at = picker !== undefined && 'at' in picker ? picker.at : undefined;
  const nodeId = `target:${accountId}`;
  const alreadyStanding = world.graph.nodes.some((node) => node.id === nodeId);

  return () => {
    if (at === undefined || alreadyStanding) {
      return;
    }

    setNodePosition(world.slug, nodeId, at);
    keepCanvasPositions(world.slug);
  };
}

function committedPick(
  world: CanvasWorld,
  accountId: string,
  rewritten: GatewayConfig,
  landed: () => void,
): void {
  const seatTheTarget = seatedWhereTheCableLanded(world, accountId);

  world.define.mutate(rewritten, {
    onSuccess: () => {
      world.standings.setPicker(undefined);
      seatTheTarget();
      landed();
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

  committedPick(world, accountId, gatewayDefining(world.gateway, settled), () => {
    leaveDrafting(world.slug);
    world.standings.select(`model:${settled.id}`);
    world.standings.announce({
      kind: 'bound',
      virtualModel: spokenNameOf(settled),
      target: targetNameIn(world.accounts, accountId),
    });
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

  const wasBroken = world.accounts.every((held) => held.id !== model.target.accountId);

  committedPick(
    world,
    accountId,
    gatewayRebinding(world.gateway, modelId, { accountId, providerModel }),
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
export function releasedBinding(world: CanvasWorld, modelId: string): void {
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
      world.standings.select('draft');
      world.standings.announce({ kind: 'released', virtualModel: model.displayName });
    },
    onError: world.standings.refuse,
  });
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

    return;
  }

  const modelId = modelIdOf(nodeId);

  if (modelId === undefined) {
    return;
  }

  world.define.mutate(gatewayReleasing(world.gateway, modelId), {
    onSuccess: () => {
      world.standings.select(undefined);
    },
    onError: world.standings.refuse,
  });
}
