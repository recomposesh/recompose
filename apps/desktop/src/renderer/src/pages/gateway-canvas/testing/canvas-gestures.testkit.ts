import type { RouteTarget, VirtualModel } from '@recompose/contracts';

import { targetTheEntryNames } from '@recompose/contracts';
import { vi } from 'vitest';

async function standingPort(
  container: HTMLElement,
  nodeId: string,
  end: 'source' | 'target',
): Promise<Element> {
  return vi.waitFor(() => {
    const port = container.querySelector(`[data-id="${nodeId}"] .react-flow__handle.${end}`);

    if (port === null) {
      throw new Error(`no ${end} port stands on "${nodeId}" yet`);
    }

    return port;
  });
}

/** The outgoing port of a card on the canvas, once the card stands to carry it. */
export async function sourcePortOf(container: HTMLElement, nodeId: string): Promise<Element> {
  return standingPort(container, nodeId, 'source');
}

/** The incoming port of a card on the canvas, once the card stands to carry it. */
export async function targetPortOf(container: HTMLElement, nodeId: string): Promise<Element> {
  return standingPort(container, nodeId, 'target');
}

/** The center of a port's own box, which is where a pointer meets it. */
function portPointOf(port: Element): { x: number; y: number } {
  const box = port.getBoundingClientRect();

  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/**
 * Presses a port and pulls the cable toward a point, leaving the drag in flight.
 *
 * @operation The library starts a connection only once a press has traveled past its own
 * threshold, so the pull crosses a midpoint first, and it holds the pull until the connection
 * line stands, because a press that lands before the flow wired its handlers starts nothing. A
 * stray press left over from an earlier scenario is let go once at entry, since the library
 * holds one connection at a time; the wait itself presses again only while no connection line
 * stands, because a mouseup on a started-but-unpainted drag would land it as a real drop.
 */
export async function pulledCable(from: Element, toward: { x: number; y: number }): Promise<void> {
  const start = portPointOf(from);

  document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

  await vi.waitFor(() => {
    if (document.querySelector('.react-flow__connectionline') === null) {
      from.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, clientX: start.x, clientY: start.y }),
      );
      document.dispatchEvent(
        new MouseEvent('mousemove', {
          bubbles: true,
          clientX: start.x + 60,
          clientY: start.y + 40,
        }),
      );
    }

    if (document.querySelector('.react-flow__connectionline') === null) {
      throw new Error('the cable has not left the port yet');
    }
  });

  document.dispatchEvent(
    new MouseEvent('mousemove', { bubbles: true, clientX: toward.x, clientY: toward.y }),
  );
}

/** Lets a pulled cable go at a point, which is where the library reads the drop. */
export function releasedAt(at: { x: number; y: number }): void {
  document.dispatchEvent(
    new MouseEvent('mouseup', { bubbles: true, clientX: at.x, clientY: at.y }),
  );
}

/**
 * Pulls a cable from one port and holds it over another, leaving the drag in flight.
 *
 * @operation A port near the pane's edge auto-pans the canvas away from under the pointer, so
 * the pull chases the port's live position until the library marks the port as the connection's
 * landing, which is the same acknowledgement a person steers by.
 */
export async function draggedCableOver(from: Element, onto: Element): Promise<void> {
  await pulledCable(from, portPointOf(onto));

  await vi.waitFor(
    () => {
      const at = portPointOf(onto);

      document.dispatchEvent(
        new MouseEvent('mousemove', { bubbles: true, clientX: at.x, clientY: at.y }),
      );

      if (!onto.classList.contains('connectingto')) {
        throw new Error('the cable has not reached the port yet');
      }
    },
    { timeout: 5000 },
  );
}

/** Pulls a cable from one port and drops it on another port, in one gesture. */
export async function draggedCable(from: Element, onto: Element): Promise<void> {
  await draggedCableOver(from, onto);

  releasedAt(portPointOf(onto));
}

