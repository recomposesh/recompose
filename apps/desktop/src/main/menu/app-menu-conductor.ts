import type { IpcEventPayload, Settings } from '@recompose/contracts';

import type { AppMenuHandlers, AppMenuView } from './app-menu-template';

import { amendStoredSettings } from '../storage/settings-amend';
import { onGatewayDetailUrl } from '../windows/renderer-url';
import { installAppMenu } from './app-menu';

export type AppMenuConduct = {
  /** Reinstalls the menu from the current view, which boot calls once the settings are read. */
  repaint: () => void;
  /** Carries a saved settings document into the menu tick and out to every window. */
  reflectSettings: (settings: Settings) => void;
  /** Reads the surface a window navigated to, so the Gateway menu comes and goes with it. */
  standOnUrl: (url: string) => void;
};

type AppMenuSeams = {
  onOpenSettings: () => void;
  onNewGateway: () => void;
  onCanvasCommand: (command: IpcEventPayload<'canvas:command'>) => void;
  settingsFile: () => string;
  onCorrupt: (quarantinedPath: string) => void;
  pushSettings: (settings: Settings) => void;
};

/**
 * Holds the application menu's view of the world and repaints it on every change.
 *
 * @summary The menu is the one surface main owns that reads renderer-shaped state, so this is
 * where the checklist tick and the Gateway menu's presence live. Electron rebuilds a menu rather
 * than mutating one, so every change lands as a fresh install from the same view value.
 */
export function conductAppMenu(seams: AppMenuSeams): AppMenuConduct {
  const view: AppMenuView = { checklistShown: true, onGatewayDetail: false };

  const handlers: AppMenuHandlers = {
    onOpenSettings: seams.onOpenSettings,
    onNewGateway: seams.onNewGateway,
    onCanvasCommand: seams.onCanvasCommand,
    onToggleChecklist: (shown) => {
      amendStoredSettings(seams.settingsFile(), seams.onCorrupt, {
        showOnboardingChecklist: shown,
      })
        .then(reflectSettings)
        .catch((error: unknown) => {
          console.error(
            'recompose could not store the checklist choice, so the menu stands.',
            error,
          );
        });
    },
  };

  function repaint(): void {
    installAppMenu(handlers, view);
  }

  function reflectSettings(settings: Settings): void {
    view.checklistShown = settings.showOnboardingChecklist;
    repaint();
    seams.pushSettings(settings);
  }

  function standOnUrl(url: string): void {
    const onGatewayDetail = onGatewayDetailUrl(url);

    if (view.onGatewayDetail !== onGatewayDetail) {
      view.onGatewayDetail = onGatewayDetail;
      repaint();
    }
  }

  return { repaint, reflectSettings, standOnUrl };
}
