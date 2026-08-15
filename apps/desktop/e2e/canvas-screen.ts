import type { Locator, Page } from '@playwright/test';

import { expect } from '@playwright/test';
import { targetTheEntryNames } from '@recompose/contracts';

import { gatewayRow, storedGateway } from './gateway-screen';

/** The card the gateway itself stands as, which every composition carries exactly one of. */
export const GATEWAY_NODE = 'gateway';

/** The card a definition nobody has finished stands as, which the overlay owns. */
export const DRAFT_NODE = 'draft';

/** The card holding the spot a cable was let go at, while the picker asks what belongs there. */
export const PENDING_NODE = 'pending';

/** The cable joining the gateway to a draft, namespaced away from any binding a person aliased. */
export const DRAFT_CABLE = 'wire:draft';

/** What the plus on the gateway's port asks for, which is also the name a keyboard reads. */
const GATEWAY_ASK = 'Add a virtual model';

/** What the plus on a virtual model's port asks for, draft or stored alike. */
const TARGET_ASK = 'Pick a provider';

const PLUS_ASKS = new RegExp(`^(${GATEWAY_ASK}|${TARGET_ASK})$`, 'u');

const SEAT_READING = /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/u;

const ZOOM_READING = /scale\(([\d.]+)\)/u;

const WORN_KIND = 'react-flow__node-';

/** Where a card stands in the canvas's own coordinates, which is what an arrangement keeps. */
export type Seat = { x: number; y: number };

export function modelNodeId(modelId: string): string {
  return `model:${modelId}`;
}

export function targetNodeId(modelId: string): string {
  return `target:${modelId}`;
}

export function ghostNodeId(modelId: string): string {
  return `ghost:${modelId}`;
}

export function cableId(modelId: string): string {
  return `cable:${modelId}`;
}

/** The structural wire joining the gateway to a virtual model it serves. */
export function wireId(modelId: string): string {
  return `wire:${modelNodeId(modelId)}`;
}

export function canvasNode(page: Page, nodeId: string): Locator {
  return page.locator(`.react-flow__node[data-id="${nodeId}"]`);
}

export function canvasCable(page: Page, cable: string): Locator {
  return page.locator(`.react-flow__edge[data-id="${cable}"]`);
}

/** The cable between two named cards, never the wire there: the two answer separately. */
export function cableBetween(page: Page, source: string, target: string): Locator {
  return page.locator(
    `.react-flow__edge:not([data-id^="wire:"])[aria-label="Edge from ${source} to ${target}"]`,
  );
}

/** The structural wire between two named cards, which stands apart from any cable there. */
export function wireBetween(page: Page, source: string, target: string): Locator {
  return page.locator(
    `.react-flow__edge[data-id^="wire:"][aria-label="Edge from ${source} to ${target}"]`,
  );
}

/** Selects a gateway and waits for its composition to stand, which is the detail a person opens. */
export async function openGatewayCanvas(page: Page, name: string): Promise<void> {
  await gatewayRow(page, name).click();
  await expect(canvasNode(page, GATEWAY_NODE)).toBeVisible();
}

/** Every card standing on the canvas, named by id in the order the composition seats them. */
export async function standingNodes(page: Page): Promise<string[]> {
  return page
    .locator('.react-flow__node')
    .evaluateAll((cards) => cards.map((card) => card.getAttribute('data-id') ?? ''));
}

/** Every cable standing on the canvas, named by id. */
export async function standingCables(page: Page): Promise<string[]> {
  return page
    .locator('.react-flow__edge')
    .evaluateAll((cables) => cables.map((cable) => cable.getAttribute('data-id') ?? ''));
}

/**
 * Which card a node stands as, which is what tells a draft treatment from the regular one.
 *
 * @summary The canvas wears its kind rather than announcing it, so the reading comes off the
 * class the flow gives the card: `virtual-model` for a stored definition, `draft-model` for one
 * nobody finished, `ghost-target` for an account that left the registry.
 */
export async function nodeTreatment(page: Page, nodeId: string): Promise<string> {
  const worn = await canvasNode(page, nodeId).evaluate((card) =>
    [...card.classList].find((name) => name.startsWith('react-flow__node-')),
  );

  if (worn === undefined) {
    throw new Error(`the card "${nodeId}" wears no kind the canvas can be read by`);
  }

  return worn.slice(WORN_KIND.length);
}

function seatFrom(placed: string, nodeId: string): Seat {
  const found = SEAT_READING.exec(placed);
  const x = found?.[1];
  const y = found?.[2];

  if (x === undefined || y === undefined) {
    throw new Error(`the card "${nodeId}" stands at no readable spot, only "${placed}"`);
  }

  return { x: Number(x), y: Number(y) };
}

