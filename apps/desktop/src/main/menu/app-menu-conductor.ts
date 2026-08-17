import type { IpcEventPayload, IpcRequest, Settings } from '@recompose/contracts';

import type { AppMenuHandlers, AppMenuView } from './app-menu-template';

import { amendStoredSettings } from '../storage/settings-amend';
import { onGatewayDetailUrl, onUsageUrl } from '../windows/renderer-url';
import { installAppMenu } from './app-menu';

export type AppMenuConduct = {
  /** Reinstalls the menu from the current view, which boot calls once the settings are read. */
  repaint: () => void;
  /** Carries a saved settings document into the menu tick and out to every window. */
  reflectSettings: (settings: Settings) => void;
  /** Reads the surface a window navigated to, so the surface menus come and go with it. */
  standOnUrl: (url: string) => void;
  /** Carries the renderer's logs drawer standing into the Show Logs tick. */
  reflectLogsDrawer: (open: boolean) => void;
  /** Carries the renderer's data-table twin standing into the Show Data Table tick. */
  reflectUsageTable: (open: boolean) => void;
  /** Carries the renderer's one surface snapshot into the View ticks and the modal disarming. */
  reflectSurfaceToggles: (toggles: IpcRequest<'system:surface-toggles'>) => void;
};

type AppMenuSeams = {
  onOpenSettings: () => void;
  onNewGateway: () => void;
  onCanvasCommand: (command: IpcEventPayload<'canvas:command'>) => void;
  onUsageCommand: (command: IpcEventPayload<'usage:command'>) => void;
  settingsFile: () => string;
  onCorrupt: (quarantinedPath: string) => void;
  pushSettings: (settings: Settings) => void;
};

function storedChecklistChoice(
  seams: AppMenuSeams,
  reflect: (settings: Settings) => void,
): (shown: boolean) => void {
  return (shown) => {
    amendStoredSettings(seams.settingsFile(), seams.onCorrupt, {
      showOnboardingChecklist: shown,
    })
      .then(reflect)
      .catch((error: unknown) => {
        console.error('recompose could not store the checklist choice, so the menu stands.', error);
      });
  };
}

/** Writes the reported toggles into the view, answering whether anything the menu reads moved. */
function surfaceTogglesInto(
  view: AppMenuView,
  toggles: IpcRequest<'system:surface-toggles'>,
): boolean {
  const changed =
    view.sidebarShown !== toggles.sidebar ||
    view.inspectorOpen !== toggles.inspector ||
    view.modalStanding !== toggles.modal;

  view.sidebarShown = toggles.sidebar;
  view.inspectorOpen = toggles.inspector;
  view.modalStanding = toggles.modal;

  return changed;
}

function freshAppMenuView(): AppMenuView {
  return {
    checklistShown: true,
    onGatewayDetail: false,
    logsDrawerOpen: false,
    onUsage: false,
    usageTableOpen: false,
    sidebarShown: true,
    inspectorOpen: false,
    modalStanding: false,
  };
}

/**
 * Holds the application menu's view of the world and repaints it on every change.
 *
 * @summary The menu is the one surface main owns that reads renderer-shaped state, so this is
 * where the checklist tick and the surface menus' presence live. Electron rebuilds a menu rather
 * than mutating one, so every change lands as a fresh install from the same view value.
 */
export function conductAppMenu(seams: AppMenuSeams): AppMenuConduct {
  const view = freshAppMenuView();

  const handlers: AppMenuHandlers = {
    onOpenSettings: seams.onOpenSettings,
    onNewGateway: seams.onNewGateway,
    onCanvasCommand: seams.onCanvasCommand,
    onUsageCommand: seams.onUsageCommand,
    onToggleChecklist: (shown) => {
      storedChecklistChoice(seams, reflectSettings)(shown);
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
    const onUsage = onUsageUrl(url);

    if (view.onGatewayDetail !== onGatewayDetail || view.onUsage !== onUsage) {
      view.onGatewayDetail = onGatewayDetail;
      view.onUsage = onUsage;
      repaint();
    }
  }

  function reflectLogsDrawer(open: boolean): void {
    view.logsDrawerOpen = open;
    repaint();
  }

  function reflectUsageTable(open: boolean): void {
    view.usageTableOpen = open;
    repaint();
  }

  function reflectSurfaceToggles(toggles: IpcRequest<'system:surface-toggles'>): void {
    if (surfaceTogglesInto(view, toggles)) {
      repaint();
    }
  }

  return {
    repaint,
    reflectSettings,
    standOnUrl,
    reflectLogsDrawer,
    reflectUsageTable,
    reflectSurfaceToggles,
  };
}
