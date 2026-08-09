import { useSyncExternalStore } from 'react';

import type { XY } from './canvas-positions';
import type { SettledDefinition } from './model-draft';

/** A definition a person began and has not finished, standing at its seat on the canvas. */
export type HeldDraft = {
  /** What the person has said so far, which the inspector edits and the draft card reads. */
  definition: SettledDefinition;
  /** Where the draft card stands, which an unbind and a drag both choose. */
  seat: XY;
};

const held = new Map<string, HeldDraft>();

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

/** The draft this gateway holds, or nothing while every definition on it is finished. */
export function heldDraft(slug: string): HeldDraft | undefined {
  return held.get(slug);
}

/** Stands a draft on the canvas, from the gateway's plus, a dropped cable, or an unbind. */
export function startDrafting(slug: string, definition: SettledDefinition, seat: XY): void {
  held.set(slug, { definition, seat });
  tellReaders();
}

/** Takes what the person just typed, which the draft card reads back at once. */
export function editDraft(slug: string, definition: SettledDefinition): void {
  const standing = held.get(slug);

  if (standing === undefined) {
    return;
  }

  held.set(slug, { ...standing, definition });
  tellReaders();
}

/** Takes the seat a drag left the draft card at. */
export function moveDraftSeat(slug: string, seat: XY): void {
  const standing = held.get(slug);

  if (standing === undefined) {
    return;
  }

  held.set(slug, { ...standing, seat });
  tellReaders();
}

/** Lets the draft go, which a finished definition and an explicit delete both do. */
export function leaveDrafting(slug: string): void {
  held.delete(slug);
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