/** Where one card stands, in the canvas's coordinates rather than the window's. */
export async function nodeSeat(page: Page, nodeId: string): Promise<Seat> {
  const placed = await canvasNode(page, nodeId).evaluate((card) => card.style.transform);

  return seatFrom(placed, nodeId);
}

/** Where every card stands, which is the whole arrangement a gateway keeps. */
export async function nodeSeats(page: Page): Promise<Record<string, Seat>> {
  const placed = await page
    .locator('.react-flow__node')
    .evaluateAll((cards) =>
      cards.map((card) => ({ id: card.getAttribute('data-id') ?? '', at: card.style.transform })),
    );
  const seats: Record<string, Seat> = {};

  for (const { id, at } of placed) {
    seats[id] = seatFrom(at, id);
  }

  return seats;
}

export function sourcePort(page: Page, nodeId: string): Locator {
  return canvasNode(page, nodeId).locator('.react-flow__handle.source');
}

export function targetPort(page: Page, nodeId: string): Locator {
  return canvasNode(page, nodeId).locator('.react-flow__handle.target');
}

/** The keyboard ask on a card's outgoing port, whichever of the two asks it carries. */
export function portAskOn(page: Page, nodeId: string): Locator {
  return canvasNode(page, nodeId).getByRole('button', { name: PLUS_ASKS });
}

/** The anchor a person takes hold of to move one end of a standing cable. */
export function cableGrabEnd(page: Page, cable: string, end: 'source' | 'target'): Locator {
  return canvasCable(page, cable).locator(`.react-flow__edgeupdater-${end}`);
}

/** The line a cable actually draws, which is empty on a cable the canvas never painted. */
export async function cablePath(page: Page, cable: string): Promise<string> {
  const drawn = await canvasCable(page, cable).locator('.react-flow__edge-path').getAttribute('d');

  return drawn ?? '';
}

/**
 * What the canvas said out loud, without interrupting whatever a person was reading.
 *
 * @operation The flow stands its own assertive region ahead of these in the document, so both
 * regions are read as the stage's own children rather than by their liveness alone.
 */
export function politelySaid(page: Page): Locator {
  return page.locator('section > p[aria-live="polite"]');
}

/** What the canvas interrupted with, which is where a refusal lands. */
export function urgentlySaid(page: Page): Locator {
  return page.locator('section > p[aria-live="assertive"]');
}

/** The question a removal asks before anything leaves the canvas. */
export function removalConfirmation(page: Page, name: string): Locator {
  return page.getByRole('dialog', { name: `Delete the virtual model "${name}"?` });
}

export async function confirmRemoval(page: Page, name: string): Promise<void> {
  await removalConfirmation(page, name).getByRole('button', { name: 'Delete' }).click();
}

/** One tool in the cluster the canvas keeps in its corner, named the way it reads. */
export function canvasTool(page: Page, tool: string): Locator {
  return page.getByLabel('Canvas tools').getByRole('button', { exact: true, name: tool });
}

export function minimap(page: Page): Locator {
  return page.getByLabel('Canvas map');
}

/** How many cards the map draws, which is what mirroring the composition amounts to. */
export async function minimapCards(page: Page): Promise<number> {
  return minimap(page).locator('.react-flow__minimap-node').count();
}

/**
 * How far the view is magnified, read off the transform the canvas places its cards under.
 *
 * @summary A packaged renderer runs under a style policy that names no inline source, so a
 * reading that never lands is the break this proves rather than a canvas that merely sits still.
 */
export async function viewportZoom(page: Page): Promise<number> {
  const placed = await page
    .locator('.react-flow__viewport')
    .evaluate((view) => view.style.transform);
  const found = ZOOM_READING.exec(placed);
  const zoom = found?.[1];

  if (zoom === undefined) {
    throw new Error(`the canvas carries no viewport transform, only "${placed}"`);
  }

  return Number(zoom);
}

/** The measure a pointer meets a control at, which is what a hit target is judged by. */
export async function hitTarget(control: Locator): Promise<{ width: number; height: number }> {
  const box = await control.boundingBox();

  if (box === null) {
    throw new Error('the control stands nowhere a pointer could meet it');
  }

  return { width: box.width, height: box.height };
}

/** What one definition is bound to on disk, which is the outcome every gesture writes toward. */
export async function storedBinding(
  page: Page,
  gateway: string,
  modelId: string,
): Promise<{ accountId: string; providerModel: string } | undefined> {
  const { virtualModels } = await storedGateway(page, gateway);
  const bound = virtualModels.find((model) => model.id === modelId);
  const target = bound === undefined ? undefined : targetTheEntryNames(bound.routing);

  return target === undefined
    ? undefined
    : { accountId: target.accountId, providerModel: target.providerModel };
}
