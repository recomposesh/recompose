import type { QueryClient } from '@tanstack/react-query';

import { useQueryClient } from '@tanstack/react-query';

import type { CanvasWorld } from './canvas-standings';

import {
  engineLogsQueryOptions,
  engineStatesQueryOptions,
  engineTrafficQueryOptions,
  useRemoveGateway,
} from '../../../../shared/api';
import { forgetLookedAtGateway } from '../../../../shared/lib';
import { dropCanvasPositions } from '../../lib/canvas-position-store';
import { dropCanvasViewport } from '../../lib/canvas-viewport-store';
import { emptyDefinition } from '../../lib/model-draft';
import { heldDraft, leaveDrafting } from '../../lib/use-held-draft';
import { removedDefinition, releasedTarget, spokenNameOf, targetNameIn } from './binding-acts';
import { modelIdOf, targetAccountIdIn, targetModelIdOf } from './canvas-wiring';

/** The removal a Delete press asked for, standing until the person answers. */
export type RemovalAsked = {
  kind: 'virtual-model' | 'gateway' | 'target';
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
};

function draftRemovalName(world: CanvasWorld): string {
  return spokenNameOf(heldDraft(world.slug)?.definition ?? emptyDefinition());
}

function removalName(world: CanvasWorld, nodeId: string): string {
  if (nodeId === 'draft') {
    return draftRemovalName(world);
  }

  const model = world.gateway.virtualModels.find((held) => held.id === modelIdOf(nodeId));

  return model?.displayName ?? nodeId;
}

function askPutAway(world: CanvasWorld): () => void {
  return () => {
    world.standings.setRemoving(undefined);
  };
}

function gatewayRemoval(world: CanvasWorld, deleteGateway: () => void): RemovalAsked {
  const putTheAskAway = askPutAway(world);

  return {
    kind: 'gateway',
    name: world.gateway.displayName || world.slug,
    onConfirm: () => {
      deleteGateway();
      putTheAskAway();
    },
    onCancel: putTheAskAway,
  };
}

function targetRemoval(world: CanvasWorld, nodeId: string): RemovalAsked | undefined {
  const targetAccountId =
    targetModelIdOf(nodeId) === undefined ? undefined : targetAccountIdIn(world.gateway, nodeId);

  if (targetAccountId === undefined) {
    return undefined;
  }

  const putTheAskAway = askPutAway(world);

  return {
    kind: 'target',
    name: targetNameIn(world.accounts, targetAccountId),
    onConfirm: () => {
      releasedTarget(world, nodeId);
      putTheAskAway();
    },
    onCancel: putTheAskAway,
  };
}

function definitionRemoval(world: CanvasWorld, nodeId: string): RemovalAsked {
  const putTheAskAway = askPutAway(world);

  return {
    kind: 'virtual-model',
    name: removalName(world, nodeId),
    onConfirm: () => {
      removedDefinition(world, nodeId);
      putTheAskAway();
    },
    onCancel: putTheAskAway,
  };
}

/**
 * The removal question the canvas is standing on, or nothing while no Delete press asked one.
 *
 * @summary The question reads what the press named: the gateway asks about itself, a target card
 * asks about the binding it serves, and anything else asks about a definition or the held draft.
 * Every answer puts the ask away, so no question outlives the person answering it.
 */
export function removalAsked(
  world: CanvasWorld,
  deleteGateway: () => void,
): RemovalAsked | undefined {
  const nodeId = world.standings.removing;

  if (nodeId === undefined) {
    return undefined;
  }

  if (nodeId === 'gateway') {
    return gatewayRemoval(world, deleteGateway);
  }

  return targetRemoval(world, nodeId) ?? definitionRemoval(world, nodeId);
}

function withoutGateway<Carried>(
  slug: string,
  held: Record<string, Carried> | undefined,
): Record<string, Carried> | undefined {
  if (held === undefined) {
    return held;
  }

  const remaining = { ...held };

  delete remaining[slug];

  return remaining;
}

function forgottenEverywhere(queryClient: QueryClient, slug: string): void {
  dropCanvasPositions(slug);
  dropCanvasViewport(slug);
  leaveDrafting(slug);
  forgetLookedAtGateway(slug);
  queryClient.removeQueries({ queryKey: engineLogsQueryOptions(slug).queryKey });
  queryClient.setQueryData(engineTrafficQueryOptions.queryKey, (held) =>
    withoutGateway(slug, held),
  );
  queryClient.setQueryData(engineStatesQueryOptions.queryKey, (held) => withoutGateway(slug, held));
}

/**
 * The one act that deletes this gateway, leaving nothing of it behind on this side.
 *
 * @summary A landed delete drops the arrangement, the viewport, the draft, the last-looked-at
 * memory, and every cached reading held under the slug, because a gateway that no longer exists
 * must not greet its own ghost on the next visit. Only then does the caller hear it is gone, so
 * the leave lands on a canvas already clean. A refused delete answers through the standings.
 */
export function useGatewayRemoval(
  slug: string,
  refuse: (failure: unknown) => void,
  onGatewayRemoved: () => void,
): () => void {
  const queryClient = useQueryClient();
  const removeGateway = useRemoveGateway();

  return () => {
    removeGateway.mutate(
      { slug },
      {
        onSuccess: () => {
          forgottenEverywhere(queryClient, slug);
          onGatewayRemoved();
        },
        onError: refuse,
      },
    );
  };
}
