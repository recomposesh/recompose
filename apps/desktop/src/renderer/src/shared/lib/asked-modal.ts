import { modalLeft, modalStood } from './visibility/modal-standing';

/**
 * Opens a question dialog as a modal the moment it mounts, and counts it standing.
 *
 * @summary Reach for it as the ref of any `<dialog>` that asks before an act, so every ask opens
 * the same way and none forgets the modal barrier that keeps the canvas from answering behind it.
 * It is also the one seam every ask passes, which is what lets the menu report read whether a
 * question stands.
 */
export function shownAsAskModal(asking: HTMLDialogElement | null): void {
  if (asking !== null && !asking.open) {
    asking.showModal();
    modalStood();

    return;
  }

  if (asking === null) {
    modalLeft();
  }
}
