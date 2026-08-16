import { is } from '@electron-toolkit/utils';
import { ipcMain, type IpcMainInvokeEvent } from 'electron';

import type { EngineHost } from '../engine-host/engine-host';
import type { SpendGrantContext } from '../engine-host/spend-grant';
import type { AppMenuConduct } from '../menu/app-menu-conductor';
import type { CredentialCustody } from '../subscriptions/credential-custody';
import type { LoginItem, LoginItemAvailability } from '../system/login-item';
import type { AllowedOrigins, TrustedSender } from './sender-trust';
import type { StorageIpcContext } from './storage-context';
import type { UsageIpcDeps } from './usage-ipc';

import { probeFreePort } from '../engine-host/probe-free-port';
import { devServerOrigin } from '../environment/dev-server-origin';
import { subscriptionIpcHandlers } from '../subscriptions/subscriptions-wiring';
import { fileBrowserFor } from '../system/file-browser';
import { isMenuBarTrayVisible } from '../tray/menu-bar-tray';
import { answerTitleBarDoubleClick, placeWindowButtons } from '../windows/window-chrome';
import { dispatchIpc, ipcChannelNames, type IpcHandlers } from './dispatch';
import { createEngineIpcHandlers } from './engine-ipc';
import { createKeyCheckIpcHandlers, keyCheckReach } from './key-check-ipc';
import { createLocalRuntimesIpcHandlers } from './local-runtimes-ipc';
import { createProviderModelsIpcHandlers, providerModelsReach } from './provider-models-ipc';
import { createStorageIpcHandlers } from './storage-ipc';
import { createSystemIpcHandlers } from './system-ipc';
import { createUsageIpcHandlers } from './usage-ipc';

function senderFromEvent(event: IpcMainInvokeEvent): TrustedSender {
  const { senderFrame } = event;

  if (senderFrame === null) {
    return { frameUrl: null, isMainFrame: false };
  }

  return { frameUrl: senderFrame.url, isMainFrame: senderFrame === event.sender.mainFrame };
}

export function registerIpcHandlers(handlers: IpcHandlers): void {
  const allowedOrigins: AllowedOrigins = { devServerOrigin: devServerOrigin(is.dev) };

  for (const channel of ipcChannelNames) {
    ipcMain.handle(channel, async (event, payload: unknown) =>
      dispatchIpc(handlers, channel, payload, senderFromEvent(event), allowedOrigins),
    );
  }
}

/**
 * Everything the handler set is built from, which is the app's own wiring rather than a request's.
 *
 * @summary Every handler group reaches the same few places: where this profile keeps its files,
 * what the engine host answers, and which surfaces the menu reflects. Naming them once here is
 * what lets the assembly say which channels the app answers rather than how it was wired.
 */
export type HandlerWiring = {
  engineHost: EngineHost;
  custody: CredentialCustody | null;
  usage: UsageIpcDeps;
  userDataPath: string;
  homeFolder: string;
  onCorrupt: (quarantinedPath: string) => void;
  storageReach: (custody?: CredentialCustody | null) => SpendGrantContext;
  storageContext: (engineHost: EngineHost, custody: CredentialCustody | null) => StorageIpcContext;
  loginItem: LoginItem;
  loginItemAvailability: LoginItemAvailability;
  appMenu: AppMenuConduct;
  openFolder: (path: string) => Promise<string>;
  platform: NodeJS.Platform;
};

/** Which channels this app answers, and what each group of them reaches. */
export function assembleIpcHandlers(wiring: HandlerWiring): IpcHandlers {
  const { engineHost, custody, userDataPath, homeFolder, onCorrupt, appMenu } = wiring;

  return {
    ...subscriptionIpcHandlers({
      userDataPath,
      homeFolder,
      custody,
      onCorrupt,
      claudeAddress: engineHost.claudeAddress,
    }),
    ...createEngineIpcHandlers({
      host: engineHost,
      userDataPath,
      homeFolder,
      onCorrupt,
      probeFreePort,
    }),
    ...createStorageIpcHandlers(wiring.storageContext(engineHost, custody)),
    ...createKeyCheckIpcHandlers(keyCheckReach(wiring.storageReach(), engineHost)),
    ...createProviderModelsIpcHandlers(
      providerModelsReach(wiring.storageReach(custody), engineHost),
    ),
    ...createLocalRuntimesIpcHandlers({
      userDataPath,
      homeFolder,
      onCorrupt,
      probeRuntime: async (address, provider) => engineHost.probeRuntime(address, provider),
    }),
    ...createSystemIpcHandlers({
      fileBrowser: fileBrowserFor(wiring.platform),
      loginItem: wiring.loginItemAvailability,
      configFolder: userDataPath,
      homeFolder,
      readLoginItem: () => wiring.loginItem.isEnabled(),
      isMenuBarVisible: () => isMenuBarTrayVisible(),
      openFolder: wiring.openFolder,
      placeWindowButtons: (position) => {
        placeWindowButtons(wiring.platform, position);
      },
      answerTitleBarDoubleClick: () => {
        answerTitleBarDoubleClick(wiring.platform);
      },
      noteLogsDrawer: appMenu.reflectLogsDrawer,
    }),
    ...createUsageIpcHandlers(wiring.usage),
  };
}
