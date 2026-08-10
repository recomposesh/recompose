const readers = new Set<() => void>();

let open = false;

function tellReaders(): void {
  for (const reader of readers) {
    reader();
  }
}

/** Watches the logs drawer for changes, so the footer control and the menu item repaint together. */
export function subscribeToLogsDrawerVisibility(reader: () => void): () => void {
  readers.add(reader);

  return () => {
    readers.delete(reader);
  };
}

/**
 * Whether the logs drawer stands open under the stage.
 *
 * @summary It stands shut with the app rather than remembering the last answer, because the stage
 * is what a person navigates to a gateway for and the rows are what they ask for after that.
 */
export function logsDrawerOpen(): boolean {
  return open;
}

/**
 * Turns the drawer over, which is what the footer's disclosure control and the menu item both ask
 * for.
 *
 * @summary Two controls drive one drawer, so they share this answer rather than each holding their
 * own. That is what stops the menu item from reading unchecked while the drawer stands open.
 */
export function toggleLogsDrawer(): void {
  open = !open;
  tellReaders();
}
