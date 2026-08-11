import { useEffect } from 'react';

import { drivenFocus } from './arrow-drive';

const ARROW_OWNER = [
  'input',
  'textarea',
  'select',
  "[contenteditable='']",
  "[contenteditable='true']",
  "[role='listbox']",
  "[role='radiogroup']",
  "[role='radio']",
  "[role='menu']",
  "[role='menubar']",
  "[role='slider']",
  "[role='separator']",
  "[role='tablist']",
  "[role='combobox']",
].join(', ');

const WALKABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  "[tabindex]:not([tabindex='-1'])",
].join(', ');

const GROUP = '[data-focus-group]';

const REMEMBERED = "[data-status='active'], [aria-pressed='true'], [aria-checked='true']";

type Walk = 'within-back' | 'within-forth' | 'group-back' | 'group-forth' | undefined;

function painted(candidate: HTMLElement): boolean {
  return candidate.getClientRects().length > 0;
}

function walkRoot(): ParentNode {
  return document.querySelector('dialog[open]') ?? document.body;
}

function walkablesIn(root: ParentNode): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(WALKABLE)].filter(painted);
}

const HORIZONTAL_WALKS: Record<string, Walk> = {
  ArrowLeft: 'within-back',
  ArrowRight: 'within-forth',
  ArrowUp: 'group-back',
  ArrowDown: 'group-forth',
};

const VERTICAL_WALKS: Record<string, Walk> = {
  ArrowUp: 'within-back',
  ArrowDown: 'within-forth',
  ArrowLeft: 'group-back',
  ArrowRight: 'group-forth',
};

function walkAskedFor(key: string, horizontal: boolean): Walk {
  const walks = horizontal ? HORIZONTAL_WALKS : VERTICAL_WALKS;

  return walks[key];
}

function steppedWithin(
  group: HTMLElement,
  standing: HTMLElement,
  forth: boolean,
): HTMLElement | undefined {
  const reachable = walkablesIn(group);
  const seat = reachable.indexOf(standing);

  return seat === -1 ? undefined : reachable[seat + (forth ? 1 : -1)];
}

type Planar = { x: number; y: number };

