import { Menu } from 'electron';

import { buildAppMenuTemplate, type AppMenuHandlers, type AppMenuView } from './app-menu-template';

export function installAppMenu(handlers: AppMenuHandlers, view: AppMenuView): void {
  Menu.setApplicationMenu(
    Menu.buildFromTemplate(buildAppMenuTemplate(process.platform, handlers, view)),
  );
}
