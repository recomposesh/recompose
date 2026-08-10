import type { Locator, Page } from '@playwright/test';
import type { VirtualModel } from '@recompose/contracts';

import { expect } from '@playwright/test';

import type { Point } from './canvas-gestures';
import type { Seat } from './canvas-screen';

import { standingCables, standingNodes } from './canvas-screen';
import { storedGateway } from './gateway-screen';
import { focusedGateway } from './scenario-memory';

/** How far a card may sit from the spot a cable was let go at and still read as standing there. */
const AT_THE_SPOT = 8;

/** Every card and cable standing, beside the definitions on disk they are drawn from. */
export type Composition = {
  nodes: readonly string[];
  cables: readonly string[];
  definitions: readonly VirtualModel[];
};

const dropPoints = new WeakMap<Page, Point>();

const pendingSeats = new WeakMap<Page, Seat>();

const virtualModelsInFocus = new WeakMap<Page, string>();

const compositionsBefore = new WeakMap<Page, Composition>();

const cablesInFlight = new WeakSet<Page>();

export function recalled<Kept>(held: WeakMap<Page, Kept>, page: Page, missing: string): Kept {
  const kept = held.get(page);

  if (kept === undefined) {
    throw new Error(missing);
  }

  return kept;
}

export function rememberDropPoint(page: Page, spot: Point): void {
  dropPoints.set(page, spot);
}

/** Where a cable was let go, in window pixels, which is what a scenario calls the drop point. */
export function theDropPoint(page: Page): Point {
  return recalled(dropPoints, page, 'no step in this scenario let a cable go on the canvas');
}

export function rememberPendingSeat(page: Page, seat: Seat): void {
  pendingSeats.set(page, seat);
}

/** Where the card waiting on a pick stood, so what materializes there can be read against it. */
export function thePendingSeat(page: Page): Seat {
  return recalled(pendingSeats, page, 'no step in this scenario stood a pending card');
}

export function rememberVirtualModel(page: Page, name: string): void {
  virtualModelsInFocus.set(page, name);
}

/** The virtual model a scenario is about, which the steps naming it record as they go. */
export function virtualModelInFocus(page: Page): string {
  return recalled(
    virtualModelsInFocus,
    page,
    'no step named the virtual model this scenario is about',
  );
}

/** Every card, cable, and stored definition as they stand right now. */
export async function composition(page: Page): Promise<Composition> {
  return {
    nodes: await standingNodes(page),
    cables: await standingCables(page),
    definitions: (await storedGateway(page, focusedGateway(page))).virtualModels,
  };
}

export async function rememberComposition(page: Page): Promise<void> {
  compositionsBefore.set(page, await composition(page));
}

/** The composition as it stood before the act a scenario expects to have changed nothing. */
export function compositionBefore(page: Page): Composition {
  return recalled(
    compositionsBefore,
    page,
    'no step read the composition this scenario expects to stand unchanged',
  );
}

export function rememberCableInFlight(page: Page): void {
  cablesInFlight.add(page);
}

/** Whether this scenario left a cable hanging off the pointer, which Esc has to let go of. */
export function letGoOfAnyCableInFlight(page: Page): boolean {
  const hanging = cablesInFlight.has(page);

  cablesInFlight.delete(page);

  return hanging;
}

/** Where a surface stands in the window, or nothing at all while it stands nowhere. */
type Standing = { x: number; y: number; width: number; height: number } | null;

/** How far a card's corner sits from a spot, which nothing standing reads as immeasurably far. */
function cornerFrom(card: Standing, spot: Point): number {
  return card === null
    ? Number.POSITIVE_INFINITY
    : Math.max(Math.abs(card.x - spot.x), Math.abs(card.y - spot.y));
}

/** How an anchored surface sits against the card it belongs to: level with it, and under its foot. */
function hangingOff(under: Standing, anchor: Standing): { level: boolean; beneath: boolean } {
  if (under === null || anchor === null) {
    return { level: false, beneath: false };
  }

  return {
    level: Math.abs(under.x - anchor.x) <= AT_THE_SPOT,
    beneath: under.y >= anchor.y + anchor.height,
  };
}

/** Reads a card as standing where a cable was let go, within the width of a pointer's aim. */
export async function standsAt(card: Locator, spot: Point): Promise<void> {
  await expect
    .poll(async () => cornerFrom(await card.boundingBox(), spot))
    .toBeLessThanOrEqual(AT_THE_SPOT);
}

/** Reads one surface as hanging off another, which is what anchoring amounts to on the canvas. */
export async function anchoredUnder(hanging: Locator, anchor: Locator): Promise<void> {
  await expect
    .poll(async () => hangingOff(await hanging.boundingBox(), await anchor.boundingBox()))
    .toEqual({ level: true, beneath: true });
}
