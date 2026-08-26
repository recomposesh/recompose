import type { EngineStates, IpcRequest, Settings } from '@recompose/contracts';

import type { UpdateCheckStanding } from './app-menu-item';
import type { AppMenuHandlers, AppMenuView } from './app-menu-template';

import { amendStoredSettings } from '../storage/settings-amend';
import { gatewayServingIn } from '../tray/gateway-lifecycle-submenu';
import {
  gatewayDetailSlugFrom,
  onGatewayDetailUrl,
  onProvidersUrl,
  onUsageUrl,
  usageSearchWordsFrom,
} from '../windows/renderer-url';
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
  /** Clears the route-scoped view once the last window goes, so no menu pushes into the void. */
  standNowhere: () => void;
  /** Carries the engine snapshot into the lifecycle group's enablement. */
  reflectEngineStates: (states: EngineStates) => void;
  /** Carries the updater's own standing into whether the check item shows and answers. */
  reflectUpdateCheck: (standing: UpdateCheckStanding) => void;
};

type AppMenuSeams = Omit<AppMenuHandlers, 'onToggleChecklist'> & {
  development: boolean;
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
    view.modalStanding !== toggles.modal ||
    view.setupStanding !== toggles.setup;

  view.sidebarShown = toggles.sidebar;
  view.inspectorOpen = toggles.inspector;
  view.modalStanding = toggles.modal;
  view.setupStanding = toggles.setup;

  return changed;
}

function freshAppMenuView(development: boolean): AppMenuView {
  return {
    checklistShown: true,
    setupStanding: false,
    onGatewayDetail: false,
    onProviders: false,
    onUsage: false,
    logsDrawerOpen: false,
    usageTableOpen: false,
    sidebarShown: true,
    inspectorOpen: false,
    modalStanding: false,
    windowStanding: false,
    standingGatewaySlug: null,
    gatewayServing: false,
    usageRange: '24h',
    usageMetric: 'requests',
    usageRetentionDays: 30,
    updateCheck: 'none',
    development,
  };
}

type SurfaceStand = Pick<
  AppMenuView,
  | 'onGatewayDetail'
  | 'onProviders'
  | 'onUsage'
  | 'windowStanding'
  | 'standingGatewaySlug'
  | 'usageRange'
  | 'usageMetric'
  | 'gatewayServing'
>;

function standFromUrl(url: string, serving: (slug: string | null) => boolean): SurfaceStand {
  const slug = gatewayDetailSlugFrom(url);
  const words = usageSearchWordsFrom(url);

  return {
    onGatewayDetail: onGatewayDetailUrl(url),
    onProviders: onProvidersUrl(url),
    onUsage: onUsageUrl(url),
    windowStanding: true,
    standingGatewaySlug: slug,
    usageRange: words.range,
    usageMetric: words.metric,
    gatewayServing: serving(slug),
  };
}

function clearedStand(): SurfaceStand {
  return {
    onGatewayDetail: false,
    onProviders: false,
    onUsage: false,
    windowStanding: false,
    standingGatewaySlug: null,
    usageRange: '24h',
    usageMetric: 'requests',
    gatewayServing: false,
  };
}

const STAND_FIELDS = [
  'onGatewayDetail',
  'onProviders',
  'onUsage',
  'windowStanding',
  'standingGatewaySlug',
  'usageRange',
  'usageMetric',
  'gatewayServing',
] as const;

/** Writes a surface stand into the view, answering whether anything the menu reads moved. */
function standInto(view: AppMenuView, stand: SurfaceStand): boolean {
  const changed = STAND_FIELDS.some((field) => view[field] !== stand[field]);

  Object.assign(view, stand);

  return changed;
}

function simpleReflectors(view: AppMenuView, repaint: () => void) {
  return {
    reflectLogsDrawer: (open: boolean): void => {
      view.logsDrawerOpen = open;
      repaint();
    },
    reflectUsageTable: (open: boolean): void => {
      view.usageTableOpen = open;
      repaint();
    },
    reflectSurfaceToggles: (toggles: IpcRequest<'system:surface-toggles'>): void => {
      if (surfaceTogglesInto(view, toggles)) {
        repaint();
      }
    },
    reflectUpdateCheck: (standing: UpdateCheckStanding): void => {
      if (view.updateCheck !== standing) {
        view.updateCheck = standing;
        repaint();
      }
    },
  };
}

function boundHandlers(
  seams: AppMenuSeams,
  onToggleChecklist: (shown: boolean) => void,
): AppMenuHandlers {
  const {
    development: _run,
    settingsFile: _file,
    onCorrupt: _corrupt,
    pushSettings: _push,
    ...handlers
  } = seams;

  return { ...handlers, onToggleChecklist };
}

/**
 * Holds the application menu's view of the world and repaints it on every change.
 *
 * @summary The menu is the one surface main owns that reads renderer-shaped state, so this is
 * where the checklist tick and the surface menus' presence live. Electron rebuilds a menu rather
 * than mutating one, so every change lands as a fresh install from the same view value.
 */
export function conductAppMenu(seams: AppMenuSeams): AppMenuConduct {
  const view = freshAppMenuView(seams.development);

  let engineStates: EngineStates = {};

  const handlers: AppMenuHandlers = boundHandlers(seams, (shown) => {
    storedChecklistChoice(seams, reflectSettings)(shown);
  });

  function repaint(): void {
    installAppMenu(handlers, view);
  }

  function servingFor(slug: string | null): boolean {
    return slug !== null && gatewayServingIn(engineStates, slug);
  }

  function reflectSettings(settings: Settings): void {
    view.checklistShown = settings.showOnboardingChecklist;
    view.usageRetentionDays = settings.usageRetentionDays;
    repaint();
    seams.pushSettings(settings);
  }

  function standOnUrl(url: string): void {
    if (standInto(view, standFromUrl(url, servingFor))) {
      repaint();
    }
  }

  function standNowhere(): void {
    if (standInto(view, clearedStand())) {
      repaint();
    }
  }

  function reflectEngineStates(states: EngineStates): void {
    engineStates = states;

    const serving = servingFor(view.standingGatewaySlug);

    if (view.gatewayServing !== serving) {
      view.gatewayServing = serving;
      repaint();
    }
  }

  return {
    repaint,
    reflectSettings,
    standOnUrl,
    standNowhere,
    ...simpleReflectors(view, repaint),
    reflectEngineStates,
  };
}
