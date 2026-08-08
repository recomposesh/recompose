import type { EngineStates, IpcEventPayload } from '@recompose/contracts';

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
