const readers = new Set<() => void>();

let standing = false;

/** Watches setup arriving and leaving, so the menu report follows the surface. */
export function subscribeToSetupSurface(reader: () => void): () => void {
  readers.add(reader);

  return () => {
    readers.delete(reader);
  };
}

/** Whether setup holds the window right now. */
export function setupSurfaceStanding(): boolean {
  return standing;
}

/**
 * Records setup arriving or leaving, and tells everything watching.
 *
 * @summary The menu has to stand its route-scoped rows down while setup holds the window, and the
 * only thing that knows setup stands is setup. A flag rather than a count, because setup is one
 * surface and can never overlap itself.
 */
export function setupSurfaceStood(stood: boolean): void {
  if (standing === stood) {
    return;
  }

  standing = stood;

  for (const reader of readers) {
    reader();
  }
}
