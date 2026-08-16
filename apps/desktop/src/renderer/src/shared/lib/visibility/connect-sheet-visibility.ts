const readers = new Set<() => void>();

let open = false;

function tellReaders(): void {
  for (const reader of readers) {
    reader();
  }
}

/** Watches the connect sheet, so the toolbar control and the sheet itself agree on one answer. */
export function subscribeToConnectSheetVisibility(reader: () => void): () => void {
  readers.add(reader);

  return () => {
    readers.delete(reader);
  };
}

/**
 * Whether the connect sheet stands over the canvas.
 *
 * @summary It stands away with the app rather than remembering the last answer, because a person
 * opens a gateway for the canvas and asks how to reach it once the wiring is done.
 */
export function connectSheetOpen(): boolean {
  return open;
}

/**
 * Brings the sheet out, which is what the toolbar control asks for.
 *
 * @summary A sheet already out changes nothing, so it tells nobody and no reader repaints over an
 * opening that did not happen.
 */
export function openConnectSheet(): void {
  if (open) {
    return;
  }

  open = true;
  tellReaders();
}

/** Puts the sheet away, which is what the scrim, the escape key and the Done control all ask for. */
export function closeConnectSheet(): void {
  if (!open) {
    return;
  }

  open = false;
  tellReaders();
}
