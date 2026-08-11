/**
 * Opens a question dialog as a modal the moment it mounts.
 *
 * @summary Reach for it as the ref of any `<dialog>` that asks before an act, so every ask opens
 * the same way and none forgets the modal barrier that keeps the canvas from answering behind it.
 */
export function shownAsAskModal(asking: HTMLDialogElement | null): void {
  if (asking !== null && !asking.open) {
    asking.showModal();
  }
}
