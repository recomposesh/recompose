import type { TrayMenuHandlers } from './tray-menu-template';

type TraySeams = {
  showWindow: () => void;
  openSettings: () => void;
  openDevtools: () => void;
  quit: () => void;
  lifecycle: {
    start: (slug: string) => void;
    stop: (slug: string) => void;
    restart: (slug: string) => void;
  };
};

export function trayMenuWiring(seams: TraySeams): TrayMenuHandlers {
  return {
    onOpenWindow: seams.showWindow,
    onOpenSettings: seams.openSettings,
    onOpenDevtools: seams.openDevtools,
    onQuit: seams.quit,
    onStartGateway: seams.lifecycle.start,
    onStopGateway: seams.lifecycle.stop,
    onRestartGateway: seams.lifecycle.restart,
  };
}
