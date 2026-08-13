import { electronApp, optimizer } from '@electron-toolkit/utils';
import { app, safeStorage, shell } from 'electron';
import { join } from 'path';

import type { EngineHost } from './engine-host/engine-host';
import type { SpendGrantContext } from './engine-host/spend-grant';
import type { IpcHandlers } from './ipc/dispatch';
import type { StorageIpcContext } from './ipc/storage-context';
import type { CredentialCustody } from './subscriptions/credential-custody';

import bundledPrices from '../../resources/model-prices.json?asset';
import { registerAppLifecycle } from './app-lifecycle';
import { bootFromStoredState, type StoredBoot } from './boot/stored-boot';
import { createGatewayLifecycleRequests } from './engine-host/gateway-lifecycle-requests';
import { probeFreePort } from './engine-host/probe-free-port';
import {
  restartServingGateways,
  serveRewrittenGateway,
  startStoredGateway,
  stopRemovedGateway,
} from './engine-host/stored-gateway-serving';
import { createEngineIpcHandlers } from './ipc/engine-ipc';
import { createKeyCheckIpcHandlers, keyCheckReach } from './ipc/key-check-ipc';
import { createLocalRuntimesIpcHandlers } from './ipc/local-runtimes-ipc';
import { createProviderModelsIpcHandlers, providerModelsReach } from './ipc/provider-models-ipc';
import { pushDevtoolsToggle, pushSettingsChanged } from './ipc/push-events';
import { registerIpcHandlers } from './ipc/register-ipc';
import { storagePathsFor } from './ipc/storage-context';
import { createStorageIpcHandlers } from './ipc/storage-ipc';
import { createSystemIpcHandlers } from './ipc/system-ipc';
import { createUsageIpcHandlers, type UsageIpcDeps } from './ipc/usage-ipc';
import { bootAppMenu } from './menu/app-menu-boot';
import { resolvePasswordStoreOverride } from './password-store-override';
import { registerAppScheme, serveRenderer } from './protocol/app-protocol';
import {
  applyBootSettingsOrComplain,
  applyChosenSettingsOrComplain,
} from './settings/apply-settings';
import { createSettingsEffects } from './settings/settings-effects';
import { resolveConfigHome } from './storage/config-home';
import { createSafeStorageCodec } from './storage/safe-storage-codec';
import { subscriptionCredentialStore } from './subscriptions/subscription-credential-store';
import { subscriptionHomes } from './subscriptions/subscription-homes';
import { subscriptionRelease } from './subscriptions/subscription-release';
import {
  adoptedCredentialFor,
  subscriptionIpcHandlers,
} from './subscriptions/subscriptions-wiring';
import { fileBrowserFor } from './system/file-browser';
import { createLoginItem, loginItemAvailabilityFor } from './system/login-item';
import { hideMenuBarTray, isMenuBarTrayVisible, showMenuBarTray } from './tray/menu-bar-tray';
import { trayRepainter } from './tray/tray-repaint';
import { trayMenuWiring } from './tray/tray-wiring';
import { openUsageIpcDeps } from './usage/usage-wiring';
import { resolveUserDataOverride } from './user-data-override';
import {
  createMainWindow,
  HOME_ROUTE,
  openNewGatewaySurface,
  openSettingsSurface,
  showMainWindow,
} from './windows/main-window';
import { registerPermissionHandlers } from './windows/permission-wiring';
import { answerTitleBarDoubleClick, placeWindowButtons } from './windows/window-chrome';

app.setName('Recompose');
app.setAboutPanelOptions({ applicationName: 'Recompose' });

let booted: StoredBoot | null = null;

