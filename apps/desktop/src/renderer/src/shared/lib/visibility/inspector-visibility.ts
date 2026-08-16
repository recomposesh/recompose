const readers = new Set<() => void>();

let open = false;

function tellReaders(): void {
  for (const reader of readers) {
    reader();
  }
}

/** Watches the inspector for changes, so the node, the toolbar and the drawer repaint together. */
export function subscribeToInspectorVisibility(reader: () => void): () => void {
  readers.add(reader);

  return () => {
    readers.delete(reader);
  };
}

/**
 * Whether the selected gateway's inspector stands open.
 *
 * @summary It opens away, because a person entering a gateway came for the canvas, and the drawer
 * is a thing they open by pointing at what they mean.
 */
export function inspectorOpen(): boolean {
  return open;
}

/**
 * Brings the inspector out, which is what a gesture that leaves work unfinished asks for.
 *
 * @summary Reach for it where a person answered something on the canvas that the drawer has to
 * finish, so the panel arrives already holding the question rather than waiting to be found.
 */
export function openInspector(): void {
  if (!open) {
    open = true;
    tellReaders();
  }
}

/** Puts the inspector away, which is what leaving a gateway's detail asks for. */
export function closeInspector(): void {
  if (open) {
    open = false;
    tellReaders();
  }
}

/**
 * Turns the inspector over, which is what both the gateway node and the toolbar control ask for.
 *
 * @summary Two controls drive one panel, so they share this answer rather than each holding their
 * own. That is what stops the toolbar from reading closed while the node reads selected.
 */
export function toggleInspector(): void {
  open = !open;
  tellReaders();
}
