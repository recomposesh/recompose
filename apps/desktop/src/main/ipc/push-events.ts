import type { EngineStates, IpcEventPayload, Settings } from '@recompose/contracts';

import { BrowserWindow } from 'electron';

export function pushEngineStates(states: EngineStates): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send('engine:state', states);
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
