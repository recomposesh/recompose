type EditingContext = {
  isEditable: boolean;
  selectionText: string;
};

/**
 * Whether a right-click asked for the platform's editing menu rather than for the app's own.
 *
 * @summary Electron ships no context menu of its own, so without this the app answers a
 * right-click in a text field with nothing at all. It answers by what the click landed on rather
 * than by where: a field takes the menu even while empty, because paste needs no selection to
 * offer, and bare chrome takes none, which leaves every surface carrying an app menu free to
 * raise its own without two menus opening over one press.
 */
export function editingMenuBelongs(context: EditingContext): boolean {
  return context.isEditable || context.selectionText.trim() !== '';
}
