import { useSyncExternalStore } from 'react';

import type { XY } from './canvas-positions';
import type { SettledDefinition } from './model-draft';

import { isSeat } from './canvas-positions';

/** A definition a person began and has not finished, standing at its seat on the canvas. */
export type HeldDraft = {
  /** What the person has said so far, which the inspector edits and the draft card reads. */
  definition: SettledDefinition;
  /** Where the draft card stands, which an unbind and a drag both choose. */
  seat: XY;
};

const held = new Map<string, HeldDraft>();

const woken = new Set<string>();

function keyFor(slug: string): string {
  return `recompose.canvas.draft.${slug}`;
}

function isWord(value: unknown): value is string {
  return typeof value === 'string';
}

const DEFINITION_WORDS = ['displayName', 'id', 'accountId', 'providerModel'] as const;

/**
 * @summary A draft written before the drawer asked which shape a binding takes carries no answer,
 * so an absent one reads as a draft still standing at the ask rather than as a draft to discard.
 */
function isBinding(value: unknown): boolean {
  return value === undefined || value === 'router' || value === 'target';
}

function isRouterMode(value: unknown): boolean {
  return value === undefined || value === 'failover' || value === 'round-robin';
}

function isDefinition(value: unknown): value is SettledDefinition {
  return (
    typeof value === 'object' &&
    value !== null &&
    DEFINITION_WORDS.every((word) => isWord(Reflect.get(value, word))) &&
    isBinding(Reflect.get(value, 'bindsThrough')) &&
    isRouterMode(Reflect.get(value, 'routerMode'))
  );
}

function isHeldDraft(value: unknown): value is HeldDraft {
  return (
    typeof value === 'object' &&
    value !== null &&
    isDefinition(Reflect.get(value, 'definition')) &&
    isSeat(Reflect.get(value, 'seat'))
  );
}

function storedDraftRead(written: string | null): HeldDraft | undefined {
  try {
    const read: unknown = JSON.parse(written ?? '');

    return isHeldDraft(read) ? { definition: read.definition, seat: read.seat } : undefined;
  } catch {
    return undefined;
  }
}

function shelf(): Storage | undefined {
  return typeof localStorage === 'undefined' ? undefined : localStorage;
}

function writeDown(slug: string): void {
  const standing = held.get(slug);

  if (standing === undefined) {
    shelf()?.removeItem(keyFor(slug));

    return;
  }

  shelf()?.setItem(keyFor(slug), JSON.stringify(standing));
}

const readers = new Set<() => void>();

function tellReaders(): void {
  for (const reader of readers) {
    reader();
  }
}

/** Watches the held drafts, so the canvas and the inspector repaint together. */
export function subscribeToHeldDrafts(reader: () => void): () => void {
  readers.add(reader);

  return () => {
    readers.delete(reader);
  };
}

function wokenDraft(slug: string): HeldDraft | undefined {
  woken.add(slug);

  const written = storedDraftRead(shelf()?.getItem(keyFor(slug)) ?? null);

  if (written !== undefined) {
    held.set(slug, written);
  }

  return written;
}

/** The draft this gateway holds, woken from the last session's writing on the first look. */
export function heldDraft(slug: string): HeldDraft | undefined {
  const standing = held.get(slug);

  if (standing !== undefined || woken.has(slug)) {
    return standing;
  }

  return wokenDraft(slug);
}

/** Stands a draft on the canvas, from the gateway's plus, a dropped cable, or an unbind. */
export function startDrafting(slug: string, definition: SettledDefinition, seat: XY): void {
  woken.add(slug);
  held.set(slug, { definition, seat });
  writeDown(slug);
  tellReaders();
}

/** Takes what the person just typed, which the draft card reads back at once. */
export function editDraft(slug: string, definition: SettledDefinition): void {
  const standing = held.get(slug);

  if (standing === undefined) {
    return;
  }

  held.set(slug, { ...standing, definition });
  writeDown(slug);
  tellReaders();
}

/** Takes the seat a drag left the draft card at. */
export function moveDraftSeat(slug: string, seat: XY): void {
  const standing = held.get(slug);

  if (standing === undefined) {
    return;
  }

  held.set(slug, { ...standing, seat });
  writeDown(slug);
  tellReaders();
}

/** Lets the draft go, which a finished definition and an explicit delete both do. */
export function leaveDrafting(slug: string): void {
  woken.add(slug);
  held.delete(slug);
  writeDown(slug);
  tellReaders();
}

/**
 * The draft this gateway holds, read live from where every screen can reach it.
 *
 * @summary The draft lives beside the component tree rather than inside it, so it holds through
 * deselection, an inspector close, and leaving the screen entirely, and leaves only on a completed
 * definition or an explicit delete. A person who put a definition down mid-thought finds it
 * standing where they left it, still saying what it said.
 */
export function useHeldDraft(slug: string): HeldDraft | undefined {
  return useSyncExternalStore(subscribeToHeldDrafts, () => heldDraft(slug));
}
