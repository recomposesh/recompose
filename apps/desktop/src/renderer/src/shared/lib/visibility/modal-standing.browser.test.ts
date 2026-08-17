import { expect, test } from 'vitest';

import { shownAsAskModal } from '../asked-modal';
import { modalStanding, subscribeToModalStanding } from './modal-standing';

function attachedDialog(): HTMLDialogElement {
  const dialog = document.createElement('dialog');

  document.body.append(dialog);

  return dialog;
}

test('no question stands on a fresh surface', () => {
  expect(modalStanding()).toBe(false);
});

test('a question shown as an ask modal stands until it leaves', () => {
  const dialog = attachedDialog();

  shownAsAskModal(dialog);

  expect(modalStanding()).toBe(true);

  shownAsAskModal(null);
  dialog.remove();

  expect(modalStanding()).toBe(false);
});

test('two standing questions keep the surface modal until both leave', () => {
  const first = attachedDialog();

  shownAsAskModal(first);

  const second = attachedDialog();

  shownAsAskModal(second);
  shownAsAskModal(null);

  expect(modalStanding()).toBe(true);

  shownAsAskModal(null);
  first.remove();
  second.remove();

  expect(modalStanding()).toBe(false);
});

test('every arrival and leaving tells the readers, so the report follows the ask', () => {
  const told: boolean[] = [];
  const letGo = subscribeToModalStanding(() => {
    told.push(modalStanding());
  });
  const dialog = attachedDialog();

  shownAsAskModal(dialog);
  shownAsAskModal(null);
  dialog.remove();
  letGo();

  expect(told).toEqual([true, false]);
});
