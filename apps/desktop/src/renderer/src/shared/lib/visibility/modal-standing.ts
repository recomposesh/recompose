const readers = new Set<() => void>();

let standing = 0;

function tellReaders(): void {
  for (const reader of readers) {
    reader();
  }
}

/** Watches for questions arriving and leaving, so the menu report follows every ask. */
export function subscribeToModalStanding(reader: () => void): () => void {
  readers.add(reader);

  return () => {
    readers.delete(reader);
  };
}

/**
 * Whether any question dialog stands over the surface right now.
 *
 * @summary A count rather than a flag, because two asks can overlap and the surface only stops
 * being modal once the last one leaves.
 */
export function modalStanding(): boolean {
  return standing > 0;
}

export function modalStood(): void {
  standing += 1;
  tellReaders();
}

export function modalLeft(): void {
  standing -= 1;
  tellReaders();
}
