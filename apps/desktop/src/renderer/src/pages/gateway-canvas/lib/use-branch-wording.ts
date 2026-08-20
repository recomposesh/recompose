import { useSyncExternalStore } from 'react';

/** Which branch a person is wording, and what it already says. */
export type BranchBeingWorded = {
  /** The definition holding the router, which the write rewrites as a whole. */
  modelId: string;
  /** The conditional router whose policy carries the branch. */
  routerId: string;
  /** The child the branch sends requests to, which is what the branch is keyed by. */
  child: string;
  /** The label as it stands, empty on a branch nobody has worded yet. */
  label: string;
  /** The rule as it stands, empty on a branch nobody has worded yet. */
  rule: string;
  /** What the branch routes to, named the way the canvas already named that card. */
  routesTo: string;
};

let worded: BranchBeingWorded | undefined;

const readers = new Set<() => void>();

function tellReaders(): void {
  for (const reader of readers) {
    reader();
  }
}

function subscribeToBranchWording(reader: () => void): () => void {
  readers.add(reader);

  return () => {
    readers.delete(reader);
  };
}

/** The branch standing open for wording right now, or nothing while none is. */
export function branchBeingWorded(): BranchBeingWorded | undefined {
  return worded;
}

/**
 * Opens the editor on one branch, from the cable that draws it or from the birth that made it.
 *
 * @summary The standing lives beside the component tree rather than inside the canvas page,
 * because the two gestures that open it are a press on a cable and a landed write, and neither of
 * those sits anywhere near the surface that has to draw the editor.
 */
export function wordBranch(branch: BranchBeingWorded): void {
  worded = branch;
  tellReaders();
}

/** Closes the editor, which a save, a cancel, and a dismissal all do. */
export function leaveWording(): void {
  worded = undefined;
  tellReaders();
}

/** The branch standing open for wording, read live from wherever the editor is drawn. */
export function useBranchWorded(): BranchBeingWorded | undefined {
  return useSyncExternalStore(subscribeToBranchWording, branchBeingWorded);
}