const HEADING: Record<string, Planar> = {
  ArrowRight: { x: 1, y: 0 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowDown: { x: 0, y: 1 },
  ArrowUp: { x: 0, y: -1 },
};

function centerOf(rect: DOMRect): Planar {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

/**
 * How far the eye travels to reach a candidate: distance along the arrow counts once, drift off
 * its line counts double, and a candidate behind the arrow stands out of reach.
 */
function travelScore(from: Planar, to: Planar, heading: Planar): number | undefined {
  const along = (to.x - from.x) * heading.x + (to.y - from.y) * heading.y;
  const across = Math.abs((to.x - from.x) * heading.y) + Math.abs((to.y - from.y) * heading.x);

  return along <= 1 ? undefined : along + across * 2;
}

/** The nearest control in the pressed direction, weighed the way an eye travels. */
function steppedToward(
  group: HTMLElement,
  standing: HTMLElement,
  key: string,
): HTMLElement | undefined {
  const heading = HEADING[key];

  if (heading === undefined) {
    return undefined;
  }

  const from = centerOf(standing.getBoundingClientRect());

  let nearest: HTMLElement | undefined;
  let nearestScore = Number.POSITIVE_INFINITY;

  for (const candidate of walkablesIn(group)) {
    const score = travelScore(from, centerOf(candidate.getBoundingClientRect()), heading);

    if (score !== undefined && score < nearestScore) {
      nearestScore = score;
      nearest = candidate;
    }
  }

  return nearest;
}

/**
 * The control a group greets the walk with: what it remembers as chosen, or its first reachable.
 */
function greeterOf(group: HTMLElement): HTMLElement | undefined {
  const remembered = [...group.querySelectorAll<HTMLElement>(REMEMBERED)].filter(painted);

  return remembered[0] ?? walkablesIn(group)[0];
}

function neighborGroup(
  root: ParentNode,
  standing: HTMLElement,
  forth: boolean,
): HTMLElement | undefined {
  const groups = [...root.querySelectorAll<HTMLElement>(GROUP)].filter(painted);
  const seat = groups.indexOf(standing);

  return seat === -1 ? undefined : groups[seat + (forth ? 1 : -1)];
}

function flatStep(
  root: ParentNode,
  standing: HTMLElement,
  forth: boolean,
): HTMLElement | undefined {
  const reachable = walkablesIn(root);
  const seat = reachable.indexOf(standing);

  if (seat === -1) {
    return undefined;
  }

  return reachable[(seat + (forth ? 1 : -1) + reachable.length) % reachable.length];
}

function arrowClaimedElsewhere(event: KeyboardEvent): boolean {
  return !event.key.startsWith('Arrow') || event.metaKey || event.ctrlKey || event.altKey;
}

function standingIn(root: ParentNode): HTMLElement | undefined {
  const standing = document.activeElement;

  if (!(standing instanceof HTMLElement) || standing.closest(ARROW_OWNER) !== null) {
    return undefined;
  }

  return root.contains(standing) ? standing : undefined;
}

function landedOn(event: KeyboardEvent, next: HTMLElement | undefined): void {
  if (next !== undefined) {
    event.preventDefault();
    drivenFocus(next);
  }
}

function crossedToNeighbor(
  root: ParentNode,
  group: HTMLElement,
  forth: boolean,
): HTMLElement | undefined {
  const neighbor = neighborGroup(root, group, forth);

  return neighbor === undefined ? undefined : greeterOf(neighbor);
}

function walkedFlat(event: KeyboardEvent, root: ParentNode, standing: HTMLElement): void {
  const forth = event.key === 'ArrowDown' || event.key === 'ArrowRight';

  landedOn(event, flatStep(root, standing, forth));
}

function walkedSpatially(
  event: KeyboardEvent,
  root: ParentNode,
  group: HTMLElement,
  standing: HTMLElement,
): void {
  const toward = steppedToward(group, standing, event.key);

  if (toward !== undefined) {
    landedOn(event, toward);

    return;
  }

  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    landedOn(event, crossedToNeighbor(root, group, event.key === 'ArrowRight'));
  }
}

function walkedAlongAxis(
  event: KeyboardEvent,
  root: ParentNode,
  group: HTMLElement,
  standing: HTMLElement,
  horizontal: boolean,
): void {
  const walk = walkAskedFor(event.key, horizontal);

  if (walk === undefined) {
    return;
  }

  const next =
    walk === 'within-back' || walk === 'within-forth'
      ? steppedWithin(group, standing, walk === 'within-forth')
      : crossedToNeighbor(root, group, walk === 'group-forth');

  landedOn(event, next);
}

/**
 * Moves focus along the arrows, letting every pane declare itself instead of wiring each control.
 *
 * @summary A container carrying `data-focus-group` is one pane: arrows along its axis step
 * control by control inside it and stop at its edges, and arrows across its axis leave for the
 * neighboring pane, which greets the walk with whatever it holds as chosen. A control outside any
 * pane falls back to a flat walk over everything reachable, so no surface goes dead. Widgets that
 * already speak arrows keep them, and an open modal dialog bounds the whole walk.
 */
export function walkedWithArrow(event: KeyboardEvent): void {
  if (arrowClaimedElsewhere(event)) {
    return;
  }

  const root = walkRoot();
  const standing = standingIn(root);

  if (standing === undefined) {
    return;
  }

  const group = standing.closest<HTMLElement>(GROUP);

  if (group === null) {
    walkedFlat(event, root, standing);

    return;
  }

  const mode = group.getAttribute('data-focus-group');

  if (mode === 'spatial') {
    walkedSpatially(event, root, group, standing);

    return;
  }

  walkedAlongAxis(event, root, group, standing, mode === 'horizontal');
}

/** Stands the arrow walk over the whole window for as long as the shell lives. */
export function useArrowWalk(): void {
  useEffect(() => {
    window.addEventListener('keydown', walkedWithArrow);

    return () => {
      window.removeEventListener('keydown', walkedWithArrow);
    };
  }, []);
}
