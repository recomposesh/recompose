import contextMenu from 'electron-context-menu';

import { editingMenuBelongs } from './editing-context-menu';

/**
 * Puts the platform's editing menu behind every right-click that asked for one.
 *
 * @summary It registers once for the whole app rather than per window, so a window opened later
 * answers the same way without a second call. Searching a selection with Google is left off: it
 * would carry whatever a person selected in this app out to a search engine, and a gateway holds
 * addresses and model ids rather than prose anyone means to look up.
 */
export function registerEditingContextMenu(): void {
  contextMenu({
    showSearchWithGoogle: false,
    shouldShowMenu: (_event, parameters) => editingMenuBelongs(parameters),
  });
}
