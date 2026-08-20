import type {
  EngineStates,
  GatewayBranchPins,
  GatewayCooldowns,
  GatewayTraffic,
  IpcEventPayload,
  LogBatch,
  Settings,
  UpdateState,
} from '@recompose/contracts';

import { BrowserWindow } from 'electron';

export function pushEngineStates(states: EngineStates): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send('engine:state', states);
  }
}

export function pushEngineTraffic(traffic: GatewayTraffic): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send('engine:traffic', traffic);
  }
}

export function pushEngineBranchPins(pinning: GatewayBranchPins): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send('engine:pins', pinning);
  }
}

export function pushEngineCooldowns(cooling: GatewayCooldowns): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send('engine:cooldowns', cooling);
  }
}

export function pushEngineLogs(batch: LogBatch): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send('engine:logs', batch);
  }
}

export function pushAccountsChanged(): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send('accounts:changed', 'changed');
  }
}

export function pushCanvasCommand(command: IpcEventPayload<'canvas:command'>): void {
  const standing = BrowserWindow.getFocusedWindow() ?? theOnlyWindow();

  standing?.webContents.send('canvas:command', command);
}

export function pushUsageCommand(command: IpcEventPayload<'usage:command'>): void {
  const standing = BrowserWindow.getFocusedWindow() ?? theOnlyWindow();

  standing?.webContents.send('usage:command', command);
}

export function pushViewCommand(command: IpcEventPayload<'view:command'>): void {
  const standing = BrowserWindow.getFocusedWindow() ?? theOnlyWindow();

  standing?.webContents.send('view:command', command);
}

function theOnlyWindow(): BrowserWindow | undefined {
  const open = BrowserWindow.getAllWindows();

  return open.length === 1 ? open[0] : undefined;
}

export function pushSettingsChanged(settings: Settings): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send('settings:changed', settings);
  }
}

export function pushUpdatesChanged(state: UpdateState): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send('updates:changed', state);
  }
}

export function pushDevtoolsToggle(): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send('devtools:toggle', 'asked');
  }
}

export function pushLaunchRefused(refused: IpcEventPayload<'subscriptions:launch-refused'>): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send('subscriptions:launch-refused', refused);
  }
}
