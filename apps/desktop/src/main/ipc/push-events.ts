import type {
  EngineStates,
  GatewayTraffic,
  IpcEventPayload,
  LogBatch,
  Settings,
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
  BrowserWindow.getFocusedWindow()?.webContents.send('canvas:command', command);
}

export function pushSettingsChanged(settings: Settings): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send('settings:changed', settings);
  }
}

export function pushDevtoolsToggle(): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send('devtools:toggle', 'asked');
  }
}
