import type { UpdateState } from '@recompose/contracts';

import type { IpcHandlers } from './dispatch';

import { ipcFailure } from './storage-envelope';

export type UpdatesIpcWiring = {
  state: () => UpdateState;
  restart: () => boolean;
};

export type UpdatesIpcHandlers = Pick<IpcHandlers, 'updates:get' | 'updates:restart'>;

export function createUpdatesIpcHandlers(wired: UpdatesIpcWiring): UpdatesIpcHandlers {
  return {
    'updates:get': async () => Promise.resolve({ ok: true as const, value: wired.state() }),
    'updates:restart': async () => {
      if (!wired.restart()) {
        return Promise.resolve(
          ipcFailure('no-update-waiting', 'no downloaded update stands ready to install'),
        );
      }

      return Promise.resolve({ ok: true as const, value: undefined });
    },
  };
}