async function standingAnchor(
  container: HTMLElement,
  cableId: string,
  end: 'source' | 'target',
): Promise<Element> {
  return vi.waitFor(() => {
    const anchor = container.querySelector(
      `[data-id="${cableId}"] .react-flow__edgeupdater-${end}`,
    );

    if (anchor === null) {
      throw new Error(`no ${end} reconnect anchor stands on "${cableId}" yet`);
    }

    return anchor;
  });
}

/** The grab anchor at a cable's target end, once the cable stands to carry it. */
export async function reconnectAnchorOf(container: HTMLElement, cableId: string): Promise<Element> {
  return standingAnchor(container, cableId, 'target');
}

/** The grab anchor at a cable's source end, which is the end the virtual model holds. */
export async function sourceAnchorOf(container: HTMLElement, cableId: string): Promise<Element> {
  return standingAnchor(container, cableId, 'source');
}

/** Takes hold of a card and drags it by an offset, the way a person rearranges the canvas. */
export function draggedCard(card: Element | null, by: { x: number; y: number }): void {
  const box = card?.getBoundingClientRect() ?? new DOMRect();
  const start = { x: box.x + 10, y: box.y + 10 };
  const end = { x: start.x + 4 + by.x, y: start.y + 4 + by.y };

  card?.dispatchEvent(
    new MouseEvent('mousedown', {
      bubbles: true,
      view: window,
      clientX: start.x,
      clientY: start.y,
    }),
  );
  window.dispatchEvent(
    new MouseEvent('mousemove', { view: window, clientX: start.x + 4, clientY: start.y + 4 }),
  );
  window.dispatchEvent(
    new MouseEvent('mousemove', { view: window, clientX: end.x, clientY: end.y }),
  );
  window.dispatchEvent(new MouseEvent('mouseup', { view: window, clientX: end.x, clientY: end.y }));
}

/** The draft card standing on the canvas, or nothing while no draft stands. */
export function draftCardOn(container: HTMLElement): Element | null {
  return container.querySelector('.react-flow__node[data-id="draft"]');
}

/**
 * Presses a card's own frame rather than the card a person reads, once the card stands.
 *
 * @operation The press is a dispatched click on the node's box, because the ports that stand
 * outside the card are what a real pointer meets there and a press on one starts a cable drag,
 * which is a different gesture from the press this asks about.
 */
export async function clickedNodeFrame(container: HTMLElement, nodeId: string): Promise<void> {
  const frame = await vi.waitFor(() => {
    const standing = container.querySelector(`.react-flow__node[data-id="${nodeId}"]`);

    if (standing === null) {
      throw new Error(`no card stands under "${nodeId}"`);
    }

    return standing;
  });

  frame.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

/**
 * Presses a cable once it stands, because edges draw a beat after their cards mount.
 *
 * @operation The press is a dispatched click rather than a pointer, because the click is what
 * the library's edge wrapper listens for, and a real pointer would need the styled hit bands.
 */
export async function clickedCable(container: HTMLElement, cableId: string): Promise<void> {
  const cable = await vi.waitFor(() => {
    const standing = container.querySelector(`[data-id="${cableId}"]`);

    if (standing === null) {
      throw new Error(`no cable stands under "${cableId}"`);
    }

    return standing;
  });

  cable.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

/** The definitions the fake bridge holds right now, which is the read model every gesture writes. */
export async function storedModels(): Promise<readonly VirtualModel[]> {
  const answer = await window.recompose['gateways:list']();

  if (!answer.ok) {
    throw new Error('the fake bridge refused to list gateways');
  }

  return answer.value[0]?.virtualModels ?? [];
}

/** The stored binding of one definition, or nothing once it left the gateway. */
export async function storedBindingOf(
  modelId: string,
): Promise<Omit<RouteTarget, 'kind'> | undefined> {
  const held = await storedModels();
  const model = held.find((one) => one.id === modelId);
  const bound = model === undefined ? undefined : targetTheEntryNames(model.routing);

  return bound === undefined
    ? undefined
    : { accountId: bound.accountId, providerModel: bound.providerModel };
}
