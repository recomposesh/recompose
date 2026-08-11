import type { Edge, Node } from '@xyflow/react';

import type { CanvasFlowWiring } from '../gateway-stage/gateway-stage';
import type { CanvasWorld } from './canvas-standings';

import { askedTargetRemoval, releasedBinding } from './binding-acts';
import { bindingCableId, editingText, modelIdOf, targetModelIdOf } from './canvas-wiring';

function removalQuestionAsked(world: CanvasWorld, nodes: Node[]): boolean {
  const removable = nodes.find(
    (node) => node.id === 'draft' || node.id === 'gateway' || modelIdOf(node.id) !== undefined,
  );

  if (removable !== undefined) {
    world.standings.setRemoving(removable.id);

    return true;
  }

  const target = nodes.find((node) => targetModelIdOf(node.id) !== undefined);

  if (target !== undefined) {
    askedTargetRemoval(world, target.id);

    return true;
  }

  return false;
}

function deletionDecision(
  world: CanvasWorld,
  asked: { nodes: Node[]; edges: Edge[] },
): boolean | { nodes: Node[]; edges: Edge[] } {
  if (editingText(document.activeElement)) {
    return false;
  }

  if (removalQuestionAsked(world, asked.nodes)) {
    return false;
  }

  if (asked.nodes.length > 0) {
    return false;
  }

  const cables = asked.edges.filter((edge) => bindingCableId(edge.id) !== undefined);

  return cables.length > 0 ? { nodes: [], edges: cables } : false;
}

/**
 * The Delete press answered by what stands selected: a question for a card, a release for a cable.
 *
 * @summary A card never leaves unannounced, so any deletable node turns the press into the removal
 * question and stops the flow from deleting anything itself. Only a binding cable passes straight
 * through, because releasing it stands the definition back as a draft rather than destroying work.
 */
export function deletionWiring(
  world: CanvasWorld,
): Pick<CanvasFlowWiring, 'onBeforeDelete' | 'onEdgesDelete'> {
  return {
    onBeforeDelete: async (asked) => Promise.resolve(deletionDecision(world, asked)),
    onEdgesDelete: (deleted) => {
      for (const edge of deleted) {
        const modelId = bindingCableId(edge.id);

        if (modelId !== undefined) {
          releasedBinding(world, modelId);
        }
      }
    },
  };
}