const gatewayLifecycle = createGatewayLifecycleRequests({
  host: () => booted?.engineHost ?? null,
  userDataPath: () => recomposeHome(),
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
  const userDataPath = recomposeHome();

  return {
    userDataPath,
    homeFolder: app.getPath('home'),
    getCodec: () => createSafeStorageCodec(),
    onCorrupt: onStorageCorrupt,
    readSubscriptionCredential: subscriptionCredentialStore(userDataPath, process.platform, custody)
      .read,
    readAdoptedCredential: adoptedCredentialFor(userDataPath, app.getPath('home'), custody),
  };
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

function assembleIpcHandlers(
  engineHost: EngineHost,
  custody: CredentialCustody | null,
  usage: UsageIpcDeps,
): IpcHandlers {
  const userDataPath = recomposeHome();
  const homeFolder = app.getPath('home');

  return {
    ...subscriptionIpcHandlers({ userDataPath, homeFolder, custody, onCorrupt: onStorageCorrupt }),
    ...createEngineIpcHandlers({
      host: engineHost,
      userDataPath,
      homeFolder,
      onCorrupt: onStorageCorrupt,
      probeFreePort,
    }),
    ...createStorageIpcHandlers(storageContext(engineHost, custody)),
    ...createKeyCheckIpcHandlers(keyCheckReach(storageReach(), engineHost)),
    ...createProviderModelsIpcHandlers(providerModelsReach(storageReach(custody), engineHost)),
    ...createLocalRuntimesIpcHandlers({
      userDataPath,
      homeFolder,
      onCorrupt: onStorageCorrupt,
      probeRuntime: async (address) => engineHost.probeRuntime(address),
    }),
    ...createSystemIpcHandlers({
      fileBrowser: fileBrowserFor(process.platform),
      loginItem: loginItemAvailability,
      configFolder: userDataPath,
      homeFolder,
      readLoginItem: () => loginItem.isEnabled(),
      isMenuBarVisible: () => isMenuBarTrayVisible(),
      openFolder: async (path) => shell.openPath(path),
      placeWindowButtons: (position) => {
        placeWindowButtons(process.platform, position);
      },
      answerTitleBarDoubleClick: () => {
        answerTitleBarDoubleClick(process.platform);
      },
      noteLogsDrawer: appMenu.reflectLogsDrawer,
    }),
    ...createUsageIpcHandlers(usage),
  };
}

const repaintTray = trayRepainter(
  () => storagePathsFor(recomposeHome()).gatewaysDir,
  onStorageCorrupt,
);

const userDataOverride = resolveUserDataOverride(process.env);

if (userDataOverride !== null) {
  app.setPath('userData', userDataOverride);
}

const passwordStoreOverride = resolvePasswordStoreOverride(process.env);

if (passwordStoreOverride !== null) {
  app.commandLine.appendSwitch('password-store', passwordStoreOverride);
}

registerAppScheme();

async function startRecompose(): Promise<void> {
  serveRenderer(join(__dirname, '../renderer'));

  booted = await bootFromStoredState({
    legacyUserDataPath: app.getPath('userData'),
    platform: process.platform,
    recomposeHome,
    onCorrupt: onStorageCorrupt,
    spendGrantContext: storageReach,
    reflectSettings: appMenu.reflectSettings,
    repaintStates: repaintTray,
    lifecycle: gatewayLifecycle,
  });

  registerIpcHandlers(
    assembleIpcHandlers(
      booted.engineHost,
      booted.custody,
      await openUsageIpcDeps({
        reach: storageReach,
        store: booted.usageStore,
        retainedRows: booted.engineHost.retainedLogRows,
        bundledPricesFile: bundledPrices,
        noteUsageTable: appMenu.reflectUsageTable,
      }),
    ),
  );

  electronApp.setAppUserModelId('sh.recompose.app');

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window, { zoom: true });
    window.webContents.on('did-navigate-in-page', (_navigation, url) => {
      appMenu.standOnUrl(url);
    });
  });

  registerPermissionHandlers();

  appMenu.reflectSettings(booted.settings);

  applyBootSettingsOrComplain(settingsEffects, booted.settings);

  booted.serveStoredGateways();

  createMainWindow(HOME_ROUTE);
}

registerAppLifecycle({
  start: startRecompose,
  activate: showMainWindow,
  dispose: () => {
    booted?.close();
    booted = null;
  },
});
