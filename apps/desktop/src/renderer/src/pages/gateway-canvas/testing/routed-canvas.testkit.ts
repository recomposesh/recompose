import { vi } from 'vitest';

import type { XY } from '../lib/canvas-positions';

import { pulledCable, releasedAt, sourcePortOf, storedModels } from './canvas-gestures.testkit';

function paneSpot(container: HTMLElement, from: XY): XY {
  const pane = container.querySelector('.react-flow')?.getBoundingClientRect() ?? new DOMRect();

  return { x: pane.left + from.x, y: pane.top + from.y };
}

/** Pulls a cable off one card's port and lets it go on a clear patch of the pane. */
export async function droppedOnOpenCanvas(container: HTMLElement, nodeId: string): Promise<void> {
  const letGo = paneSpot(container, { x: 560, y: 440 });

  await pulledCable(await sourcePortOf(container, nodeId), letGo);
  releasedAt(letGo);
}

/** The routing one stored definition holds, read back through the bridge. */
export async function routingOf(modelId: string) {
  const held = await storedModels();

  return held.find((model) => model.id === modelId)?.routing;
}

/** The children the entry router of one definition holds, or nothing where it binds a target. */
export async function ladderUnder(modelId: string): Promise<readonly string[] | undefined> {
  const routing = await routingOf(modelId);
  const entry = routing === undefined ? undefined : routing.nodes[routing.entry];

  return entry?.kind === 'router' ? entry.children : undefined;
}

/** Where a card stands on the pane, as the transform the flow seated it with. */
export function cardSeat(container: HTMLElement, selector: string): string | undefined {
  return container.querySelector<HTMLElement>(`.react-flow__node${selector}`)?.style.transform;
}

/**
 * Presses one card until the canvas reads it as selected, which is what a Delete press then names.
 *
 * @operation Two accounts can wear the same label, so a scenario about one card of a pool has to
 * name it by its route node rather than by the words on it.
 */
export async function selectedCard(container: HTMLElement, nodeId: string): Promise<void> {
  await vi.waitFor(() => {
    const card = container.querySelector<HTMLElement>(
      `.react-flow__node[data-id="${nodeId}"] button[aria-pressed]`,
    );

    if (card === null) {
      throw new Error(`no card stands under "${nodeId}" yet`);
    }

    card.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    card.focus();

    if (card.getAttribute('aria-pressed') !== 'true') {
      throw new Error(`the card under "${nodeId}" has not taken the selection yet`);
    }
  });
}
