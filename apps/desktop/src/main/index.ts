import { electronApp } from '@electron-toolkit/utils';
import { app, safeStorage, shell } from 'electron';
import { join } from 'path';

import type { EngineHost } from './engine-host/engine-host';
import type { SpendGrantContext } from './engine-host/spend-grant';
import type { StorageIpcContext } from './ipc/storage-context';
import type { CredentialCustody } from './subscriptions/credential-custody';

import bundledPrices from '../../resources/model-prices.json?asset';
import { registerAppLifecycle } from './app-lifecycle';
import { applyProcessOverrides } from './boot/process-overrides';
import { surfaceStateRepaints } from './boot/state-repaints';
import { bootFromStoredState, type StoredBoot } from './boot/stored-boot';
import { dockMenuWiring } from './dock/dock-wiring';
import { createGatewayLifecycleRequests } from './engine-host/gateway-lifecycle-requests';
import { storageReachFor } from './engine-host/storage-reach';
import {
  restartServingGateways,
  serveRewrittenGateway,
  startStoredGateway,
  stopRemovedGateway,
} from './engine-host/stored-gateway-serving';
import { pushDevtoolsToggle, pushSettingsChanged, pushUpdatesChanged } from './ipc/push-events';
import { assembleIpcHandlers, registerIpcHandlers } from './ipc/register-ipc';
import { storagePathsFor } from './ipc/storage-context';
import { bootAppMenu } from './menu/app-menu-boot';
import { registerAppScheme, serveRenderer } from './protocol/app-protocol';
import {
  applyBootSettingsOrComplain,
  applyChosenSettingsOrComplain,
} from './settings/apply-settings';
import { createSettingsEffects } from './settings/settings-effects';
import { resolveConfigHome } from './storage/config-home';
import { createSafeStorageCodec } from './storage/safe-storage-codec';
import { subscriptionHomes } from './subscriptions/subscription-homes';
import { subscriptionRelease } from './subscriptions/subscription-release';
import { createLoginItem, loginItemAvailabilityFor } from './system/login-item';
import { hideMenuBarTray, showMenuBarTray } from './tray/menu-bar-tray';
import { trayRepainter } from './tray/tray-repaint';
import { trayMenuWiring } from './tray/tray-wiring';
import { wireDesktopUpdates } from './updates/updater-port';
import { type UpdatesWiring } from './updates/updates-wiring';
import { openUsageIpcDeps } from './usage/usage-wiring';
import {
  createMainWindow,
  HOME_ROUTE,
  openGatewaysSurface,
  openNewGatewaySurface,
  openProvidersSurface,
  openSettingsSurface,
  openUsageSurface,
  showMainWindow,
} from './windows/main-window';
import { registerPermissionHandlers } from './windows/permission-wiring';
import { wireWindowIntoMenu } from './windows/window-menu-wiring';

app.setName('Recompose');
app.setAboutPanelOptions({ applicationName: 'Recompose' });

let booted: StoredBoot | null = null;

let wiredUpdates: UpdatesWiring | null = null;

const gatewayLifecycle = createGatewayLifecycleRequests({
  host: () => booted?.engineHost ?? null,
  userDataPath: recomposeHome,
  onCorrupt: onStorageCorrupt,
});

const trayMenuHandlers = trayMenuWiring({
  showWindow: showMainWindow,
  openSettings: openSettingsSurface,
  openDevtools: () => {
    showMainWindow();
    pushDevtoolsToggle();
  },
  quit: () => {
    app.quit();
  },
  lifecycle: gatewayLifecycle,
});

if (process.platform === 'linux') {
  safeStorage.setUsePlainTextEncryption(true);
}

const loginItemAvailability = loginItemAvailabilityFor(process.platform, app.isPackaged);
const loginItem = createLoginItem(app, loginItemAvailability, process.execPath);

const appMenu = bootAppMenu({
  onOpenSettings: openSettingsSurface,
  onNewGateway: openNewGatewaySurface,
  onOpenGateways: openGatewaysSurface,
  onOpenProviders: openProvidersSurface,
  onOpenUsage: openUsageSurface,
  lifecycle: gatewayLifecycle,
  configFolder: recomposeHome,
  development: !app.isPackaged,
  settingsFile: () => storagePathsFor(recomposeHome()).settingsFile,
  onCorrupt: onStorageCorrupt,
  pushSettings: (settings) => {
    pushSettingsChanged({ ...settings, launchAtLogin: loginItem.isEnabled() });
  },
});

const settingsEffects = createSettingsEffects({
  showTray: () => {
    showMenuBarTray(trayMenuHandlers);
  },
  hideTray: hideMenuBarTray,
  setLoginItem: (enabled) => {
    loginItem.setEnabled(enabled);
  },
});

function onStorageCorrupt(quarantinedPath: string): void {
  console.warn(`storage document quarantined: ${quarantinedPath}`);
}

function recomposeHome(): string {
  return resolveConfigHome(process.env, app.getPath('home'));
}

