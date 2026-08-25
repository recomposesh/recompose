const readers = new Set<() => void>();

/** Hears the View menu asking for setup again, for as long as the caller listens. */
export function subscribeToSetupReopened(reader: () => void): () => void {
  readers.add(reader);

  return () => {
    readers.delete(reader);
  };
}

/**
 * Tells whatever holds setup that a person asked for it again.
 *
 * @summary The menu lives in another process and the surface lives in the renderer, so the ask
 * arrives as a push and lands here rather than in a route or a query. It carries nothing: what
 * step setup opens on is a question for the profile, the same as on a launch.
 */
export function setupReopened(): void {
  for (const reader of readers) {
    reader();
  }
}
