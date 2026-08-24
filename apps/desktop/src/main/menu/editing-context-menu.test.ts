import { describe, expect, test } from 'vitest';

import { editingMenuBelongs } from './editing-context-menu';

describe('where the native editing menu belongs', () => {
  test('a right-click inside a text field offers the editing menu', () => {
    expect(editingMenuBelongs({ isEditable: true, selectionText: '' })).toBe(true);
  });

  test('a right-click over selected text offers the editing menu', () => {
    expect(editingMenuBelongs({ isEditable: false, selectionText: '127.0.0.1:8788' })).toBe(true);
  });

  test('a right-click on bare chrome leaves the menu to the app', () => {
    expect(editingMenuBelongs({ isEditable: false, selectionText: '' })).toBe(false);
  });

  test('a selection of whitespace alone is no selection', () => {
    expect(editingMenuBelongs({ isEditable: false, selectionText: '  \n ' })).toBe(false);
  });

  test('an empty field still offers the editing menu, since paste needs no selection', () => {
    expect(editingMenuBelongs({ isEditable: true, selectionText: '   ' })).toBe(true);
  });
});