function storageReach(custody: CredentialCustody | null = null): SpendGrantContext {
  return storageReachFor(
    {
      userDataPath: recomposeHome(),
      homeFolder: app.getPath('home'),
      platform: process.platform,
      getCodec: () => createSafeStorageCodec(),
      onCorrupt: onStorageCorrupt,
    },
    custody,
  );
}

function storageContext(
  engineHost: EngineHost,
  custody: CredentialCustody | null,
): StorageIpcContext {
  const reach = storageReach(custody);

  return {
    ...reach,
    isEncryptionAvailable: () => safeStorage.isEncryptionAvailable(),
    readLoginItem: () => loginItem.isEnabled(),
    applySettings: (settings, askedLoginItem) => {
      applyChosenSettingsOrComplain(settingsEffects, settings, askedLoginItem);
    },
    onSettingsWritten: appMenu.reflectSettings,
    restartServingGateways: () => {
      restartServingGateways(engineHost, reach.userDataPath, onStorageCorrupt);
    },
    startGateway: startStoredGateway(engineHost),
    restartGateway: serveRewrittenGateway(engineHost),
    stopGateway: stopRemovedGateway(engineHost),
    removeGatewayRuntime: async (slug) => {
      try {
        await engineHost.stop(slug);
      } finally {
        engineHost.forget?.(slug);
      }
    },
    forgetGateway: (slug) => {
      engineHost.forget?.(slug);
    },
    noteGatewayWrite: (gateway) => {
      booted?.storageWatchers.noteGatewayWrite(gateway);
    },
    isServing: (slug) => engineHost.states()[slug]?.status === 'running',
    releaseSubscription: subscriptionRelease(
      subscriptionHomes(reach.userDataPath, process.platform),
      custody,
    ),
  };
}

const storedGatewaysDir = (): string => storagePathsFor(recomposeHome()).gatewaysDir;

const repaintTray = trayRepainter(storedGatewaysDir, onStorageCorrupt);

const activationPolicy = applyProcessOverrides(app, process.platform, process.env);

const repaintDock = dockMenuWiring({
  platform: process.platform,
  activationPolicy,
  gatewaysDir: storedGatewaysDir,
  onCorrupt: onStorageCorrupt,
  lifecycle: trayMenuHandlers,
  onNewGateway: openNewGatewaySurface,
  onOpenSettings: openSettingsSurface,
});

registerAppScheme();

/**
 * @summary A quit while the boot is still waiting disposes what the rest of the boot would reach
 * for, so the start stops where it stands. Nothing here is worth doing for an app on its way out,
 * and the profile it opened is already closed.
 */
async function answerEveryChannel(profile: StoredBoot): Promise<void> {
  const usage = await openUsageIpcDeps({
    reach: storageReach,
    store: profile.usageStore,
    retainedRows: profile.engineHost.retainedLogRows,
    bundledPricesFile: bundledPrices,
    noteUsageTable: appMenu.reflectUsageTable,
  });

  registerIpcHandlers(
    assembleIpcHandlers({
      engineHost: profile.engineHost,
      custody: profile.custody,
      usage,
      userDataPath: recomposeHome(),
      homeFolder: app.getPath('home'),
      onCorrupt: onStorageCorrupt,
      storageReach,
      storageContext,
      loginItem,
      loginItemAvailability,
      appMenu,
      openFolder: async (path) => shell.openPath(path),
      platform: process.platform,
      updates: {
        state: () => wiredUpdates?.state() ?? { standing: 'quiet' as const },
        restart: () => wiredUpdates?.restart() ?? false,
      },
    }),
  );
}

async function startRecompose(stillWanted: () => boolean): Promise<void> {
  serveRenderer(join(__dirname, '../renderer'));

  const profile = await bootFromStoredState({
    legacyUserDataPath: app.getPath('userData'),
    platform: process.platform,
    recomposeHome,
    onCorrupt: onStorageCorrupt,
    spendGrantContext: storageReach,
    reflectSettings: appMenu.reflectSettings,
    repaintStates: surfaceStateRepaints({
      repaintTray,
      repaintDock,
      reflectMenu: appMenu.reflectEngineStates,
    }),
    lifecycle: gatewayLifecycle,
  });

  if (!stillWanted()) {
    profile.close();

    return;
  }

  booted = profile;

  await answerEveryChannel(profile);

  if (!stillWanted()) {
    return;
  }

  electronApp.setAppUserModelId('sh.recompose.app');

  app.on('browser-window-created', (_, window) => {
    wireWindowIntoMenu(window, appMenu, app.isPackaged ? 'packaged' : 'development');
  });

  registerPermissionHandlers();

  appMenu.reflectSettings(profile.settings);

  applyBootSettingsOrComplain(settingsEffects, profile.settings);

  profile.serveStoredGateways();

  createMainWindow(HOME_ROUTE);

  wiredUpdates = wireDesktopUpdates(pushUpdatesChanged);
}

registerAppLifecycle({
  start: startRecompose,
  activate: showMainWindow,
  dispose: () => {
    wiredUpdates?.dispose();
    wiredUpdates = null;
    booted?.close();
    booted = null;
  },
});
